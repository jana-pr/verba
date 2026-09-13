import { NextRequest, NextResponse } from 'next/server';
import { getDb, DEFAULT_USER_ID, ensureSeedCourses } from '@/lib/db';
import fs from 'node:fs';
import path from 'node:path';

const STATE_RANKS: Record<string, number> = {
  new: 1,
  learning: 2,
  review: 3,
  mastered: 4,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientCourses = [], clientStates = [], clientLogs = [], clientDeletedIds = [] } = body;

    const db = getDb();
    ensureSeedCourses(db);

    // Record any client-deleted IDs into deleted_courses
    for (const did of clientDeletedIds) {
      if (typeof did === 'string' && did) {
        db.prepare('INSERT OR IGNORE INTO deleted_courses (course_id, deleted_at) VALUES (?, ?)').run(did, new Date().toISOString());
      }
    }

    const deletedRows = db.prepare('SELECT course_id FROM deleted_courses').all() as { course_id: string }[];
    const deletedIds = new Set(deletedRows.map(r => r.course_id));

    db.exec('PRAGMA foreign_keys = ON;');
    db.exec('BEGIN TRANSACTION;');

    let restoredCoursesCount = 0;
    let mergedStatesCount = 0;

    try {
      // 1. Restore any courses that the client has but the server is missing (e.g. after fresh redeploy)
      for (const c of clientCourses) {
        if (!c.id || deletedIds.has(c.id)) continue; // Never restore an explicitly deleted course!
        const exists = db.prepare('SELECT id FROM courses WHERE id = ?').get(c.id);

        if (!exists) {
          // Insert course
          db.prepare(`
            INSERT OR REPLACE INTO courses (
              id, user_id, target_language, native_language, cefr_level,
              domain_area, status, total_lessons, completed_lessons_count,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            c.id,
            DEFAULT_USER_ID,
            c.target_language || 'en',
            c.native_language || 'cs',
            c.cefr_level || 'B2',
            c.domain_area || 'Odborný kurz',
            c.status || 'ready',
            c.total_lessons || 50,
            c.completed_lessons_count || 50,
            c.created_at || new Date().toISOString(),
            c.updated_at || new Date().toISOString()
          );

          // Restore outline if present
          if (c.outline_json) {
            db.prepare(`
              INSERT OR REPLACE INTO curriculum_outlines (
                id, course_id, outline_json, is_approved, approved_at, created_at
              ) VALUES (?, ?, ?, 1, ?, ?)
            `).run(
              `out_${c.id}`,
              c.id,
              typeof c.outline_json === 'string' ? c.outline_json : JSON.stringify(c.outline_json),
              new Date().toISOString(),
              new Date().toISOString()
            );
          }

          // Restore lessons if present in client course payload
          if (Array.isArray(c.lessons)) {
            const insertLesson = db.prepare(`
              INSERT OR REPLACE INTO lessons (
                id, course_id, lesson_number, title, theme_focus,
                article_title, article_body, listening_script, status, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            for (const l of c.lessons) {
              insertLesson.run(
                l.id || `les_${c.id}_${l.lesson_number}`,
                c.id,
                l.lesson_number,
                l.title || `Lekce ${l.lesson_number}`,
                l.theme_focus || '',
                l.article_title || l.title || '',
                l.article_body || '',
                l.listening_script || '',
                l.status || 'completed',
                l.created_at || new Date().toISOString()
              );
            }
          }

          // Restore items if present
          if (Array.isArray(c.items)) {
            const insertItem = db.prepare(`
              INSERT OR REPLACE INTO learning_items (
                id, lesson_id, course_id, item_type, target_text, czech_text,
                context_note, example_sentence_target, example_sentence_czech,
                phonetic_hint, audio_url, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            for (const it of c.items) {
              insertItem.run(
                it.id,
                it.lesson_id,
                c.id,
                it.item_type || 'expression',
                it.target_text,
                it.czech_text,
                it.context_note || '',
                it.example_sentence_target || '',
                it.example_sentence_czech || '',
                it.phonetic_hint || null,
                it.audio_url || null,
                it.created_at || new Date().toISOString()
              );
            }
          }

          // Restore exercises if present
          if (Array.isArray(c.exercises)) {
            const insertEx = db.prepare(`
              INSERT OR REPLACE INTO lesson_exercises (
                id, lesson_id, exercise_type, prompt, target_language_context,
                options_json, canonical_answer, acceptable_synonyms_json, explanation
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            for (const ex of c.exercises) {
              insertEx.run(
                ex.id,
                ex.lesson_id,
                ex.exercise_type || 'choice',
                ex.prompt || '',
                ex.target_language_context || null,
                typeof ex.options_json === 'string' ? ex.options_json : JSON.stringify(ex.options || []),
                ex.canonical_answer || '',
                typeof ex.acceptable_synonyms_json === 'string' ? ex.acceptable_synonyms_json : JSON.stringify(ex.acceptable_synonyms || []),
                ex.explanation || ''
              );
            }
          }

          restoredCoursesCount++;
        }
      }

      // 2. Merge user item progress states (NEVER downgrade progress!)
      for (const s of clientStates) {
        if (!s.learning_item_id) continue;

        const existing = db.prepare(`
          SELECT * FROM user_item_states 
          WHERE user_id = ? AND learning_item_id = ?
        `).get(DEFAULT_USER_ID, s.learning_item_id) as any;

        if (!existing) {
          // If state doesn't exist on server, insert client state
          db.prepare(`
            INSERT INTO user_item_states (
              id, user_id, learning_item_id, course_id,
              cz_to_target_state, cz_to_target_streak,
              cz_to_target_last_reviewed, cz_to_target_next_review,
              target_to_cz_state, target_to_cz_streak,
              target_to_cz_last_reviewed, target_to_cz_next_review,
              overall_state, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            s.id || `st_${DEFAULT_USER_ID}_${s.learning_item_id}`,
            DEFAULT_USER_ID,
            s.learning_item_id,
            s.course_id,
            s.cz_to_target_state || 'new',
            s.cz_to_target_streak || 0,
            s.cz_to_target_last_reviewed || null,
            s.cz_to_target_next_review || null,
            s.target_to_cz_state || 'new',
            s.target_to_cz_streak || 0,
            s.target_to_cz_last_reviewed || null,
            s.target_to_cz_next_review || null,
            s.overall_state || 'new',
            s.updated_at || new Date().toISOString()
          );
          mergedStatesCount++;
        } else {
          // Compare progress: never downgrade!
          const clientRank = STATE_RANKS[s.overall_state] || 1;
          const serverRank = STATE_RANKS[existing.overall_state] || 1;

          const clientStreak = (s.cz_to_target_streak || 0) + (s.target_to_cz_streak || 0);
          const serverStreak = (existing.cz_to_target_streak || 0) + (existing.target_to_cz_streak || 0);

          // Update server only if client has advanced further
          if (clientRank > serverRank || (clientRank === serverRank && clientStreak > serverStreak)) {
            db.prepare(`
              UPDATE user_item_states SET
                cz_to_target_state = ?,
                cz_to_target_streak = ?,
                cz_to_target_last_reviewed = COALESCE(?, cz_to_target_last_reviewed),
                cz_to_target_next_review = COALESCE(?, cz_to_target_next_review),
                target_to_cz_state = ?,
                target_to_cz_streak = ?,
                target_to_cz_last_reviewed = COALESCE(?, target_to_cz_last_reviewed),
                target_to_cz_next_review = COALESCE(?, target_to_cz_next_review),
                overall_state = ?,
                updated_at = ?
              WHERE user_id = ? AND learning_item_id = ?
            `).run(
              s.cz_to_target_state,
              s.cz_to_target_streak,
              s.cz_to_target_last_reviewed || null,
              s.cz_to_target_next_review || null,
              s.target_to_cz_state,
              s.target_to_cz_streak,
              s.target_to_cz_last_reviewed || null,
              s.target_to_cz_next_review || null,
              s.overall_state,
              s.updated_at || new Date().toISOString(),
              DEFAULT_USER_ID,
              s.learning_item_id
            );
            mergedStatesCount++;
          }
        }
      }

      // 3. Restore any attempt logs with INSERT OR IGNORE
      const insertLog = db.prepare(`
        INSERT OR IGNORE INTO attempt_logs (
          id, user_id, course_id, learning_item_id, direction,
          exercise_type, user_answer, is_correct, score,
          evaluation_mode, ai_feedback, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const log of clientLogs) {
        if (!log.id) continue;
        insertLog.run(
          log.id,
          DEFAULT_USER_ID,
          log.course_id,
          log.learning_item_id || null,
          log.direction || 'cz_to_target',
          log.exercise_type || 'practice',
          log.user_answer || '',
          log.is_correct ? 1 : 0,
          log.score || 1,
          log.evaluation_mode || 'deterministic_exact',
          log.ai_feedback || null,
          log.created_at || new Date().toISOString()
        );
      }

      db.exec('COMMIT;');

      // Sync updated data to seed-courses.json
      try {
        const seedPath = path.join(process.cwd(), 'data', 'seed-courses.json');
        const allCourses = db.prepare('SELECT * FROM courses').all();
        const allOutlines = db.prepare('SELECT * FROM curriculum_outlines').all();
        const allLessons = db.prepare('SELECT * FROM lessons').all();
        const allItems = db.prepare('SELECT * FROM learning_items').all();
        const allStates = db.prepare('SELECT * FROM user_item_states').all();
        const allExercises = db.prepare('SELECT * FROM lesson_exercises').all();
        const allArticles = db.prepare('SELECT * FROM transfer_articles').all();

        const backup = {
          version: '1.2',
          exportedAt: new Date().toISOString(),
          courses: allCourses,
          outlines: allOutlines,
          lessons: allLessons,
          items: allItems,
          states: allStates,
          exercises: allExercises,
          articles: allArticles,
        };
        fs.writeFileSync(seedPath, JSON.stringify(backup, null, 2), 'utf-8');
      } catch (seedErr) {
        console.warn('Could not sync to seed-courses.json:', seedErr);
      }

      // Return fresh state to client (only non-deleted courses!)
      const currentCourses = db.prepare(`
        SELECT c.* FROM courses c
        LEFT JOIN deleted_courses d ON c.id = d.course_id
        WHERE c.user_id = ? AND d.course_id IS NULL
        ORDER BY c.updated_at DESC, c.created_at DESC
      `).all(DEFAULT_USER_ID);
      const currentStates = db.prepare('SELECT * FROM user_item_states WHERE user_id = ?').all(DEFAULT_USER_ID);

      return NextResponse.json({
        success: true,
        restoredCourses: restoredCoursesCount,
        mergedStates: mergedStatesCount,
        courses: currentCourses,
        states: currentStates,
        deletedCourseIds: Array.from(deletedIds),
      });
    } catch (txError: any) {
      db.exec('ROLLBACK;');
      console.error('Transaction error in /api/sync:', txError);
      return NextResponse.json({ error: txError.message || 'Sync failed' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Sync request error:', error);
    return NextResponse.json({ error: error.message || 'Sync failed' }, { status: 500 });
  }
}
