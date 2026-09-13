import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DB_FILE = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'verba.db');
const DB_DIR = path.dirname(DB_FILE);

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_FILE);
    dbInstance.exec(`PRAGMA foreign_keys = ON;`);
    initTables(dbInstance);
    ensureSeedCourses(dbInstance);
  }
  return dbInstance;
}

function initTables(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      target_language TEXT NOT NULL,
      native_language TEXT NOT NULL DEFAULT 'cs',
      cefr_level TEXT NOT NULL,
      domain_area TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'outline_pending',
      total_lessons INTEGER NOT NULL DEFAULT 50,
      completed_lessons_count INTEGER NOT NULL DEFAULT 0,
      generation_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS curriculum_outlines (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL UNIQUE,
      outline_json TEXT NOT NULL,
      is_approved INTEGER NOT NULL DEFAULT 0,
      approved_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      lesson_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      theme_focus TEXT NOT NULL,
      article_title TEXT NOT NULL,
      article_body TEXT NOT NULL,
      listening_script TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      created_at TEXT NOT NULL,
      UNIQUE(course_id, lesson_number),
      FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS learning_items (
      id TEXT PRIMARY KEY,
      lesson_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      target_text TEXT NOT NULL,
      czech_text TEXT NOT NULL,
      context_note TEXT NOT NULL,
      example_sentence_target TEXT NOT NULL,
      example_sentence_czech TEXT NOT NULL,
      phonetic_hint TEXT,
      audio_url TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
      FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_item_states (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      learning_item_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      cz_to_target_state TEXT NOT NULL DEFAULT 'new',
      cz_to_target_streak INTEGER NOT NULL DEFAULT 0,
      cz_to_target_last_reviewed TEXT,
      cz_to_target_next_review TEXT,
      target_to_cz_state TEXT NOT NULL DEFAULT 'new',
      target_to_cz_streak INTEGER NOT NULL DEFAULT 0,
      target_to_cz_last_reviewed TEXT,
      target_to_cz_next_review TEXT,
      overall_state TEXT NOT NULL DEFAULT 'new',
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, learning_item_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(learning_item_id) REFERENCES learning_items(id) ON DELETE CASCADE,
      FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attempt_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      learning_item_id TEXT,
      direction TEXT NOT NULL,
      exercise_type TEXT NOT NULL,
      user_answer TEXT NOT NULL,
      is_correct INTEGER NOT NULL,
      score REAL NOT NULL,
      evaluation_mode TEXT NOT NULL,
      ai_feedback TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lesson_exercises (
      id TEXT PRIMARY KEY,
      lesson_id TEXT NOT NULL,
      exercise_type TEXT NOT NULL,
      prompt TEXT NOT NULL,
      target_language_context TEXT,
      options_json TEXT,
      canonical_answer TEXT NOT NULL,
      acceptable_synonyms_json TEXT,
      explanation TEXT NOT NULL,
      FOREIGN KEY(lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transfer_articles (
      id TEXT PRIMARY KEY,
      lesson_id TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      body_text TEXT NOT NULL,
      questions_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audio_cache (
      id TEXT PRIMARY KEY,
      text_hash TEXT UNIQUE NOT NULL,
      file_path TEXT NOT NULL,
      mime_type TEXT NOT NULL DEFAULT 'audio/mpeg',
      created_at TEXT NOT NULL
    );

    -- Ensure default user exists
    INSERT OR IGNORE INTO users (id, email, full_name, created_at)
    VALUES ('usr_jana_default', 'jana@verba.local', 'Jana Prošková', datetime('now'));
  `);
}

export const DEFAULT_USER_ID = 'usr_jana_default';

export function ensureSeedCourses(db: DatabaseSync) {
  try {
    const seedFile = path.join(process.cwd(), 'data', 'seed-courses.json');
    if (!fs.existsSync(seedFile)) return;

    const data = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
    if (!data.courses || data.courses.length === 0) return;

    // Check if any seed course is missing from DB
    const existingIds = new Set(
      (db.prepare('SELECT id FROM courses').all() as { id: string }[]).map((r) => r.id)
    );

    const hasMissing = data.courses.some((c: any) => !existingIds.has(c.id));
    if (!hasMissing && existingIds.size >= 4) {
      // All core courses are already present
      return;
    }

    console.log('Seeding / restoring missing core courses from data/seed-courses.json...');
    db.exec('BEGIN TRANSACTION;');
    try {
      const insertCourse = db.prepare(`
        INSERT OR IGNORE INTO courses (id, user_id, target_language, native_language, cefr_level, domain_area, status, total_lessons, completed_lessons_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const c of data.courses || []) {
        insertCourse.run(c.id, c.user_id, c.target_language, c.native_language, c.cefr_level, c.domain_area, c.status, c.total_lessons, c.completed_lessons_count, c.created_at, c.updated_at);
      }

      const insertOutline = db.prepare(`
        INSERT OR IGNORE INTO curriculum_outlines (id, course_id, outline_json, is_approved, approved_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const o of data.outlines || []) {
        insertOutline.run(o.id, o.course_id, o.outline_json, o.is_approved, o.approved_at, o.created_at);
      }

      const insertLesson = db.prepare(`
        INSERT OR IGNORE INTO lessons (id, course_id, lesson_number, title, theme_focus, article_title, article_body, listening_script, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const l of data.lessons || []) {
        insertLesson.run(l.id, l.course_id, l.lesson_number, l.title, l.theme_focus, l.article_title, l.article_body, l.listening_script, l.status, l.created_at);
      }

      const insertItem = db.prepare(`
        INSERT OR IGNORE INTO learning_items (id, lesson_id, course_id, item_type, target_text, czech_text, context_note, example_sentence_target, example_sentence_czech, phonetic_hint, audio_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const it of data.items || []) {
        insertItem.run(it.id, it.lesson_id, it.course_id, it.item_type, it.target_text, it.czech_text, it.context_note, it.example_sentence_target, it.example_sentence_czech, it.phonetic_hint || null, it.audio_url || null, it.created_at);
      }

      const insertState = db.prepare(`
        INSERT OR IGNORE INTO user_item_states (id, user_id, learning_item_id, course_id, cz_to_target_state, cz_to_target_streak, cz_to_target_last_reviewed, cz_to_target_next_review, target_to_cz_state, target_to_cz_streak, target_to_cz_last_reviewed, target_to_cz_next_review, overall_state, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const s of data.states || []) {
        insertState.run(s.id, s.user_id, s.learning_item_id, s.course_id, s.cz_to_target_state, s.cz_to_target_streak, s.cz_to_target_last_reviewed || null, s.cz_to_target_next_review || null, s.target_to_cz_state, s.target_to_cz_streak, s.target_to_cz_last_reviewed || null, s.target_to_cz_next_review || null, s.overall_state, s.updated_at);
      }

      const insertExercise = db.prepare(`
        INSERT OR IGNORE INTO lesson_exercises (id, lesson_id, exercise_type, prompt, target_language_context, options_json, canonical_answer, acceptable_synonyms_json, explanation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const ex of data.exercises || []) {
        insertExercise.run(ex.id, ex.lesson_id, ex.exercise_type, ex.prompt, ex.target_language_context || null, ex.options_json || null, ex.canonical_answer, ex.acceptable_synonyms_json || null, ex.explanation);
      }

      const insertArticle = db.prepare(`
        INSERT OR IGNORE INTO transfer_articles (id, lesson_id, title, body_text, questions_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const art of data.articles || []) {
        insertArticle.run(art.id, art.lesson_id, art.title, art.body_text, art.questions_json, art.created_at);
      }

      db.exec('COMMIT;');
      console.log('Automated seed/restore completed successfully!');
    } catch (seedErr) {
      db.exec('ROLLBACK;');
      console.error('Failed to commit seed data:', seedErr);
    }
  } catch (err) {
    console.error('Error in ensureSeedCourses:', err);
  }
}
