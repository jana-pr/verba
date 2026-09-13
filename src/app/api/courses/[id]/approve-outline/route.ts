import { NextRequest, NextResponse } from 'next/server';
import { getDb, DEFAULT_USER_ID } from '@/lib/db';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const db = getDb();
    const now = new Date().toISOString();

    // Verify ownership
    const courseStmt = db.prepare(`SELECT * FROM courses WHERE id = ? AND user_id = ?`);
    const course = courseStmt.get(id, DEFAULT_USER_ID) as any;

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    db.exec('BEGIN TRANSACTION;');
    try {
      // 1. Mark outline as approved
      const approveOutline = db.prepare(`
        UPDATE curriculum_outlines 
        SET is_approved = 1, approved_at = ?
        WHERE course_id = ?
      `);
      approveOutline.run(now, id);

      // 2. Set course status to generating
      const updateCourse = db.prepare(`
        UPDATE courses 
        SET status = 'generating', updated_at = ?
        WHERE id = ?
      `);
      updateCourse.run(now, id);

      db.exec('COMMIT;');
    } catch (txError) {
      db.exec('ROLLBACK;');
      throw txError;
    }

    return NextResponse.json({
      success: true,
      message: 'Curriculum outline approved. Ready to generate lessons.',
      status: 'generating',
    });
  } catch (error) {
    console.error('Error approving outline:', error);
    return NextResponse.json({ error: 'Failed to approve outline' }, { status: 500 });
  }
}
