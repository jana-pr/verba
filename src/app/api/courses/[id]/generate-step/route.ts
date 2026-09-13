import { NextRequest, NextResponse } from 'next/server';
import { getDb, DEFAULT_USER_ID } from '@/lib/db';
import { generateLessonContent } from '@/lib/ai/course-generator';
import crypto from 'node:crypto';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const db = getDb();
    const now = new Date().toISOString();

    // 1. Verify course and outline approval
    const courseStmt = db.prepare(`SELECT * FROM courses WHERE id = ? AND user_id = ?`);
    const course = courseStmt.get(id, DEFAULT_USER_ID) as any;

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const outlineStmt = db.prepare(`SELECT * FROM curriculum_outlines WHERE course_id = ?`);
    const outlineRow = outlineStmt.get(id) as any;

    if (!outlineRow || !outlineRow.is_approved) {
      return NextResponse.json(
        { error: 'Curriculum outline must be approved before generating lessons.' },
        { status: 403 }
      );
    }

    const outlineList = JSON.parse(outlineRow.outline_json);

    // 2. Find next pending lesson
    const nextLessonStmt = db.prepare(`
      SELECT COALESCE(MAX(lesson_number), 0) + 1 AS next_lesson 
      FROM lessons 
      WHERE course_id = ? AND status = 'completed'
    `);
    const { next_lesson } = nextLessonStmt.get(id) as { next_lesson: number };

    if (next_lesson > 50) {
      // Course is completely generated
      db.prepare(`UPDATE courses SET status = 'ready', completed_lessons_count = 50, updated_at = ? WHERE id = ?`)
        .run(now, id);

      return NextResponse.json({
        completed: true,
        current: 50,
        total: 50,
        status: 'ready',
        message: 'All 50 lessons have been successfully generated.',
      });
    }

    // 3. Get outline spec for this lesson
    const lessonOutline = outlineList.find((l: any) => l.lesson_number === next_lesson) || {
      lesson_number: next_lesson,
      title: `Lesson ${next_lesson}: Practical Application`,
      theme_focus: `Professional competencies in ${course.domain_area}`,
      learning_goal: `Master relevant vocabulary and phrases for lesson ${next_lesson}`,
    };

    // 4. Generate lesson content
    const generatedData = await generateLessonContent(
      next_lesson,
      lessonOutline,
      course.target_language,
      course.cefr_level,
      course.domain_area
    );

    const lessonId = `lsn_${crypto.randomUUID()}`;

    // 5. Transactionally save lesson and all associated items
    db.exec('BEGIN TRANSACTION;');
    try {
      // A. Insert Lesson
      const insertLesson = db.prepare(`
        INSERT INTO lessons (
          id, course_id, lesson_number, title, theme_focus, 
          article_title, article_body, listening_script, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)
      `);
      insertLesson.run(
        lessonId,
        id,
        next_lesson,
        generatedData.lesson.title,
        generatedData.lesson.theme_focus,
        generatedData.lesson.article_title,
        generatedData.lesson.article_body,
        generatedData.lesson.listening_script,
        now
      );

      // B. Insert Learning Items & Initialize Bidirectional UserItemState
      const insertItem = db.prepare(`
        INSERT INTO learning_items (
          id, lesson_id, course_id, item_type, target_text, czech_text, 
          context_note, example_sentence_target, example_sentence_czech, 
          phonetic_hint, audio_url, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertState = db.prepare(`
        INSERT INTO user_item_states (
          id, user_id, learning_item_id, course_id, cz_to_target_state, 
          cz_to_target_streak, target_to_cz_state, target_to_cz_streak, 
          overall_state, updated_at
        ) VALUES (?, ?, ?, ?, 'new', 0, 'new', 0, 'new', ?)
      `);

      for (const item of generatedData.items) {
        const itemId = `itm_${crypto.randomUUID()}`;
        insertItem.run(
          itemId,
          lessonId,
          id,
          item.item_type,
          item.target_text,
          item.czech_text,
          item.context_note,
          item.example_sentence_target,
          item.example_sentence_czech,
          item.phonetic_hint || null,
          null,
          now
        );

        insertState.run(
          `uis_${crypto.randomUUID()}`,
          DEFAULT_USER_ID,
          itemId,
          id,
          now
        );
      }

      // C. Insert Lesson Exercises
      const insertExercise = db.prepare(`
        INSERT INTO lesson_exercises (
          id, lesson_id, exercise_type, prompt, target_language_context, 
          options_json, canonical_answer, acceptable_synonyms_json, explanation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const ex of generatedData.exercises) {
        insertExercise.run(
          `ex_${crypto.randomUUID()}`,
          lessonId,
          ex.exercise_type,
          ex.prompt,
          ex.target_language_context || null,
          ex.options ? JSON.stringify(ex.options) : null,
          ex.canonical_answer,
          ex.acceptable_synonyms ? JSON.stringify(ex.acceptable_synonyms) : null,
          ex.explanation
        );
      }

      // D. Insert Transfer Article (for Article & Comprehension practice)
      const insertTransferArticle = db.prepare(`
        INSERT INTO transfer_articles (
          id, lesson_id, title, body_text, questions_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertTransferArticle.run(
        `ta_${crypto.randomUUID()}`,
        lessonId,
        generatedData.transferArticle.title,
        generatedData.transferArticle.body_text,
        JSON.stringify(generatedData.transferArticle.questions),
        now
      );

      // E. Update course completed count
      const isComplete = next_lesson >= 50;
      const updateCourse = db.prepare(`
        UPDATE courses 
        SET completed_lessons_count = ?, 
            status = ?, 
            updated_at = ?
        WHERE id = ?
      `);
      updateCourse.run(next_lesson, isComplete ? 'ready' : 'generating', now, id);

      db.exec('COMMIT;');

      return NextResponse.json({
        completed: isComplete,
        current: next_lesson,
        total: 50,
        status: isComplete ? 'ready' : 'generating',
        lessonTitle: generatedData.lesson.title,
      });
    } catch (txError) {
      db.exec('ROLLBACK;');
      throw txError;
    }
  } catch (error) {
    console.error('Error generating lesson step:', error);
    return NextResponse.json({ error: 'Failed to generate lesson step' }, { status: 500 });
  }
}
