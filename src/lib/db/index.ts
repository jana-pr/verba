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
