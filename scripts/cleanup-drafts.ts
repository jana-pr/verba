import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('./data/verba.db');
db.exec('PRAGMA foreign_keys = ON;');

db.prepare("DELETE FROM courses WHERE completed_lessons_count = 0 OR status = 'outline_pending'").run();
db.prepare("DELETE FROM courses WHERE id LIKE 'test_crs_%'").run();

const remaining = db.prepare('SELECT id, domain_area, completed_lessons_count, status FROM courses').all();
console.log('Remaining courses:', remaining);
