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

    // Sync to seed-courses.json
    try {
      const path = await import('node:path');
      const fs = await import('node:fs');
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
      console.warn('Could not update seed-courses.json on delete:', seedErr);
    }

    return NextResponse.json({
      success: true,
      message: `Kurz „${course.domain_area}“ byl úspěšně smazán.`,
    });
  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
  }
}

