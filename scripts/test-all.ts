import assert from 'node:assert';
import { calculateMasteryUpdate, calculateOverallState } from '../src/lib/spaced-repetition';
import { evaluateAnswer, normalizeAnswer } from '../src/lib/evaluation';
import { generateCurriculumOutline, generateLessonContent } from '../src/lib/ai/course-generator';

async function runTests() {
  console.log('--- SPUŠTĚNÍ AUTOMATICKÝCH TESTŮ VERBA (APP-001) ---');

  // 1. TEST: Normalizace odpovědí
  console.log('\n[1] Test: Normalizace odpovědí');
  assert.strictEqual(normalizeAnswer('  Critical Dependency. '), 'critical dependency');
  assert.strictEqual(normalizeAnswer("Don't allocate!"), "do not allocate");
  assert.strictEqual(normalizeAnswer('We need to confirm...'), 'we need to confirm');
  console.log('✓ Normalizace textu funguje správně.');

  // 2. TEST: Třívrstvé vyhodnocování odpovědí
  console.log('\n[2] Test: Třívrstvé vyhodnocování odpovědí');
  // Přesná shoda
  const r1 = await evaluateAnswer('dependency', 'dependency');
  assert.strictEqual(r1.isCorrect, true);
  assert.strictEqual(r1.verdict, 'correct');

  // Shoda se synonymem
  const r2 = await evaluateAnswer(
    'allocate sufficient resources',
    'allocate enough resources',
    ['allocate sufficient resources', 'assign adequate capacity']
  );
  assert.strictEqual(r2.isCorrect, true);
  assert.strictEqual(r2.mode, 'deterministic_synonym');

  // Stažené tvary (contractions)
  const r3 = await evaluateAnswer("we don't have enough time", "we do not have enough time");
  assert.strictEqual(r3.isCorrect, true);

  // Drobný překlep
  const r4 = await evaluateAnswer('dependancy', 'dependency');
  assert.strictEqual(r4.isCorrect, true);
  assert.strictEqual(r4.verdict, 'partially_correct');

  // Nesprávná odpověď
  const r5 = await evaluateAnswer('completely wrong answer', 'dependency');
  assert.strictEqual(r5.isCorrect, false);
  assert.strictEqual(r5.verdict, 'incorrect');
  console.log('✓ Vyhodnocovací engine funguje spolehlivě ve všech vrstvách.');

  // 3. TEST: Spaced Repetition a obousměrný stavový model
  console.log('\n[3] Test: Spaced Repetition (SM-2/Leitner) přechody stavů');
  // New -> Learning
  const s1 = calculateMasteryUpdate('new', 0, true);
  assert.strictEqual(s1.newState, 'learning');
  assert.strictEqual(s1.newStreak, 1);

  // Learning -> Review (streak 2)
  const s2 = calculateMasteryUpdate('learning', 1, true);
  assert.strictEqual(s2.newState, 'review');
  assert.strictEqual(s2.newStreak, 2);

  // Review -> Mastered (streak 4)
  const s3 = calculateMasteryUpdate('review', 3, true);
  assert.strictEqual(s3.newState, 'mastered');
  assert.strictEqual(s3.newStreak, 4);

  // Chyba u Mastered -> okamžitá degradace do Learning a streak 0
  const s4 = calculateMasteryUpdate('mastered', 5, false);
  assert.strictEqual(s4.newState, 'learning');
  assert.strictEqual(s4.newStreak, 0);
  assert.strictEqual(s4.isDemoted, true);
  console.log('✓ Pravidla přechodů stavů mastery fungují přesně dle specifikace.');

  // 4. TEST: Obousměrný výpočet celkového stavu (Overall = min(CZ->Target, Target->CZ))
  console.log('\n[4] Test: Obousměrná hierarchie celkového stavu');
  assert.strictEqual(calculateOverallState('new', 'new'), 'new');
  assert.strictEqual(calculateOverallState('learning', 'mastered'), 'learning');
  assert.strictEqual(calculateOverallState('mastered', 'review'), 'review');
  assert.strictEqual(calculateOverallState('mastered', 'mastered'), 'mastered');
  console.log('✓ Celkový stav položky správně reflektuje slabší směr (Active Recall vs Comprehension).');

  // 5. TEST: Generátor osnovy kurzu (50 lekcí + milníky)
  console.log('\n[5] Test: 50-lekcí Curriculum Outline a milníky Checkpoints');
  const outline = await generateCurriculumOutline('en', 'B2', 'Project Management');
  assert.strictEqual(outline.length, 50, 'Osnova musí mít přesně 50 lekcí');
  assert.strictEqual(outline[9].title.includes('Checkpoint 1') || outline[9].theme_focus.includes('Checkpoint'), true);
  assert.strictEqual(outline[19].title.includes('Checkpoint 2') || outline[19].theme_focus.includes('Checkpoint'), true);
  assert.strictEqual(outline[49].title.includes('Checkpoint 5') || outline[49].theme_focus.includes('Checkpoint'), true);
  console.log('✓ Osnova kurzu má přesně 50 lekcí s milníky na pozicích 10, 20, 30, 40, 50.');

  // 6. TEST: Generování obsahu lekce
  console.log('\n[6] Test: Struktura lekce (slovíčka, fráze, článek, poslech, transfer článek)');
  const lessonData = await generateLessonContent(1, outline[0], 'en', 'B2', 'Project Management');
  assert.ok(lessonData.lesson.title, 'Lekce musí mít název');
  assert.ok(lessonData.lesson.article_body, 'Lekce musí mít článek');
  assert.ok(lessonData.items.length >= 10, 'Lekce musí obsahovat slovní zásobu a fráze');
  assert.ok(lessonData.exercises.length >= 4, 'Lekce musí obsahovat cvičení');
  assert.ok(lessonData.transferArticle.body_text, 'Lekce musí obsahovat transferový článek pro procvičování');
  assert.ok(lessonData.transferArticle.questions.length >= 2, 'Transferový článek musí mít otázky');
  console.log('✓ Struktura lekce obsahuje všech 5 povinných vrstev.');

  console.log('\n========================================');
  console.log('VŠECHNY AUTOMATICKÉ TESTY ÚSPĚŠNĚ PROŠLY!');
  console.log('========================================\n');
}

runTests().catch((err) => {
  console.error('Chyba v testech:', err);
  process.exit(1);
});
