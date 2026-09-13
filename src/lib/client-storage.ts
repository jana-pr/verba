/**
 * VERBA Client-Side Master Vault & Auto-Sync Engine
 * 
 * Ensures that neither courses nor learning progress (streaks, mastery, attempts)
 * are ever lost across server restarts or redeployments, while fully respecting
 * user deletion of any course (pre-prepared or custom).
 */

const VAULT_KEY = 'verba_master_vault';
const OPENED_COURSES_KEY = 'verba_opened_course_ids';
const ACTIVE_COURSE_KEY = 'verba_last_active_course_id';
const DELETED_COURSES_KEY = 'verba_deleted_course_ids';
const CUSTOM_COURSES_KEY = 'verba_custom_imported_courses';

export interface ClientVault {
  version: string;
  lastUpdated: string;
  courses: any[];
  states: any[];
  attemptLogs: any[];
}

export const DEFAULT_PRESET_COURSES: any[] = [
  {
    id: 'crs_business_analyza_b2',
    user_id: 'usr_jana_default',
    target_language: 'en',
    native_language: 'cs',
    cefr_level: 'B2',
    domain_area: 'Business analýza',
    status: 'ready',
    total_lessons: 50,
    completed_lessons_count: 50,
    created_at: '2026-09-13T10:50:48.879Z',
    updated_at: '2026-09-13T10:50:48.879Z',
  },
  {
    id: 'crs_project_management_b2',
    user_id: 'usr_jana_default',
    target_language: 'en',
    native_language: 'cs',
    cefr_level: 'B2',
    domain_area: 'Project Management',
    status: 'ready',
    total_lessons: 50,
    completed_lessons_count: 50,
    created_at: '2026-09-13T10:50:48.879Z',
    updated_at: '2026-09-13T10:50:48.879Z',
  },
  {
    id: 'crs_product_management_b2',
    user_id: 'usr_jana_default',
    target_language: 'en',
    native_language: 'cs',
    cefr_level: 'B2',
    domain_area: 'Product Management',
    status: 'ready',
    total_lessons: 50,
    completed_lessons_count: 50,
    created_at: '2026-09-13T10:50:48.879Z',
    updated_at: '2026-09-13T10:50:48.879Z',
  },
  {
    id: 'crs_software_engineering_b2',
    user_id: 'usr_jana_default',
    target_language: 'en',
    native_language: 'cs',
    cefr_level: 'B2',
    domain_area: 'Software Engineering',
    status: 'ready',
    total_lessons: 50,
    completed_lessons_count: 50,
    created_at: '2026-09-13T10:50:48.879Z',
    updated_at: '2026-09-13T10:50:48.879Z',
  },
];

// ==========================================
// 1. DELETED COURSES TRACKING
// ==========================================

export function getDeletedCourseIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DELETED_COURSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markCourseAsDeleted(courseId: string) {
  if (typeof window === 'undefined' || !courseId) return;
  try {
    // 1. Add to deleted IDs
    const deleted = getDeletedCourseIds();
    if (!deleted.includes(courseId)) {
      deleted.push(courseId);
      localStorage.setItem(DELETED_COURSES_KEY, JSON.stringify(deleted));
    }

    // 2. Remove from opened IDs
    const rawOpened = localStorage.getItem(OPENED_COURSES_KEY);
    if (rawOpened) {
      const opened: string[] = JSON.parse(rawOpened);
      const filtered = opened.filter((id) => id !== courseId);
      localStorage.setItem(OPENED_COURSES_KEY, JSON.stringify(filtered));
    }

    // 3. Remove from custom imported courses
    const rawCustom = localStorage.getItem(CUSTOM_COURSES_KEY);
    if (rawCustom) {
      const custom: any[] = JSON.parse(rawCustom);
      const filtered = custom.filter((c) => c.id !== courseId);
      localStorage.setItem(CUSTOM_COURSES_KEY, JSON.stringify(filtered));
    }

    // 4. Remove from client vault
    const vault = getClientVault();
    vault.courses = (vault.courses || []).filter((c: any) => c.id !== courseId);
    saveClientVault(vault);

    // 5. If active course was this course, reset active
    if (getLastActiveCourseId() === courseId) {
      const remainingOpened = getOpenedCourseIds();
      if (remainingOpened.length > 0) {
        localStorage.setItem(ACTIVE_COURSE_KEY, remainingOpened[0]);
      } else {
        localStorage.removeItem(ACTIVE_COURSE_KEY);
      }
    }
  } catch (e) {
    console.warn('Error marking course as deleted:', e);
  }
}

// ==========================================
// 2. CUSTOM IMPORTED COURSES STORAGE
// ==========================================

export function getCustomImportedCourses(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_COURSES_KEY);
    if (raw) {
      const parsed: any[] = JSON.parse(raw);
      const deletedIds = new Set(getDeletedCourseIds());
      return parsed.filter((c) => c && c.id && !deletedIds.has(c.id));
    }
  } catch (e) {
    console.warn('Error reading custom imported courses:', e);
  }
  return [];
}

export function saveImportedCourseToStorage(courseData: any) {
  if (typeof window === 'undefined' || !courseData?.id) return;
  try {
    // 1. Remove from deleted IDs if it was previously deleted
    const deleted = getDeletedCourseIds();
    if (deleted.includes(courseData.id)) {
      const filtered = deleted.filter((id) => id !== courseData.id);
      localStorage.setItem(DELETED_COURSES_KEY, JSON.stringify(filtered));
    }

    // 2. Save into custom courses backup
    const custom = getCustomImportedCourses();
    const existingIdx = custom.findIndex((c) => c.id === courseData.id);
    if (existingIdx >= 0) {
      custom[existingIdx] = { ...custom[existingIdx], ...courseData };
    } else {
      custom.unshift(courseData);
    }
    localStorage.setItem(CUSTOM_COURSES_KEY, JSON.stringify(custom));

    // 3. Save into client vault
    const vault = getClientVault();
    const vIdx = vault.courses.findIndex((c: any) => c.id === courseData.id);
    if (vIdx >= 0) {
      vault.courses[vIdx] = { ...vault.courses[vIdx], ...courseData };
    } else {
      vault.courses.unshift(courseData);
    }
    saveClientVault(vault);

    // 4. Mark as opened and set active
    markCourseAsOpened(courseData.id, courseData);
  } catch (e) {
    console.warn('Error saving imported course to storage:', e);
  }
}

// ==========================================
// 3. CLIENT VAULT & MERGED COURSES
// ==========================================

export function getClientVault(): ClientVault {
  if (typeof window === 'undefined') {
    return { version: '1.2', lastUpdated: '', courses: DEFAULT_PRESET_COURSES, states: [], attemptLogs: [] };
  }
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    const deletedIds = new Set(getDeletedCourseIds());

    if (raw) {
      const parsed = JSON.parse(raw);
      const filteredCourses = (parsed.courses || []).filter((c: any) => c && c.id && !deletedIds.has(c.id));
      return {
        ...parsed,
        courses: filteredCourses,
      };
    }
  } catch (e) {
    console.warn('Error reading client vault:', e);
  }
  return { version: '1.2', lastUpdated: '', courses: DEFAULT_PRESET_COURSES, states: [], attemptLogs: [] };
}

export function saveClientVault(vault: Partial<ClientVault>) {
  if (typeof window === 'undefined') return;
  try {
    const current = getClientVault();
    const deletedIds = new Set(getDeletedCourseIds());
    const coursesToSave = (vault.courses || current.courses || []).filter(
      (c: any) => c && c.id && !deletedIds.has(c.id)
    );

    const updated: ClientVault = {
      version: '1.2',
      lastUpdated: new Date().toISOString(),
      courses: coursesToSave,
      states: vault.states || current.states || [],
      attemptLogs: vault.attemptLogs || current.attemptLogs || [],
    };
    localStorage.setItem(VAULT_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Error saving client vault:', e);
  }
}

/**
 * Returns ALL non-deleted courses (presets + custom imported + server + vault)
 */
export function getAllMergedCourses(serverCourses: any[] = []): any[] {
  const deletedIds = new Set(getDeletedCourseIds());
  const map = new Map<string, any>();

  // 1. Preset defaults (if not deleted)
  for (const c of DEFAULT_PRESET_COURSES) {
    if (!deletedIds.has(c.id)) {
      map.set(c.id, c);
    }
  }

  // 2. Custom imported courses
  for (const c of getCustomImportedCourses()) {
    if (!deletedIds.has(c.id)) {
      map.set(c.id, { ...map.get(c.id), ...c });
    }
  }

  // 3. Client vault
  const vault = getClientVault();
  for (const vc of vault.courses || []) {
    if (vc && vc.id && !deletedIds.has(vc.id)) {
      map.set(vc.id, { ...map.get(vc.id), ...vc });
    }
  }

  // 4. Server courses
  for (const sc of serverCourses) {
    if (sc && sc.id && !deletedIds.has(sc.id)) {
      map.set(sc.id, { ...map.get(sc.id), ...sc });
    }
  }

  return Array.from(map.values());
}

// ==========================================
// 4. OPENED COURSES TRACKING
// ==========================================

export function getOpenedCourseIds(): string[] {
  if (typeof window === 'undefined') return DEFAULT_PRESET_COURSES.map((c) => c.id);
  const deletedIds = new Set(getDeletedCourseIds());

  try {
    const raw = localStorage.getItem(OPENED_COURSES_KEY);
    if (raw) {
      const list: string[] = JSON.parse(raw);
      const clean = list.filter((id) => !deletedIds.has(id));
      if (clean.length > 0) return clean;
    }
  } catch {
    // Fall through to defaults
  }

  // Default initial set of opened courses: all non-deleted presets
  const defaults = DEFAULT_PRESET_COURSES.map((c) => c.id).filter((id) => !deletedIds.has(id));
  if (typeof window !== 'undefined' && defaults.length > 0) {
    localStorage.setItem(OPENED_COURSES_KEY, JSON.stringify(defaults));
  }
  return defaults;
}

export function markCourseAsOpened(courseId: string, fullCourseData?: any) {
  if (typeof window === 'undefined' || !courseId) return;
  const deletedIds = new Set(getDeletedCourseIds());
  if (deletedIds.has(courseId)) return;

  try {
    // 1. Remember last active course
    localStorage.setItem(ACTIVE_COURSE_KEY, courseId);

    // 2. Track opened courses list (keep current course at the top)
    const opened = getOpenedCourseIds().filter((id) => id !== courseId);
    opened.unshift(courseId);
    localStorage.setItem(OPENED_COURSES_KEY, JSON.stringify(opened));

    // 3. Cache course in vault if full data is provided
    if (fullCourseData) {
      const vault = getClientVault();
      const existingIdx = vault.courses.findIndex((c: any) => c.id === courseId);
      if (existingIdx >= 0) {
        vault.courses[existingIdx] = { ...vault.courses[existingIdx], ...fullCourseData };
      } else {
        vault.courses.unshift(fullCourseData);
      }
      saveClientVault(vault);
    }
  } catch (e) {
    console.warn('Error marking course as opened:', e);
  }
}

/**
 * Returns only the courses that the user has explicitly opened or has active
 */
export function getOpenedCourses(allMergedCourses?: any[]): any[] {
  const all = allMergedCourses || getAllMergedCourses();
  const openedIds = getOpenedCourseIds();

  // Return courses ordered as in openedIds
  const ordered: any[] = [];
  for (const id of openedIds) {
    const found = all.find((c) => c.id === id);
    if (found) ordered.push(found);
  }

  // If none matched, fallback to all available non-deleted courses
  if (ordered.length === 0) {
    return all;
  }

  return ordered;
}

export function getLastActiveCourseId(): string | null {
  if (typeof window === 'undefined') return null;
  const active = localStorage.getItem(ACTIVE_COURSE_KEY);
  const deletedIds = new Set(getDeletedCourseIds());
  if (active && !deletedIds.has(active)) {
    return active;
  }
  const opened = getOpenedCourseIds();
  return opened.length > 0 ? opened[0] : null;
}

// ==========================================
// 5. PROGRESS & BIDIRECTIONAL AUTO-SYNC
// ==========================================

export function recordStateProgress(updatedState: any) {
  if (typeof window === 'undefined' || !updatedState?.learning_item_id) return;
  try {
    const vault = getClientVault();
    const existingIdx = vault.states.findIndex(
      (s: any) => s.learning_item_id === updatedState.learning_item_id
    );

    if (existingIdx >= 0) {
      vault.states[existingIdx] = { ...vault.states[existingIdx], ...updatedState };
    } else {
      vault.states.push(updatedState);
    }
    saveClientVault(vault);
  } catch (e) {
    console.warn('Error recording state progress:', e);
  }
}

export async function performAutoSync(): Promise<{ restoredCourses: number; mergedStates: number } | null> {
  if (typeof window === 'undefined') return null;

  try {
    const vault = getClientVault();
    const customCourses = getCustomImportedCourses();
    const deletedIds = getDeletedCourseIds();

    // Ensure all custom courses are included in sync payload
    const courseMap = new Map<string, any>();
    for (const c of vault.courses || []) {
      if (c && c.id && !deletedIds.includes(c.id)) courseMap.set(c.id, c);
    }
    for (const cc of customCourses) {
      if (cc && cc.id && !deletedIds.includes(cc.id)) courseMap.set(cc.id, { ...courseMap.get(cc.id), ...cc });
    }

    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientCourses: Array.from(courseMap.values()),
        clientStates: vault.states || [],
        clientLogs: vault.attemptLogs || [],
        clientDeletedIds: deletedIds,
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data.success) {
      // 1. Sync deleted course IDs from server
      if (Array.isArray(data.deletedCourseIds)) {
        const localDeleted = new Set(getDeletedCourseIds());
        data.deletedCourseIds.forEach((id: string) => localDeleted.add(id));
        localStorage.setItem(DELETED_COURSES_KEY, JSON.stringify(Array.from(localDeleted)));
      }

      // 2. Update local vault with authoritative server state
      if (Array.isArray(data.courses) && data.courses.length > 0) {
        const currentVault = getClientVault();
        const currentDeleted = new Set(getDeletedCourseIds());

        const mergedCourses = data.courses
          .filter((sc: any) => !currentDeleted.has(sc.id))
          .map((sc: any) => {
            const localMatch = currentVault.courses.find((lc: any) => lc.id === sc.id);
            return localMatch ? { ...sc, ...localMatch } : sc;
          });

        saveClientVault({
          courses: mergedCourses,
          states: data.states || currentVault.states,
        });
      }

      return {
        restoredCourses: data.restoredCourses || 0,
        mergedStates: data.mergedStates || 0,
      };
    }
  } catch (e) {
    console.warn('AutoSync error:', e);
  }

  return null;
}

// Backward compatibility helpers
export function saveCourseToLocal(course: any, fullData?: any) {
  markCourseAsOpened(course.id, fullData || course);
}

export async function syncAndRestoreMissingCourses(serverCourses: any[]): Promise<number> {
  const result = await performAutoSync();
  return result?.restoredCourses || 0;
}
