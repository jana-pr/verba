import { NextRequest, NextResponse } from 'next/server';
import { getDb, DEFAULT_USER_ID } from '@/lib/db';
import { LearningDirection, LearningState } from '@/lib/db/schema';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string; num: string }> }
) {
  try {
    const { id, num } = await context.params;
    const checkpointNum = parseInt(num, 10);

    if (isNaN(checkpointNum) || checkpointNum % 10 !== 0 || checkpointNum < 10 || checkpointNum > 50) {
      return NextResponse.json({ error: 'Invalid checkpoint number. Must be 10, 20, 30, 40, or 50.' }, { status: 400 });
    }

    const startLesson = checkpointNum - 9;
    const endLesson = checkpointNum;

    const db = getDb();

    // Fetch up to 20 representative items across the 10 lessons of this milestone
    const itemsStmt = db.prepare(`
      SELECT 
        i.*,
        l.lesson_number,
        l.title as lesson_title,
        COALESCE(s.cz_to_target_state, 'new') as cz_to_target_state,
        COALESCE(s.target_to_cz_state, 'new') as target_to_cz_state,
        COALESCE(s.overall_state, 'new') as overall_state
      FROM learning_items i
      JOIN lessons l ON l.id = i.lesson_id
      LEFT JOIN user_item_states s ON s.learning_item_id = i.id AND s.user_id = ?
      WHERE i.course_id = ? AND l.lesson_number BETWEEN ? AND ?
      ORDER BY RANDOM()
      LIMIT 20
    `);
    const rawItems = itemsStmt.all(DEFAULT_USER_ID, id, startLesson, endLesson) as any[];

    const testCards = rawItems.map((item, idx) => {
      // Alternate direction to test both active recall and comprehension
      const resolvedDirection: LearningDirection = idx % 2 === 0 ? 'cz_to_target' : 'target_to_cz';

      return {
        id: item.id,
        item_type: item.item_type,
        lesson_number: item.lesson_number,
        lesson_title: item.lesson_title,
        direction: resolvedDirection,
        prompt: resolvedDirection === 'cz_to_target' ? item.czech_text : item.target_text,
        canonical_answer: resolvedDirection === 'cz_to_target' ? item.target_text : item.czech_text,
        context_note: item.context_note,
        cz_state: item.cz_to_target_state,
        target_state: item.target_to_cz_state,
        overall_state: item.overall_state,
      };
    });

    return NextResponse.json({
      checkpointNumber: checkpointNum,
      milestoneRange: `${startLesson}–${endLesson}`,
      title: `Checkpoint ${checkpointNum / 10}: Lekce ${startLesson}–${endLesson}`,
      items: testCards,
    });
  } catch (error) {
    console.error('Error fetching checkpoint:', error);
    return NextResponse.json({ error: 'Failed to fetch checkpoint' }, { status: 500 });
  }
}
