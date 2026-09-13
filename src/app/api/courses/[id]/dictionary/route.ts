import { NextRequest, NextResponse } from 'next/server';
import { getDb, DEFAULT_USER_ID } from '@/lib/db';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(req.url);

    const filter = searchParams.get('filter') || 'all'; // all | learning | review | mastered
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || ''; // word | expression | phrase | sentence

    const db = getDb();

    let query = `
      SELECT 
        i.*,
        l.lesson_number,
        l.title as lesson_title,
        COALESCE(s.cz_to_target_state, 'new') as cz_to_target_state,
        COALESCE(s.target_to_cz_state, 'new') as target_to_cz_state,
        COALESCE(s.overall_state, 'new') as overall_state
      FROM learning_items i
      JOIN lessons l ON l.id = i.lesson_id
      LEFT JOIN user_item_states s 
        ON s.learning_item_id = i.id AND s.user_id = ?
      WHERE i.course_id = ?
    `;
    const params: any[] = [DEFAULT_USER_ID, id];

    if (filter !== 'all') {
      query += ` AND s.overall_state = ?`;
      params.push(filter);
    }

    if (type) {
      query += ` AND i.item_type = ?`;
      params.push(type);
    }

    if (search.trim()) {
      query += ` AND (i.target_text LIKE ? OR i.czech_text LIKE ? OR i.context_note LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY l.lesson_number ASC, i.target_text ASC`;

    const items = db.prepare(query).all(...params);

    // Summary counts for filter tabs
    const countsStmt = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN s.overall_state = 'learning' THEN 1 ELSE 0 END) as learning_count,
        SUM(CASE WHEN s.overall_state = 'review' THEN 1 ELSE 0 END) as review_count,
        SUM(CASE WHEN s.overall_state = 'mastered' THEN 1 ELSE 0 END) as mastered_count,
        SUM(CASE WHEN s.overall_state = 'new' OR s.overall_state IS NULL THEN 1 ELSE 0 END) as new_count
      FROM learning_items i
      LEFT JOIN user_item_states s ON s.learning_item_id = i.id AND s.user_id = ?
      WHERE i.course_id = ?
    `);
    const counts = countsStmt.get(DEFAULT_USER_ID, id) as any;

    return NextResponse.json({
      items,
      counts: {
        all: counts?.total || 0,
        learning: counts?.learning_count || 0,
        review: counts?.review_count || 0,
        mastered: counts?.mastered_count || 0,
        new: counts?.new_count || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching dictionary:', error);
    return NextResponse.json({ error: 'Failed to fetch dictionary items' }, { status: 500 });
  }
}
