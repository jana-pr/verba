/**
 * Client-Side Persistence and Auto-Recovery for VERBA
 * Prevents loss of generated and in-progress courses across deployments.
 */

export interface CachedCourseSnapshot {
  courseId: string;
  domainArea: string;
  completedLessons: number;
  lastUpdated: string;
  fullData?: any;
}

const STORAGE_KEY = 'verba_cached_courses';

export function saveCourseToLocal(course: any, fullData?: any) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: CachedCourseSnapshot[] = raw ? JSON.parse(raw) : [];

    const existingIdx = list.findIndex((c) => c.courseId === course.id);
    const snapshot: CachedCourseSnapshot = {
      courseId: course.id,
      domainArea: course.domain_area,
      completedLessons: course.completed_lessons_count || 0,
      lastUpdated: new Date().toISOString(),
      fullData: fullData || list[existingIdx]?.fullData,
    };

    if (existingIdx >= 0) {
      list[existingIdx] = snapshot;
    } else {
      list.push(snapshot);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Failed to cache course to localStorage:', err);
  }
}

export async function syncAndRestoreMissingCourses(serverCourses: any[]): Promise<number> {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;

    const localList: CachedCourseSnapshot[] = JSON.parse(raw);
    const serverIds = new Set(serverCourses.map((c) => c.id));

    let restoredCount = 0;

    for (const local of localList) {
      if (!serverIds.has(local.courseId) && local.fullData) {
        console.log(`Detected missing course "${local.domainArea}" on server. Auto-restoring...`);
        try {
          const res = await fetch('/api/courses/backup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(local.fullData),
          });
          if (res.ok) {
            restoredCount++;
          }
        } catch (postErr) {
          console.error('Failed to auto-restore course:', postErr);
        }
      }
    }

    return restoredCount;
  } catch (err) {
    console.warn('Error during syncAndRestoreMissingCourses:', err);
    return 0;
  }
}
