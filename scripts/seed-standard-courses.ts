import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { 
  generateCurriculumOutline, 
  generateLessonContent 
} from '../src/lib/ai/course-generator';

const DB_PATH = path.join(process.cwd(), 'data', 'verba.db');
const db = new DatabaseSync(DB_PATH);

const coursesToSeed = [
  { domain: 'Project Management', lang: 'en', level: 'B2' },
  { domain: 'Product Management', lang: 'en', level: 'B2' },
  { domain: 'Software Engineering', lang: 'en', level: 'B2' },
];

async function seed() {
  console.log('Starting seed process for standard curricula...');

  for (const item of coursesToSeed) {
    const existing = db.prepare('SELECT id FROM courses WHERE domain_area = ?').get(item.domain) as any;
    if (existing) {
      const count = db.prepare('SELECT COUNT(*) as c FROM lessons WHERE course_id = ?').get(existing.id) as any;
      if (count && count.c >= 50) {
        console.log(`Course "${item.domain}" already has ${count.c} lessons. Skipping.`);
        continue;
      }
    }

    const courseId = existing ? existing.id : `crs_${item.domain.toLowerCase().replace(/\s+/g, '_')}_b2`;
    const now = new Date().toISOString();

    console.log(`Generating 50-lesson outline for "${item.domain}"...`);
    const outline = await generateCurriculumOutline(item.lang, item.level, item.domain);

    if (!existing) {
      db.prepare(`
        INSERT OR REPLACE INTO courses (id, user_id, target_language, native_language, cefr_level, domain_area, status, total_lessons, completed_lessons_count, created_at, updated_at)
        VALUES (?, 'usr_jana_default', ?, 'cs', ?, ?, 'ready', 50, 50, ?, ?)
      `).run(courseId, item.lang, item.level, item.domain, now, now);

      db.prepare(`
        INSERT OR REPLACE INTO curriculum_outlines (id, course_id, outline_json, is_approved, approved_at, created_at)
        VALUES (?, ?, ?, 1, ?, ?)
      `).run(`out_${courseId}`, courseId, JSON.stringify(outline), now, now);
    }

    console.log(`Generating 50 lessons content for "${item.domain}"...`);
    for (let i = 1; i <= 50; i++) {
      const lessonOutline = outline.find((o) => o.lesson_number === i) || outline[i - 1];
      const lessonData = await generateLessonContent(i, lessonOutline, item.lang, item.level, item.domain);

      const lessonId = `les_${courseId}_${i}`;

      db.prepare(`
        INSERT OR REPLACE INTO lessons (id, course_id, lesson_number, title, theme_focus, article_title, article_body, listening_script, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)
      `).run(
        lessonId,
        courseId,
        i,
        lessonData.lesson.title,
        lessonData.lesson.theme_focus,
        lessonData.lesson.article_title,
        lessonData.lesson.article_body,
        lessonData.lesson.listening_script,
        now
      );

      // Insert learning items & user item states
      for (let j = 0; j < lessonData.items.length; j++) {
        const itemData = lessonData.items[j];
        const itemId = `itm_${lessonId}_${j + 1}`;

        db.prepare(`
          INSERT OR REPLACE INTO learning_items (id, lesson_id, course_id, item_type, target_text, czech_text, context_note, example_sentence_target, example_sentence_czech, phonetic_hint, audio_url, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          itemId,
          lessonId,
          courseId,
          itemData.item_type,
          itemData.target_text,
          itemData.czech_text,
          itemData.context_note,
          itemData.example_sentence_target,
          itemData.example_sentence_czech,
          itemData.phonetic_hint || null,
          itemData.audio_url || null,
          now
        );

        db.prepare(`
          INSERT OR REPLACE INTO user_item_states (id, user_id, learning_item_id, course_id, cz_to_target_state, cz_to_target_streak, target_to_cz_state, target_to_cz_streak, overall_state, updated_at)
          VALUES (?, 'usr_jana_default', ?, ?, 'new', 0, 'new', 0, 'new', ?)
        `).run(`uis_${itemId}`, itemId, courseId, now);
      }

      // Insert exercises
      for (let k = 0; k < lessonData.exercises.length; k++) {
        const ex = lessonData.exercises[k] as any;
        db.prepare(`
          INSERT OR REPLACE INTO lesson_exercises (id, lesson_id, exercise_type, prompt, target_language_context, options_json, canonical_answer, acceptable_synonyms_json, explanation)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          `ex_${lessonId}_${k + 1}`,
          lessonId,
          ex.exercise_type,
          ex.prompt,
          ex.target_language_context || null,
          ex.options ? JSON.stringify(ex.options) : (ex.options_json || null),
          ex.canonical_answer,
          ex.acceptable_synonyms ? JSON.stringify(ex.acceptable_synonyms) : (ex.acceptable_synonyms_json || null),
          ex.explanation
        );
      }

      // Insert transfer article
      if (lessonData.transferArticle) {
        const ta = lessonData.transferArticle as any;
        db.prepare(`
          INSERT OR REPLACE INTO transfer_articles (id, lesson_id, title, body_text, questions_json, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          `art_${lessonId}`,
          lessonId,
          ta.title,
          ta.body_text,
          JSON.stringify(ta.questions || ta.questions_json || []),
          now
        );
      }
    }

    db.prepare("UPDATE courses SET completed_lessons_count = 50, status = 'ready' WHERE id = ?").run(courseId);
    console.log(`Course "${item.domain}" fully seeded (50/50).`);
  }

  // Export full snapshot to data/seed-courses.json
  console.log('Creating full seed-courses.json export...');
  const allCourses = db.prepare('SELECT * FROM courses').all();
  const allOutlines = db.prepare('SELECT * FROM curriculum_outlines').all();
  const allLessons = db.prepare('SELECT * FROM lessons').all();
  const allItems = db.prepare('SELECT * FROM learning_items').all();
  const allStates = db.prepare('SELECT * FROM user_item_states').all();
  const allExercises = db.prepare('SELECT * FROM lesson_exercises').all();
  const allArticles = db.prepare('SELECT * FROM transfer_articles').all();

  const snapshot = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    courses: allCourses,
    outlines: allOutlines,
    lessons: allLessons,
    items: allItems,
    states: allStates,
    exercises: allExercises,
    articles: allArticles
  };

  fs.writeFileSync(path.join(process.cwd(), 'data', 'seed-courses.json'), JSON.stringify(snapshot, null, 2), 'utf8');
  console.log(`Exported ${allCourses.length} courses with ${allLessons.length} lessons and ${allItems.length} items to data/seed-courses.json!`);
}

seed().catch(console.error);
