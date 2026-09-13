import { NextRequest, NextResponse } from 'next/server';
import { getDb, DEFAULT_USER_ID } from '@/lib/db';
import { evaluateAnswer } from '@/lib/evaluation';
import { calculateMasteryUpdate, calculateOverallState } from '@/lib/spaced-repetition';
import { LearningDirection, LearningState } from '@/lib/db/schema';
import crypto from 'node:crypto';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(req.url);

    const directionParam = searchParams.get('direction') || 'mixed'; // cz_to_target | target_to_cz | mixed
    const typeParam = searchParams.get('type') || 'mixed'; // words | phrases | sentences | mixed
    const lessonId = searchParams.get('lessonId');
    const limit = parseInt(searchParams.get('limit') || '15', 10);

    const db = getDb();

    let query = `
      SELECT 
        i.*,
        l.lesson_number,
        l.title as lesson_title,
        COALESCE(s.cz_to_target_state, 'new') as cz_to_target_state,
        COALESCE(s.cz_to_target_streak, 0) as cz_to_target_streak,
        COALESCE(s.target_to_cz_state, 'new') as target_to_cz_state,
        COALESCE(s.target_to_cz_streak, 0) as target_to_cz_streak,
        COALESCE(s.overall_state, 'new') as overall_state
      FROM learning_items i
      JOIN lessons l ON l.id = i.lesson_id
      LEFT JOIN user_item_states s 
        ON s.learning_item_id = i.id AND s.user_id = ?
      WHERE i.course_id = ?
    `;
    const params: any[] = [DEFAULT_USER_ID, id];

    if (lessonId) {
      query += ` AND (i.lesson_id = ? OR l.lesson_number = ?)`;
      params.push(lessonId, isNaN(Number(lessonId)) ? -1 : Number(lessonId));
    }

    if (typeParam === 'words') {
      query += ` AND i.item_type IN ('word', 'expression')`;
    } else if (typeParam === 'phrases') {
      query += ` AND i.item_type = 'phrase'`;
    } else if (typeParam === 'sentences') {
      query += ` AND i.item_type = 'sentence'`;
    }

    // Order prioritizing items that need practice (learning/review over mastered)
    query += `
      ORDER BY 
        CASE 
          WHEN s.overall_state = 'learning' THEN 1
          WHEN s.overall_state = 'review' THEN 2
          WHEN s.overall_state = 'new' THEN 3
          ELSE 4
        END ASC,
        RANDOM()
      LIMIT ?
    `;
    params.push(limit);

    const rawItems = db.prepare(query).all(...params) as any[];

    // Map into practice cards with assigned direction
    const practiceCards = rawItems.map((item) => {
      let resolvedDirection: LearningDirection = 'cz_to_target';

      if (directionParam === 'cz_to_target') {
        resolvedDirection = 'cz_to_target';
      } else if (directionParam === 'target_to_cz') {
        resolvedDirection = 'target_to_cz';
      } else {
        // Mixed direction: prefer whichever direction has a weaker state
        const czState = item.cz_to_target_state as LearningState;
        const targetState = item.target_to_cz_state as LearningState;
        const weight: Record<LearningState, number> = { new: 0, learning: 1, review: 2, mastered: 3 };

        if (weight[czState] <= weight[targetState]) {
          resolvedDirection = 'cz_to_target';
        } else {
          resolvedDirection = 'target_to_cz';
        }
      }

      return {
        id: item.id,
        item_type: item.item_type,
        lesson_number: item.lesson_number,
        lesson_title: item.lesson_title,
        direction: resolvedDirection,
        prompt: resolvedDirection === 'cz_to_target' ? item.czech_text : item.target_text,
        canonical_answer: resolvedDirection === 'cz_to_target' ? item.target_text : item.czech_text,
        context_note: item.context_note,
        example_target: item.example_sentence_target,
        example_czech: item.example_sentence_czech,
        phonetic_hint: item.phonetic_hint,
        cz_state: item.cz_to_target_state,
        target_state: item.target_to_cz_state,
        overall_state: item.overall_state,
      };
    });

    return NextResponse.json(practiceCards);
  } catch (error) {
    console.error('Error preparing practice items:', error);
    return NextResponse.json({ error: 'Failed to prepare practice items' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const {
      learning_item_id,
      direction, // 'cz_to_target' | 'target_to_cz'
      user_answer = '',
      canonical_answer = '',
      acceptable_synonyms = [],
      exercise_type = 'type_target',
    } = body;

    const db = getDb();
    const now = new Date().toISOString();

    // 1. Evaluate answer via Three-tier engine
    const evaluation = await evaluateAnswer(
      user_answer,
      canonical_answer,
      acceptable_synonyms
    );

    // 2. Fetch current user item state
    const stateStmt = db.prepare(`
      SELECT * FROM user_item_states 
      WHERE user_id = ? AND learning_item_id = ?
    `);
    let userState = stateStmt.get(DEFAULT_USER_ID, learning_item_id) as any;

    if (!userState) {
      // Create record if missing
      const newStateId = `uis_${crypto.randomUUID()}`;
      db.prepare(`
        INSERT INTO user_item_states (
          id, user_id, learning_item_id, course_id, 
          cz_to_target_state, cz_to_target_streak, 
          target_to_cz_state, target_to_cz_streak, 
          overall_state, updated_at
        ) VALUES (?, ?, ?, ?, 'new', 0, 'new', 0, 'new', ?)
      `).run(newStateId, DEFAULT_USER_ID, learning_item_id, id, now);

      userState = {
        cz_to_target_state: 'new',
        cz_to_target_streak: 0,
        target_to_cz_state: 'new',
        target_to_cz_streak: 0,
        overall_state: 'new',
      };
    }

    // 3. Compute Spaced Repetition update for the specific direction tested
    const isCzToTarget = direction === 'cz_to_target';
    const currentDirectionState = (isCzToTarget ? userState.cz_to_target_state : userState.target_to_cz_state) as LearningState;
    const currentDirectionStreak = isCzToTarget ? userState.cz_to_target_streak : userState.target_to_cz_streak;

    const update = calculateMasteryUpdate(
      currentDirectionState,
      currentDirectionStreak,
      evaluation.isCorrect
    );

    const newCzState = isCzToTarget ? update.newState : userState.cz_to_target_state;
    const newCzStreak = isCzToTarget ? update.newStreak : userState.cz_to_target_streak;
    const newTargetState = !isCzToTarget ? update.newState : userState.target_to_cz_state;
    const newTargetStreak = !isCzToTarget ? update.newStreak : userState.target_to_cz_streak;

    const newOverallState = calculateOverallState(newCzState, newTargetState);

    // 4. Transactionally save attempt log and update state
    db.exec('BEGIN TRANSACTION;');
    try {
      // A. Append to attempt_logs (Append-only — NEVER deleted)
      const logStmt = db.prepare(`
        INSERT INTO attempt_logs (
          id, user_id, course_id, learning_item_id, direction, 
          exercise_type, user_answer, is_correct, score, 
          evaluation_mode, ai_feedback, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      logStmt.run(
        `att_${crypto.randomUUID()}`,
        DEFAULT_USER_ID,
        id,
        learning_item_id,
        direction,
        exercise_type,
        user_answer,
        evaluation.isCorrect ? 1 : 0,
        evaluation.score,
        evaluation.mode,
        evaluation.feedback || null,
        now
      );

      // B. Update user item state
      const updateStateStmt = db.prepare(`
        UPDATE user_item_states 
        SET cz_to_target_state = ?,
            cz_to_target_streak = ?,
            target_to_cz_state = ?,
            target_to_cz_streak = ?,
            overall_state = ?,
            updated_at = ?
        WHERE user_id = ? AND learning_item_id = ?
      `);
      updateStateStmt.run(
        newCzState,
        newCzStreak,
        newTargetState,
        newTargetStreak,
        newOverallState,
        now,
        DEFAULT_USER_ID,
        learning_item_id
      );

      db.exec('COMMIT;');
    } catch (txError) {
      db.exec('ROLLBACK;');
      throw txError;
    }

    return NextResponse.json({
      evaluation,
      masteryUpdate: {
        direction,
        previousState: currentDirectionState,
        newState: update.newState,
        streak: update.newStreak,
        overallState: newOverallState,
        isDemoted: update.isDemoted,
      },
    });
  } catch (error) {
    console.error('Error logging practice attempt:', error);
    return NextResponse.json({ error: 'Failed to process attempt' }, { status: 500 });
  }
}
