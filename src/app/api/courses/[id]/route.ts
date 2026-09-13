import { NextRequest, NextResponse } from 'next/server';
import { getDb, DEFAULT_USER_ID } from '@/lib/db';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const db = getDb();

    // Verify course belongs to user
    const courseStmt = db.prepare(`
      SELECT * FROM courses 
      WHERE id = ? AND user_id = ?
    `);
    const course = courseStmt.get(id, DEFAULT_USER_ID) as any;

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Get curriculum outline
    const outlineStmt = db.prepare(`
      SELECT * FROM curriculum_outlines 
      WHERE course_id = ?
    `);
    const outlineRow = outlineStmt.get(id) as any;
    let outline = [];
    if (outlineRow?.outline_json) {
      try {
        outline = JSON.parse(outlineRow.outline_json);
      } catch (e) {
        console.error('Error parsing outline json:', e);
      }
    }

    // Get generated lessons
    const lessonsStmt = db.prepare(`
      SELECT id, lesson_number, title, theme_focus, status, created_at 
      FROM lessons 
      WHERE course_id = ? 
      ORDER BY lesson_number ASC
    `);
    const lessons = lessonsStmt.all(id);

    return NextResponse.json({
      course,
      outline,
      is_approved: outlineRow ? Boolean(outlineRow.is_approved) : false,
      lessons,
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    return NextResponse.json({ error: 'Failed to fetch course details' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const db = getDb();

    // Verify ownership
    const courseStmt = db.prepare(`
      SELECT id, domain_area FROM courses 
      WHERE id = ? AND user_id = ?
    `);
    const course = courseStmt.get(id, DEFAULT_USER_ID) as any;

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Cascade delete course and all child records
    db.exec('PRAGMA foreign_keys = ON;');
    db.prepare('DELETE FROM courses WHERE id = ? AND user_id = ?').run(id, DEFAULT_USER_ID);

    return NextResponse.json({
      success: true,
      message: `Kurz „${course.domain_area}“ byl úspěšně smazán.`,
    });
  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
  }
}

