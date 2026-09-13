import { NextRequest, NextResponse } from 'next/server';
import { getDb, DEFAULT_USER_ID } from '@/lib/db';
import fs from 'node:fs';
import path from 'node:path';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let rawJson = body.jsonText || body;

    // If jsonText is a string, strip markdown fences if present
    if (typeof rawJson === 'string') {
      let cleaned = rawJson.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      try {
        rawJson = JSON.parse(cleaned);
      } catch (parseErr: any) {
        return NextResponse.json(
          { error: `Neplatný JSON formát: ${parseErr.message}` },
          { status: 400 }
        );
      }
    }

    if (!rawJson || typeof rawJson !== 'object') {
      return NextResponse.json(
        { error: 'Vložená data nemají platný formát JSON objektu.' },
        { status: 400 }
      );
    }

    // Extract course metadata and lessons
    const courseMeta = rawJson.course || rawJson;
    const lessonsList = Array.isArray(rawJson.lessons)
      ? rawJson.lessons
      : Array.isArray(courseMeta.lessons)
      ? courseMeta.lessons
      : [];

    if (lessonsList.length === 0) {
      return NextResponse.json(
        { error: 'Vložený JSON neobsahuje žádné lekce (klíč "lessons").' },
        { status: 400 }
      );
    }

    const domainArea = courseMeta.domain_area || courseMeta.title || 'Nový kurz z GPT';
    const targetLanguage = (courseMeta.target_language || 'en').toLowerCase();
    const nativeLanguage = (courseMeta.native_language || 'cs').toLowerCase();
    const cefrLevel = (courseMeta.cefr_level || 'B2').toUpperCase();

    // Create unique course ID
    const safeDomainSlug = domainArea
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 30);
    const courseId = `crs_gpt_${safeDomainSlug}_${Date.now()}`;
    const nowIso = new Date().toISOString();

    const db = getDb();
    db.exec('BEGIN TRANSACTION;');

    try {
      // 1. Insert Course
      const insertCourse = db.prepare(`
        INSERT INTO courses (
          id, user_id, target_language, native_language, cefr_level,
          domain_area, status, total_lessons, completed_lessons_count,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertCourse.run(
        courseId,
        DEFAULT_USER_ID,
        targetLanguage,
        nativeLanguage,
        cefrLevel,
        domainArea,
        'ready',
        lessonsList.length,
        lessonsList.length,
        nowIso,
        nowIso
      );

      // 2. Insert Curriculum Outline
      const outlineItems = lessonsList.map((l: any, idx: number) => ({
        lesson_number: l.lesson_number || idx + 1,
        title: l.title || `Lekce ${idx + 1}`,
        theme_focus: l.theme_focus || '',
        learning_goal: `Osvojení odborné terminologie a frází pro ${l.theme_focus || l.title}`,
      }));

      const insertOutline = db.prepare(`
        INSERT INTO curriculum_outlines (
          id, course_id, outline_json, is_approved, approved_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      insertOutline.run(
        `out_${courseId}`,
        courseId,
        JSON.stringify(outlineItems),
        1,
        nowIso,
        nowIso
      );

      // Statements for lessons, items, states, exercises
      const insertLesson = db.prepare(`
        INSERT INTO lessons (
          id, course_id, lesson_number, title, theme_focus,
          article_title, article_body, listening_script, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertItem = db.prepare(`
        INSERT INTO learning_items (
          id, lesson_id, course_id, item_type, target_text, czech_text,
          context_note, example_sentence_target, example_sentence_czech,
          phonetic_hint, audio_url, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertState = db.prepare(`
        INSERT INTO user_item_states (
          id, user_id, learning_item_id, course_id,
          cz_to_target_state, cz_to_target_streak,
          target_to_cz_state, target_to_cz_streak,
          overall_state, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertExercise = db.prepare(`
        INSERT INTO lesson_exercises (
          id, lesson_id, exercise_type, prompt, target_language_context,
          options_json, canonical_answer, acceptable_synonyms_json, explanation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertArticle = db.prepare(`
        INSERT INTO transfer_articles (
          id, lesson_id, title, body_text, questions_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      let totalItemsInserted = 0;

      // 3. Process each lesson
      for (let i = 0; i < lessonsList.length; i++) {
        const l = lessonsList[i];
        const lessonNum = l.lesson_number || i + 1;
        const lessonId = `les_${courseId}_${lessonNum}`;

        insertLesson.run(
          lessonId,
          courseId,
          lessonNum,
          l.title || `Lekce ${lessonNum}`,
          l.theme_focus || '',
          l.article_title || l.title || `Odborný text k lekci ${lessonNum}`,
          l.article_body || `Professional article focusing on ${l.title || domainArea}.`,
          l.listening_script || `Audio transcription for lesson ${lessonNum} discussing ${l.title || domainArea}.`,
          'completed',
          nowIso
        );

        // Process vocabulary items
        const items = Array.isArray(l.items) ? l.items : [];
        for (let j = 0; j < items.length; j++) {
          const it = items[j];
          if (!it.target_text || !it.czech_text) continue;

          const itemId = `itm_${lessonId}_${j + 1}`;
          const itemType = it.item_type || (it.target_text.includes(' ') ? 'expression' : 'word');

          insertItem.run(
            itemId,
            lessonId,
            courseId,
            itemType,
            it.target_text.trim(),
            it.czech_text.trim(),
            it.context_note || '',
            it.example_sentence_target || `Example using ${it.target_text}.`,
            it.example_sentence_czech || `Příklad použití výrazu ${it.czech_text}.`,
            it.phonetic_hint || null,
            null,
            nowIso
          );

          // Initialize learner state
          const stateId = `st_${DEFAULT_USER_ID}_${itemId}`;
          insertState.run(
            stateId,
            DEFAULT_USER_ID,
            itemId,
            courseId,
            'new',
            0,
            'new',
            0,
            'new',
            nowIso
          );

          totalItemsInserted++;
        }

        // Process exercises
        const exercises = Array.isArray(l.exercises) ? l.exercises : [];
        for (let k = 0; k < exercises.length; k++) {
          const ex = exercises[k];
          const exId = `ex_${lessonId}_${k + 1}`;
          const options = Array.isArray(ex.options) ? JSON.stringify(ex.options) : null;
          const synonyms = Array.isArray(ex.acceptable_synonyms) ? JSON.stringify(ex.acceptable_synonyms) : null;

          insertExercise.run(
            exId,
            lessonId,
            ex.exercise_type || 'choice',
            ex.prompt || 'Vyberte správnou možnost:',
            ex.target_language_context || null,
            options,
            ex.canonical_answer || '',
            synonyms,
            ex.explanation || ''
          );
        }

        // Process transfer article if present
        if (l.transfer_article) {
          const art = l.transfer_article;
          insertArticle.run(
            `art_${lessonId}`,
            lessonId,
            art.title || `Transfer článek k lekci ${lessonNum}`,
            art.body_text || '',
            JSON.stringify(art.questions || []),
            nowIso
          );
        }
      }

      db.exec('COMMIT;');

      // Sync to seed-courses.json in background/safely
      try {
        const seedPath = path.join(process.cwd(), 'data', 'seed-courses.json');
        const courses = db.prepare('SELECT * FROM courses').all();
        const outlines = db.prepare('SELECT * FROM curriculum_outlines').all();
        const allLessons = db.prepare('SELECT * FROM lessons').all();
        const allItems = db.prepare('SELECT * FROM learning_items').all();
        const allStates = db.prepare('SELECT * FROM user_item_states').all();
        const allExercises = db.prepare('SELECT * FROM lesson_exercises').all();
        const allArticles = db.prepare('SELECT * FROM transfer_articles').all();

        const backup = {
          version: '1.1',
          exportedAt: new Date().toISOString(),
          courses,
          outlines,
          lessons: allLessons,
          items: allItems,
          states: allStates,
          exercises: allExercises,
          articles: allArticles,
        };
        fs.writeFileSync(seedPath, JSON.stringify(backup, null, 2), 'utf-8');
      } catch (seedErr) {
        console.warn('Could not update seed-courses.json:', seedErr);
      }

      return NextResponse.json({
        success: true,
        courseId,
        domainArea,
        lessonCount: lessonsList.length,
        itemCount: totalItemsInserted,
        message: `Kurz „${domainArea}“ byl úspěšně vytvořen (${lessonsList.length} lekcí, ${totalItemsInserted} slovíček).`,
      });
    } catch (txErr: any) {
      db.exec('ROLLBACK;');
      console.error('Import course transaction error:', txErr);
      return NextResponse.json(
        { error: `Chyba při zápisu kurzu do databáze: ${txErr.message}` },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error('Import course error:', err);
    return NextResponse.json(
      { error: `Chyba při zpracování požadavku: ${err.message}` },
      { status: 500 }
    );
  }
}
