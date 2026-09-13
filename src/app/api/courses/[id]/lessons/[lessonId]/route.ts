import { NextRequest, NextResponse } from 'next/server';
import { getDb, DEFAULT_USER_ID } from '@/lib/db';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    const { id, lessonId } = await context.params;
    const db = getDb();

    // Verify lesson belongs to course
    const lessonStmt = db.prepare(`
      SELECT * FROM lessons 
      WHERE (id = ? OR lesson_number = ?) AND course_id = ?
    `);
    const lesson = lessonStmt.get(lessonId, isNaN(Number(lessonId)) ? -1 : Number(lessonId), id) as any;

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Get items with directional mastery states
    const itemsStmt = db.prepare(`
      SELECT 
        i.*,
        COALESCE(s.cz_to_target_state, 'new') as cz_to_target_state,
        COALESCE(s.cz_to_target_streak, 0) as cz_to_target_streak,
        COALESCE(s.target_to_cz_state, 'new') as target_to_cz_state,
        COALESCE(s.target_to_cz_streak, 0) as target_to_cz_streak,
        COALESCE(s.overall_state, 'new') as overall_state
      FROM learning_items i
      LEFT JOIN user_item_states s 
        ON s.learning_item_id = i.id AND s.user_id = ?
      WHERE i.lesson_id = ?
      ORDER BY i.rowid ASC
    `);
    const items = itemsStmt.all(DEFAULT_USER_ID, lesson.id);

    // Get exercises
    const exercisesStmt = db.prepare(`
      SELECT * FROM lesson_exercises 
      WHERE lesson_id = ?
      ORDER BY rowid ASC
    `);
    const exercisesRaw = exercisesStmt.all(lesson.id) as any[];
    const exercises = exercisesRaw.map((ex) => ({
      ...ex,
      options: ex.options_json ? JSON.parse(ex.options_json) : null,
      acceptable_synonyms: ex.acceptable_synonyms_json ? JSON.parse(ex.acceptable_synonyms_json) : [],
    }));

    // Get transfer article
    const transferStmt = db.prepare(`
      SELECT * FROM transfer_articles 
      WHERE lesson_id = ?
    `);
    const transferRow = transferStmt.get(lesson.id) as any;
    const transferArticle = transferRow
      ? {
          ...transferRow,
          questions: JSON.parse(transferRow.questions_json),
        }
      : null;

    return NextResponse.json({
      lesson,
      items,
      exercises,
      transferArticle,
    });
  } catch (error) {
    console.error('Error fetching lesson detail:', error);
    return NextResponse.json({ error: 'Failed to fetch lesson' }, { status: 500 });
  }
}
