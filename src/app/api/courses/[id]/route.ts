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

    // 1. Record in deleted_courses table unconditionally so it is NEVER seeded or resurrected
    db.prepare(`
      INSERT OR REPLACE INTO deleted_courses (course_id, deleted_at)
      VALUES (?, ?)
    `).run(id, new Date().toISOString());

    // 2. Cascade delete course and all child records if it exists in SQLite
    db.exec('PRAGMA foreign_keys = ON;');
    db.prepare('DELETE FROM courses WHERE id = ?').run(id);

    // 3. Remove deleted course from seed-courses.json
    try {
      const path = await import('node:path');
      const fs = await import('node:fs');
      const seedPath = path.join(process.cwd(), 'data', 'seed-courses.json');
      if (fs.existsSync(seedPath)) {
        const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
        if (Array.isArray(seedData.courses)) {
          seedData.courses = seedData.courses.filter((c: any) => c.id !== id);
          if (Array.isArray(seedData.outlines)) seedData.outlines = seedData.outlines.filter((o: any) => o.course_id !== id);
          if (Array.isArray(seedData.lessons)) seedData.lessons = seedData.lessons.filter((l: any) => l.course_id !== id);
          if (Array.isArray(seedData.items)) seedData.items = seedData.items.filter((it: any) => it.course_id !== id);
          if (Array.isArray(seedData.states)) seedData.states = seedData.states.filter((st: any) => st.course_id !== id);
          if (Array.isArray(seedData.exercises)) seedData.exercises = seedData.exercises.filter((ex: any) => ex.course_id !== id);
          if (Array.isArray(seedData.articles)) seedData.articles = seedData.articles.filter((ar: any) => ar.course_id !== id);
          fs.writeFileSync(seedPath, JSON.stringify(seedData, null, 2), 'utf-8');
        }
      }
    } catch (seedErr) {
      console.warn('Could not update seed-courses.json on delete:', seedErr);
    }

    return NextResponse.json({
      success: true,
      courseId: id,
      message: 'Kurz byl úspěšně trvale smazán.',
    });
  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
  }
}

