import { NextRequest, NextResponse } from 'next/server';
import { getDb, DEFAULT_USER_ID } from '@/lib/db';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const db = getDb();

    // Course info
    const courseStmt = db.prepare(`SELECT * FROM courses WHERE id = ? AND user_id = ?`);
    const course = courseStmt.get(id, DEFAULT_USER_ID) as any;

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Mastery breakdown overall
    const overallStatsStmt = db.prepare(`
      SELECT 
        COUNT(*) as total_items,
        SUM(CASE WHEN s.overall_state = 'mastered' THEN 1 ELSE 0 END) as mastered_items,
        SUM(CASE WHEN s.overall_state = 'review' THEN 1 ELSE 0 END) as review_items,
        SUM(CASE WHEN s.overall_state = 'learning' THEN 1 ELSE 0 END) as learning_items,
        SUM(CASE WHEN s.overall_state = 'new' OR s.overall_state IS NULL THEN 1 ELSE 0 END) as new_items,
        -- Active Recall (CZ -> Target)
        SUM(CASE WHEN s.cz_to_target_state = 'mastered' THEN 1 ELSE 0 END) as cz_mastered,
        SUM(CASE WHEN s.cz_to_target_state = 'learning' THEN 1 ELSE 0 END) as cz_learning,
        -- Comprehension (Target -> CZ)
        SUM(CASE WHEN s.target_to_cz_state = 'mastered' THEN 1 ELSE 0 END) as target_mastered,
        SUM(CASE WHEN s.target_to_cz_state = 'learning' THEN 1 ELSE 0 END) as target_learning
      FROM learning_items i
      LEFT JOIN user_item_states s ON s.learning_item_id = i.id AND s.user_id = ?
      WHERE i.course_id = ?
    `);
    const stats = overallStatsStmt.get(DEFAULT_USER_ID, id) as any;

    // Breakdown by type (Words, Phrases, Sentences)
    const typeBreakdownStmt = db.prepare(`
      SELECT 
        i.item_type,
        COUNT(*) as total,
        SUM(CASE WHEN s.overall_state = 'mastered' THEN 1 ELSE 0 END) as mastered
      FROM learning_items i
      LEFT JOIN user_item_states s ON s.learning_item_id = i.id AND s.user_id = ?
      WHERE i.course_id = ?
      GROUP BY i.item_type
    `);
    const typeBreakdown = typeBreakdownStmt.all(DEFAULT_USER_ID, id);

    // Lessons needing attention (highest error rate in recent attempts)
    const weakLessonsStmt = db.prepare(`
      SELECT 
        l.lesson_number,
        l.title,
        COUNT(a.id) as attempts,
        SUM(CASE WHEN a.is_correct = 0 THEN 1 ELSE 0 END) as mistakes
      FROM attempt_logs a
      JOIN learning_items i ON i.id = a.learning_item_id
      JOIN lessons l ON l.id = i.lesson_id
      WHERE a.course_id = ? AND a.user_id = ?
      GROUP BY l.id
      HAVING mistakes > 0
      ORDER BY (CAST(mistakes AS REAL) / attempts) DESC
      LIMIT 3
    `);
    const weakLessons = weakLessonsStmt.all(id, DEFAULT_USER_ID);

    // Total attempts made
    const totalAttemptsStmt = db.prepare(`
      SELECT COUNT(*) as total_attempts, SUM(is_correct) as correct_attempts
      FROM attempt_logs 
      WHERE course_id = ? AND user_id = ?
    `);
    const attemptsSummary = totalAttemptsStmt.get(id, DEFAULT_USER_ID) as any;

    const totalItems = stats?.total_items || 0;
    const masteredItems = stats?.mastered_items || 0;
    const masteryPercent = totalItems > 0 ? Math.round((masteredItems / totalItems) * 100) : 0;

    const czMastered = stats?.cz_mastered || 0;
    const targetMastered = stats?.target_mastered || 0;
    const recallRate = totalItems > 0 ? Math.round((czMastered / totalItems) * 100) : 0;
    const comprehensionRate = totalItems > 0 ? Math.round((targetMastered / totalItems) * 100) : 0;

    // Insight message
    let insightMessage = 'Pokračujte v procvičování pro budování dlouhodobé paměti.';
    if (comprehensionRate > recallRate + 15) {
      insightMessage = 'Tomuto obsahu dobře pasivně rozumíte, ale aktivní produkce (CZ → cizí jazyk) potřebuje intenzivnější trénink.';
    } else if (recallRate >= comprehensionRate && totalItems > 0) {
      insightMessage = 'Vynikající vyváženost mezi aktivním vybavením a porozuměním.';
    }

    return NextResponse.json({
      courseId: id,
      completedLessons: course.completed_lessons_count,
      totalLessons: 50,
      courseCompletionPercent: Math.round((course.completed_lessons_count / 50) * 100),
      masteryPercent,
      activeRecallPercent: recallRate,
      comprehensionPercent: comprehensionRate,
      stats: {
        totalItems,
        mastered: masteredItems,
        review: stats?.review_items || 0,
        learning: stats?.learning_items || 0,
        new: stats?.new_items || 0,
      },
      typeBreakdown,
      weakLessons,
      attemptsSummary: {
        total: attemptsSummary?.total_attempts || 0,
        correct: attemptsSummary?.correct_attempts || 0,
      },
      insightMessage,
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json({ error: 'Failed to fetch progress metrics' }, { status: 500 });
  }
}
