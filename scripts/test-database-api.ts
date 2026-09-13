import assert from 'node:assert';
import { getDb, DEFAULT_USER_ID } from '../src/lib/db';
import { generateCurriculumOutline, generateLessonContent } from '../src/lib/ai/course-generator';
import { calculateMasteryUpdate, calculateOverallState } from '../src/lib/spaced-repetition';
import { evaluateAnswer } from '../src/lib/evaluation';
import crypto from 'node:crypto';

async function testDatabaseAndAPI() {
  console.log('--- SPUŠTĚNÍ DATABÁZOVÝCH A INTEGRAČNÍCH TESTŮ ---');

  const db = getDb();
  const testCourseId = `test_crs_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  // 1. Vytvoření konceptu kurzu
  console.log('\n[1] Test: Vytvoření konceptu kurzu (status: outline_pending)');
  const outlineLessons = await generateCurriculumOutline('en', 'B2', 'Project Management');
  db.prepare(`
    INSERT INTO courses (id, user_id, target_language, native_language, cefr_level, domain_area, status, total_lessons, completed_lessons_count, created_at, updated_at)
    VALUES (?, ?, 'en', 'cs', 'B2', 'Project Management', 'outline_pending', 50, 0, ?, ?)
  `).run(testCourseId, DEFAULT_USER_ID, now, now);

  db.prepare(`
    INSERT INTO curriculum_outlines (id, course_id, outline_json, is_approved, created_at)
    VALUES (?, ?, ?, 0, ?)
  `).run(`out_${crypto.randomUUID()}`, testCourseId, JSON.stringify(outlineLessons), now);

  const courseConcept = db.prepare('SELECT * FROM courses WHERE id = ?').get(testCourseId) as any;
  assert.strictEqual(courseConcept.status, 'outline_pending');
  assert.strictEqual(courseConcept.completed_lessons_count, 0);
  console.log('✓ Koncept kurzu úspěšně vytvořen s 0 lekcemi před schválením osnovy.');

  // 2. Schválení osnovy (Mandatory Business Gate)
  console.log('\n[2] Test: Povinná schvalovací brána osnovy');
  db.prepare('UPDATE curriculum_outlines SET is_approved = 1, approved_at = ? WHERE course_id = ?').run(now, testCourseId);
  db.prepare("UPDATE courses SET status = 'generating', updated_at = ? WHERE id = ?").run(now, testCourseId);

  const approvedCourse = db.prepare('SELECT * FROM courses WHERE id = ?').get(testCourseId) as any;
  assert.strictEqual(approvedCourse.status, 'generating');
  console.log('✓ Osnova schválena, kurz převeden do stavu generating.');

  // 3. Inkrementální generování Lekce 1
  console.log('\n[3] Test: Inkrementální vygenerování Lekce 1');
  const lesson1Data = await generateLessonContent(1, outlineLessons[0], 'en', 'B2', 'Project Management');
  const lesson1Id = `lsn_${crypto.randomUUID()}`;

  db.prepare(`
    INSERT INTO lessons (id, course_id, lesson_number, title, theme_focus, article_title, article_body, listening_script, status, created_at)
    VALUES (?, ?, 1, ?, ?, ?, ?, ?, 'completed', ?)
  `).run(
    lesson1Id,
    testCourseId,
    lesson1Data.lesson.title,
    lesson1Data.lesson.theme_focus,
    lesson1Data.lesson.article_title,
    lesson1Data.lesson.article_body,
    lesson1Data.lesson.listening_script,
    now
  );

  let firstItemId = '';
  for (const item of lesson1Data.items) {
    const itemId = `itm_${crypto.randomUUID()}`;
    if (!firstItemId) firstItemId = itemId;

    db.prepare(`
      INSERT INTO learning_items (id, lesson_id, course_id, item_type, target_text, czech_text, context_note, example_sentence_target, example_sentence_czech, phonetic_hint, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(itemId, lesson1Id, testCourseId, item.item_type, item.target_text, item.czech_text, item.context_note, item.example_sentence_target, item.example_sentence_czech, item.phonetic_hint || null, now);

    db.prepare(`
      INSERT INTO user_item_states (id, user_id, learning_item_id, course_id, cz_to_target_state, cz_to_target_streak, target_to_cz_state, target_to_cz_streak, overall_state, updated_at)
      VALUES (?, ?, ?, ?, 'new', 0, 'new', 0, 'new', ?)
    `).run(`uis_${crypto.randomUUID()}`, DEFAULT_USER_ID, itemId, testCourseId, now);
  }

  db.prepare('UPDATE courses SET completed_lessons_count = 1 WHERE id = ?').run(testCourseId);
  const courseAfterLesson1 = db.prepare('SELECT * FROM courses WHERE id = ?').get(testCourseId) as any;
  assert.strictEqual(courseAfterLesson1.completed_lessons_count, 1);
  console.log('✓ Lekce 1 úspěšně uložena včetně položek a výchozích stavů (new).');

  // 4. Test procvičování a zápisu do attempt_logs (Append-only)
  console.log('\n[4] Test: Procvičování, Spaced Repetition a auditní historie pokusů');
  const targetItem = db.prepare('SELECT * FROM learning_items WHERE id = ?').get(firstItemId) as any;

  // 1. pokus: Správná odpověď CZ -> Target
  const eval1 = await evaluateAnswer(targetItem.target_text, targetItem.target_text);
  assert.strictEqual(eval1.isCorrect, true);

  const u1 = calculateMasteryUpdate('new', 0, true);
  assert.strictEqual(u1.newState, 'learning');

  db.prepare(`
    INSERT INTO attempt_logs (id, user_id, course_id, learning_item_id, direction, exercise_type, user_answer, is_correct, score, evaluation_mode, created_at)
    VALUES (?, ?, ?, ?, 'cz_to_target', 'type_target', ?, 1, 1.0, 'deterministic_exact', ?)
  `).run(`att_${crypto.randomUUID()}`, DEFAULT_USER_ID, testCourseId, firstItemId, targetItem.target_text, now);

  db.prepare(`
    UPDATE user_item_states 
    SET cz_to_target_state = ?, cz_to_target_streak = ?, updated_at = ?
    WHERE user_id = ? AND learning_item_id = ?
  `).run(u1.newState, u1.newStreak, now, DEFAULT_USER_ID, firstItemId);

  // 2. pokus: Správná odpověď znovu -> posun do 'review'
  const u2 = calculateMasteryUpdate(u1.newState, u1.newStreak, true);
  assert.strictEqual(u2.newState, 'review');
  assert.strictEqual(u2.newStreak, 2);

  db.prepare(`
    INSERT INTO attempt_logs (id, user_id, course_id, learning_item_id, direction, exercise_type, user_answer, is_correct, score, evaluation_mode, created_at)
    VALUES (?, ?, ?, ?, 'cz_to_target', 'type_target', ?, 1, 1.0, 'deterministic_exact', ?)
  `).run(`att_${crypto.randomUUID()}`, DEFAULT_USER_ID, testCourseId, firstItemId, targetItem.target_text, now);

  db.prepare(`
    UPDATE user_item_states 
    SET cz_to_target_state = ?, cz_to_target_streak = ?, updated_at = ?
    WHERE user_id = ? AND learning_item_id = ?
  `).run(u2.newState, u2.newStreak, now, DEFAULT_USER_ID, firstItemId);

  // Ověření historie pokusů (musí být přesně 2 záznamy — nic se nemaže!)
  const totalLogs = db.prepare('SELECT COUNT(*) as cnt FROM attempt_logs WHERE learning_item_id = ?').get(firstItemId) as any;
  assert.strictEqual(totalLogs.cnt, 2, 'Historie pokusů musí zachovat oba záznamy');
  console.log('✓ Historie pokusů je append-only a stav položky postoupil z new -> learning -> review.');

  // 5. Test centrálního slovníku
  console.log('\n[5] Test: Dotaz do centrálního slovníku');
  const dictItems = db.prepare(`
    SELECT i.*, s.cz_to_target_state, s.target_to_cz_state, s.overall_state 
    FROM learning_items i
    JOIN user_item_states s ON s.learning_item_id = i.id
    WHERE i.course_id = ?
  `).all(testCourseId);
  assert.ok(dictItems.length >= 10, 'Slovník musí obsahovat všechny položky kurzu');
  console.log(`✓ Slovník kurzu obsahuje ${dictItems.length} položek s přesným obousměrným stavem.`);

  console.log('\n======================================================');
  console.log('VŠECHNY DATABÁZOVÉ A INTEGRAČNÍ TESTY ÚSPĚŠNĚ PROŠLY!');
  console.log('======================================================\n');
}

testDatabaseAndAPI().catch((err) => {
  console.error('Chyba v integračních testech:', err);
  process.exit(1);
});
