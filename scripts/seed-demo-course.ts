import { getDb, DEFAULT_USER_ID } from '../src/lib/db';
import { generateCurriculumOutline, generateLessonContent } from '../src/lib/ai/course-generator';
import { calculateMasteryUpdate, calculateOverallState } from '../src/lib/spaced-repetition';
import crypto from 'node:crypto';

async function seed() {
  console.log('Seeding demo course for VERBA preview...');
  const db = getDb();
  const now = new Date().toISOString();

  // Check if course already exists
  const existing = db.prepare('SELECT id FROM courses WHERE user_id = ?').get(DEFAULT_USER_ID);
  if (existing) {
    console.log('Demo course already exists.');
    return;
  }

  const courseId = `crs_pm_b2_${Date.now()}`;
  const outlineLessons = await generateCurriculumOutline('en', 'B2', 'Project Management');

  db.exec('BEGIN TRANSACTION;');
  try {
    // 1. Insert course
    db.prepare(`
      INSERT INTO courses (id, user_id, target_language, native_language, cefr_level, domain_area, status, total_lessons, completed_lessons_count, created_at, updated_at)
      VALUES (?, ?, 'en', 'cs', 'B2', 'Project Management', 'ready', 50, 10, ?, ?)
    `).run(courseId, DEFAULT_USER_ID, now, now);

    // 2. Insert approved outline
    db.prepare(`
      INSERT INTO curriculum_outlines (id, course_id, outline_json, is_approved, approved_at, created_at)
      VALUES (?, ?, ?, 1, ?, ?)
    `).run(`out_${crypto.randomUUID()}`, courseId, JSON.stringify(outlineLessons), now, now);

    // 3. Generate first 10 lessons
    for (let i = 1; i <= 10; i++) {
      const outlineItem = outlineLessons[i - 1];
      const lessonData = await generateLessonContent(i, outlineItem, 'en', 'B2', 'Project Management');
      const lessonId = `lsn_${courseId}_${i}`;

      db.prepare(`
        INSERT INTO lessons (id, course_id, lesson_number, title, theme_focus, article_title, article_body, listening_script, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)
      `).run(lessonId, courseId, i, lessonData.lesson.title, lessonData.lesson.theme_focus, lessonData.lesson.article_title, lessonData.lesson.article_body, lessonData.lesson.listening_script, now);

      // Insert learning items & user states
      for (const item of lessonData.items) {
        const itemId = `itm_${crypto.randomUUID()}`;
        db.prepare(`
          INSERT INTO learning_items (id, lesson_id, course_id, item_type, target_text, czech_text, context_note, example_sentence_target, example_sentence_czech, phonetic_hint, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(itemId, lessonId, courseId, item.item_type, item.target_text, item.czech_text, item.context_note, item.example_sentence_target, item.example_sentence_czech, item.phonetic_hint || null, now);

        // Pre-populate some states to demonstrate the dashboard
        const czState = i <= 3 ? (Math.random() > 0.4 ? 'learning' : 'review') : 'new';
        const targetState = i <= 3 ? (Math.random() > 0.3 ? 'mastered' : 'review') : 'new';
        const overallState = calculateOverallState(czState as any, targetState as any);

        db.prepare(`
          INSERT INTO user_item_states (id, user_id, learning_item_id, course_id, cz_to_target_state, cz_to_target_streak, target_to_cz_state, target_to_cz_streak, overall_state, updated_at)
          VALUES (?, ?, ?, ?, ?, 1, ?, 3, ?, ?)
        `).run(`uis_${crypto.randomUUID()}`, DEFAULT_USER_ID, itemId, courseId, czState, targetState, overallState, now);
      }

      // Insert exercises
      for (const ex of lessonData.exercises) {
        db.prepare(`
          INSERT INTO lesson_exercises (id, lesson_id, exercise_type, prompt, target_language_context, options_json, canonical_answer, acceptable_synonyms_json, explanation)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(`ex_${crypto.randomUUID()}`, lessonId, ex.exercise_type, ex.prompt, ex.target_language_context || null, ex.options ? JSON.stringify(ex.options) : null, ex.canonical_answer, ex.acceptable_synonyms ? JSON.stringify(ex.acceptable_synonyms) : null, ex.explanation);
      }

      // Insert transfer article
      db.prepare(`
        INSERT INTO transfer_articles (id, lesson_id, title, body_text, questions_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(`ta_${crypto.randomUUID()}`, lessonId, lessonData.transferArticle.title, lessonData.transferArticle.body_text, JSON.stringify(lessonData.transferArticle.questions), now);
    }

    // Insert sample attempt logs
    const itemsSample = db.prepare('SELECT id, target_text FROM learning_items WHERE course_id = ? LIMIT 12').all(courseId) as any[];
    for (const itm of itemsSample) {
      db.prepare(`
        INSERT INTO attempt_logs (id, user_id, course_id, learning_item_id, direction, exercise_type, user_answer, is_correct, score, evaluation_mode, created_at)
        VALUES (?, ?, ?, ?, 'cz_to_target', 'type_target', ?, 1, 1.0, 'deterministic_exact', ?)
      `).run(`att_${crypto.randomUUID()}`, DEFAULT_USER_ID, courseId, itm.id, itm.target_text, now);
    }

    db.exec('COMMIT;');
    console.log('✓ Demo course seeded successfully with 10 completed lessons, items, states, and exercises!');
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('Error seeding demo course:', err);
  }
}

seed();
