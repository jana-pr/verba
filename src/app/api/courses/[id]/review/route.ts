import { NextRequest, NextResponse } from 'next/server';
import { getDb, DEFAULT_USER_ID } from '@/lib/db';
import { LearningDirection, LearningState } from '@/lib/db/schema';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const db = getDb();

    // 1. Weak / Recently incorrect (~50% -> 10 items)
    const weakStmt = db.prepare(`
      SELECT i.*, s.cz_to_target_state, s.target_to_cz_state, s.overall_state, l.lesson_number, l.title as lesson_title
      FROM learning_items i
      JOIN lessons l ON l.id = i.lesson_id
      JOIN user_item_states s ON s.learning_item_id = i.id AND s.user_id = ?
      WHERE i.course_id = ? AND (s.overall_state = 'learning' OR s.cz_to_target_state = 'learning' OR s.target_to_cz_state = 'learning')
      ORDER BY RANDOM()
      LIMIT 10
    `);
    const weakItems = weakStmt.all(DEFAULT_USER_ID, id) as any[];

    // 2. Older material in review (~25% -> 5 items)
    const reviewStmt = db.prepare(`
      SELECT i.*, s.cz_to_target_state, s.target_to_cz_state, s.overall_state, l.lesson_number, l.title as lesson_title
      FROM learning_items i
      JOIN lessons l ON l.id = i.lesson_id
      JOIN user_item_states s ON s.learning_item_id = i.id AND s.user_id = ?
      WHERE i.course_id = ? AND s.overall_state = 'review'
      ORDER BY RANDOM()
      LIMIT 5
    `);
    const reviewItems = reviewStmt.all(DEFAULT_USER_ID, id) as any[];

    // 3. Random mastered material (~25% -> 5 items)
    const masteredStmt = db.prepare(`
      SELECT i.*, s.cz_to_target_state, s.target_to_cz_state, s.overall_state, l.lesson_number, l.title as lesson_title
      FROM learning_items i
      JOIN lessons l ON l.id = i.lesson_id
      JOIN user_item_states s ON s.learning_item_id = i.id AND s.user_id = ?
      WHERE i.course_id = ? AND s.overall_state = 'mastered'
      ORDER BY RANDOM()
      LIMIT 5
    `);
    const masteredItems = masteredStmt.all(DEFAULT_USER_ID, id) as any[];

    // Combine pool
    const combined = [...weakItems, ...reviewItems, ...masteredItems];

    // If pool is smaller than 10 (e.g. at start of course), fill with any available items
    if (combined.length < 10) {
      const fallbackStmt = db.prepare(`
        SELECT i.*, s.cz_to_target_state, s.target_to_cz_state, s.overall_state, l.lesson_number, l.title as lesson_title
        FROM learning_items i
        JOIN lessons l ON l.id = i.lesson_id
        LEFT JOIN user_item_states s ON s.learning_item_id = i.id AND s.user_id = ?
        WHERE i.course_id = ?
        ORDER BY RANDOM()
        LIMIT 15
      `);
      const fallbackItems = fallbackStmt.all(DEFAULT_USER_ID, id) as any[];
      for (const item of fallbackItems) {
        if (!combined.some((c) => c.id === item.id)) {
          combined.push(item);
        }
      }
    }

    // Assign direction favoring weaker direction
    const practiceCards = combined.map((item) => {
      const czState = (item.cz_to_target_state || 'new') as LearningState;
      const targetState = (item.target_to_cz_state || 'new') as LearningState;
      const weight: Record<LearningState, number> = { new: 0, learning: 1, review: 2, mastered: 3 };

      const resolvedDirection: LearningDirection =
        weight[czState] <= weight[targetState] ? 'cz_to_target' : 'target_to_cz';

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
        cz_state: czState,
        target_state: targetState,
        overall_state: item.overall_state || 'new',
      };
    });

    return NextResponse.json(practiceCards);
  } catch (error) {
    console.error('Error fetching review set:', error);
    return NextResponse.json({ error: 'Failed to fetch course review items' }, { status: 500 });
  }
}
