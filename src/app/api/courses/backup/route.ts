import { NextRequest, NextResponse } from 'next/server';
import { getDb, DEFAULT_USER_ID } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const courses = db.prepare('SELECT * FROM courses').all();
    const outlines = db.prepare('SELECT * FROM curriculum_outlines').all();
    const lessons = db.prepare('SELECT * FROM lessons').all();
    const items = db.prepare('SELECT * FROM learning_items').all();
    const states = db.prepare('SELECT * FROM user_item_states').all();
    const exercises = db.prepare('SELECT * FROM lesson_exercises').all();
    const articles = db.prepare('SELECT * FROM transfer_articles').all();

    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      courses,
      outlines,
      lessons,
      items,
      states,
      exercises,
      articles,
    };

    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="verba_backup_${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error: any) {
    console.error('Backup export failed:', error);
    return NextResponse.json({ error: 'Failed to export backup' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const backup = await req.json();
    if (!backup || !backup.courses) {
      return NextResponse.json({ error: 'Neplatný záložní soubor.' }, { status: 400 });
    }

    const db = getDb();
    db.exec('BEGIN TRANSACTION;');

    try {
      const insertCourse = db.prepare(`
        INSERT OR REPLACE INTO courses (id, user_id, target_language, native_language, cefr_level, domain_area, status, total_lessons, completed_lessons_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const c of backup.courses || []) {
        insertCourse.run(c.id, c.user_id, c.target_language, c.native_language, c.cefr_level, c.domain_area, c.status, c.total_lessons, c.completed_lessons_count, c.created_at, c.updated_at);
      }

      const insertOutline = db.prepare(`
        INSERT OR REPLACE INTO curriculum_outlines (id, course_id, outline_json, is_approved, approved_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const o of backup.outlines || []) {
        insertOutline.run(o.id, o.course_id, o.outline_json, o.is_approved, o.approved_at, o.created_at);
      }

      const insertLesson = db.prepare(`
        INSERT OR REPLACE INTO lessons (id, course_id, lesson_number, title, theme_focus, article_title, article_body, listening_script, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const l of backup.lessons || []) {
        insertLesson.run(l.id, l.course_id, l.lesson_number, l.title, l.theme_focus, l.article_title, l.article_body, l.listening_script, l.status, l.created_at);
      }

      const insertItem = db.prepare(`
        INSERT OR REPLACE INTO learning_items (id, lesson_id, course_id, item_type, target_text, czech_text, context_note, example_sentence_target, example_sentence_czech, phonetic_hint, audio_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const it of backup.items || []) {
        insertItem.run(it.id, it.lesson_id, it.course_id, it.item_type, it.target_text, it.czech_text, it.context_note, it.example_sentence_target, it.example_sentence_czech, it.phonetic_hint || null, it.audio_url || null, it.created_at);
      }

      const insertState = db.prepare(`
        INSERT OR REPLACE INTO user_item_states (id, user_id, learning_item_id, course_id, cz_to_target_state, cz_to_target_streak, cz_to_target_last_reviewed, cz_to_target_next_review, target_to_cz_state, target_to_cz_streak, target_to_cz_last_reviewed, target_to_cz_next_review, overall_state, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const s of backup.states || []) {
        insertState.run(s.id, s.user_id, s.learning_item_id, s.course_id, s.cz_to_target_state, s.cz_to_target_streak, s.cz_to_target_last_reviewed || null, s.cz_to_target_next_review || null, s.target_to_cz_state, s.target_to_cz_streak, s.target_to_cz_last_reviewed || null, s.target_to_cz_next_review || null, s.overall_state, s.updated_at);
      }

      const insertExercise = db.prepare(`
        INSERT OR REPLACE INTO lesson_exercises (id, lesson_id, exercise_type, prompt, target_language_context, options_json, canonical_answer, acceptable_synonyms_json, explanation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const ex of backup.exercises || []) {
        insertExercise.run(ex.id, ex.lesson_id, ex.exercise_type, ex.prompt, ex.target_language_context || null, ex.options_json || null, ex.canonical_answer, ex.acceptable_synonyms_json || null, ex.explanation);
      }

      const insertArticle = db.prepare(`
        INSERT OR REPLACE INTO transfer_articles (id, lesson_id, title, body_text, questions_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const art of backup.articles || []) {
        insertArticle.run(art.id, art.lesson_id, art.title, art.body_text, art.questions_json, art.created_at);
      }

      db.exec('COMMIT;');
      return NextResponse.json({ success: true, restoredCourses: backup.courses.length });
    } catch (importErr: any) {
      db.exec('ROLLBACK;');
      console.error('Import transaction error:', importErr);
      return NextResponse.json({ error: importErr.message || 'Chyba importu.' }, { status: 500 });
    }
  } catch (err: any) {
    console.error('Backup import request error:', err);
    return NextResponse.json({ error: 'Chyba při zpracování požadavku.' }, { status: 500 });
  }
}
