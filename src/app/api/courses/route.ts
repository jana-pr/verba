import { NextRequest, NextResponse } from 'next/server';
import { getDb, DEFAULT_USER_ID } from '@/lib/db';
import { generateCurriculumOutline } from '@/lib/ai/course-generator';
import crypto from 'node:crypto';

export async function GET() {
  try {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM courses 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `);
    const courses = stmt.all(DEFAULT_USER_ID);
    return NextResponse.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      target_language = 'en',
      cefr_level = 'B2',
      domain_area = 'Project Management',
    } = body;

    if (!domain_area.trim()) {
      return NextResponse.json({ error: 'Domain area is required' }, { status: 400 });
    }

    const db = getDb();
    const courseId = `crs_${crypto.randomUUID()}`;
    const outlineId = `out_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    // 1. Generate 50-lesson curriculum outline via AI generator
    const outlineLessons = await generateCurriculumOutline(target_language, cefr_level, domain_area);

    // 2. Transactionally save course concept (status: outline_pending) and outline
    db.exec('BEGIN TRANSACTION;');
    try {
      const insertCourse = db.prepare(`
        INSERT INTO courses (
          id, user_id, target_language, native_language, cefr_level, 
          domain_area, status, total_lessons, completed_lessons_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'outline_pending', 50, 0, ?, ?)
      `);
      insertCourse.run(
        courseId,
        DEFAULT_USER_ID,
        target_language.toLowerCase(),
        'cs',
        cefr_level.toUpperCase(),
        domain_area.trim(),
        now,
        now
      );

      const insertOutline = db.prepare(`
        INSERT INTO curriculum_outlines (
          id, course_id, outline_json, is_approved, created_at
        ) VALUES (?, ?, ?, 0, ?)
      `);
      insertOutline.run(
        outlineId,
        courseId,
        JSON.stringify(outlineLessons),
        now
      );

      db.exec('COMMIT;');
    } catch (txError) {
      db.exec('ROLLBACK;');
      throw txError;
    }

    return NextResponse.json({
      courseId,
      status: 'outline_pending',
      outline: outlineLessons,
    });
  } catch (error) {
    console.error('Error creating course outline:', error);
    return NextResponse.json({ error: 'Failed to generate course outline' }, { status: 500 });
  }
}
