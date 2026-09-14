/**
 * VERBA Client-Side Master Vault & Auto-Sync Engine
 * 
 * Ensures that neither courses nor learning progress (streaks, mastery, attempts)
 * are ever lost across server restarts or redeployments, while fully respecting
 * user deletion of any course (pre-prepared or custom).
 */

import { saveUserDataToCloud, pullUserDataFromCloud } from './firebase';

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

// In-memory cache to eliminate synchronous JSON.parse / localStorage thrashing
let cachedDeletedIds: string[] | null = null;
let cachedOpenedIds: string[] | null = null;
let cachedCustomCourses: any[] | null = null;

export function invalidateStorageCache() {
  cachedDeletedIds = null;
  cachedOpenedIds = null;
  cachedCustomCourses = null;
}

// ==========================================
// 1. DELETED COURSES TRACKING
// ==========================================

export function getDeletedCourseIds(): string[] {
  if (typeof window === 'undefined') return [];
  if (cachedDeletedIds !== null) return cachedDeletedIds;
  try {
    const raw = localStorage.getItem(DELETED_COURSES_KEY);
    const parsed: string[] = raw ? JSON.parse(raw) : [];
    cachedDeletedIds = parsed;
    return parsed;
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
      cachedDeletedIds = deleted;
      localStorage.setItem(DELETED_COURSES_KEY, JSON.stringify(deleted));
    }

    // 2. Remove from opened IDs
    const opened = getOpenedCourseIds().filter((id) => id !== courseId);
    cachedOpenedIds = opened;
    localStorage.setItem(OPENED_COURSES_KEY, JSON.stringify(opened));

    // 3. Remove from custom imported courses
    const custom = getCustomImportedCourses().filter((c) => c.id !== courseId);
    cachedCustomCourses = custom;
    localStorage.setItem(CUSTOM_COURSES_KEY, JSON.stringify(custom));

    // 4. Remove from client vault
    const vault = getClientVault();
    vault.courses = (vault.courses || []).filter((c: any) => c.id !== courseId);
    saveClientVault(vault);

    // 5. If active course was this course, reset active
    if (getLastActiveCourseId() === courseId) {
      if (opened.length > 0) {
        localStorage.setItem(ACTIVE_COURSE_KEY, opened[0]);
      } else {
        localStorage.removeItem(ACTIVE_COURSE_KEY);
      }
    }

    // 6. Sync deletion to Google Cloud Firestore (permanent cloud persistence)
    saveUserDataToCloud({
      deletedCourseIds: deleted,
      courses: vault.courses,
      openedCourseIds: opened,
    }).catch((err) => console.warn('Cloud sync error on delete:', err));
  } catch (e) {
    console.warn('Error marking course as deleted:', e);
  }
}

// ==========================================
// 2. CUSTOM IMPORTED COURSES STORAGE
// ==========================================

export function getCustomImportedCourses(): any[] {
  if (typeof window === 'undefined') return [];
  if (cachedCustomCourses !== null) return cachedCustomCourses;
  try {
    const raw = localStorage.getItem(CUSTOM_COURSES_KEY);
    if (raw) {
      const parsed: any[] = JSON.parse(raw);
      const deletedIds = new Set(getDeletedCourseIds());
      const filtered = parsed.filter((c) => c && c.id && !deletedIds.has(c.id));
      cachedCustomCourses = filtered;
      return filtered;
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
      cachedDeletedIds = filtered;
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
    cachedCustomCourses = custom;
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

    // 5. Sync to Google Cloud Firestore
    saveUserDataToCloud({
      courses: vault.courses,
      deletedCourseIds: getDeletedCourseIds(),
      activeCourseId: courseData.id,
    }).catch((err) => console.warn('Cloud sync error on save course:', err));
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
// 4. OPENED COURSES TRACKING ("MÉ KURZY")
// ==========================================

export function getOpenedCourseIds(): string[] {
  if (typeof window === 'undefined') return DEFAULT_PRESET_COURSES.map((c) => c.id);
  if (cachedOpenedIds !== null) return cachedOpenedIds;
  const deletedIds = new Set(getDeletedCourseIds());

  try {
    const raw = localStorage.getItem(OPENED_COURSES_KEY);
    if (raw !== null) {
      const list: string[] = JSON.parse(raw);
      if (Array.isArray(list)) {
        const filtered = list.filter((id) => !deletedIds.has(id));
        cachedOpenedIds = filtered;
        return filtered;
      }
    }
  } catch {
    // Fall through to default setup
  }

  // Initial default: all non-deleted preset courses are opened initially
  const defaults = DEFAULT_PRESET_COURSES.map((c) => c.id).filter((id) => !deletedIds.has(id));
  cachedOpenedIds = defaults;
  if (typeof window !== 'undefined') {
    localStorage.setItem(OPENED_COURSES_KEY, JSON.stringify(defaults));
  }
  return defaults;
}

export function markCourseAsOpened(courseId: string, fullCourseData?: any) {
  if (typeof window === 'undefined' || !courseId) return;
  const deletedIds = new Set(getDeletedCourseIds());
  if (deletedIds.has(courseId)) return;

  try {
    const currentActive = localStorage.getItem(ACTIVE_COURSE_KEY);
    const opened = getOpenedCourseIds();

    const needsOpenedUpdate = opened[0] !== courseId || !opened.includes(courseId);
    const needsActiveUpdate = currentActive !== courseId;

    if (needsActiveUpdate) {
      localStorage.setItem(ACTIVE_COURSE_KEY, courseId);
    }

    if (needsOpenedUpdate) {
      const updatedOpened = opened.filter((id) => id !== courseId);
      updatedOpened.unshift(courseId);
      cachedOpenedIds = updatedOpened;
      localStorage.setItem(OPENED_COURSES_KEY, JSON.stringify(updatedOpened));
    }

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
 * Closes course from "Mé kurzy" (does NOT delete from DB or catalog)
 */
export function markCourseAsClosed(courseId: string): string[] {
  if (typeof window === 'undefined' || !courseId) return [];

  try {
    const opened = getOpenedCourseIds().filter((id) => id !== courseId);
    cachedOpenedIds = opened;
    localStorage.setItem(OPENED_COURSES_KEY, JSON.stringify(opened));

    // If active course was closed, switch active to the next remaining course
    if (getLastActiveCourseId() === courseId) {
      if (opened.length > 0) {
        localStorage.setItem(ACTIVE_COURSE_KEY, opened[0]);
      } else {
        localStorage.removeItem(ACTIVE_COURSE_KEY);
      }
    }

    // Dispatch update notification
    window.dispatchEvent(new Event('courses-updated'));
    return opened;
  } catch (e) {
    console.warn('Error marking course as closed:', e);
    return [];
  }
}

/**
 * Returns only the courses that the user currently has open in "Mé kurzy"
 */
export function getOpenedCourses(allMergedCourses?: any[]): any[] {
  const all = allMergedCourses || getAllMergedCourses();
  const openedIds = getOpenedCourseIds();

  const ordered: any[] = [];
  for (const id of openedIds) {
    const found = all.find((c) => c.id === id);
    if (found) ordered.push(found);
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

    // Sync state to Google Cloud Firestore (permanent cloud progress)
    saveUserDataToCloud({ states: vault.states }).catch((err) =>
      console.warn('Cloud sync error on state:', err)
    );
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

    // 1. CLOUD PULL: Check Google Cloud Firestore for courses or progress from other devices / previous sessions
    try {
      const cloudData = await pullUserDataFromCloud();
      if (cloudData) {
        // Merge cloud deleted IDs
        if (Array.isArray(cloudData.deletedCourseIds)) {
          const localDeleted = new Set(getDeletedCourseIds());
          cloudData.deletedCourseIds.forEach((id: string) => localDeleted.add(id));
          localStorage.setItem(DELETED_COURSES_KEY, JSON.stringify(Array.from(localDeleted)));
        }

        // Merge cloud courses
        if (Array.isArray(cloudData.courses)) {
          const localDeleted = new Set(getDeletedCourseIds());
          const existingMap = new Map((vault.courses || []).map((c: any) => [c.id, c]));
          for (const cc of cloudData.courses) {
            if (cc && cc.id && !localDeleted.has(cc.id)) {
              if (!existingMap.has(cc.id)) {
                vault.courses.push(cc);
              } else {
                existingMap.set(cc.id, { ...existingMap.get(cc.id), ...cc });
              }
            }
          }
          saveClientVault(vault);
        }

        // Merge cloud states
        if (Array.isArray(cloudData.states) && cloudData.states.length > 0) {
          const stateMap = new Map((vault.states || []).map((s: any) => [s.learning_item_id, s]));
          for (const cs of cloudData.states) {
            if (cs && cs.learning_item_id && !stateMap.has(cs.learning_item_id)) {
              vault.states.push(cs);
            }
          }
          saveClientVault(vault);
        }
      }
    } catch (cloudErr) {
      console.warn('Cloud pull error during sync:', cloudErr);
    }

    // 2. SERVER SYNC: Sync with local or hosted backend if reachable
    const courseMap = new Map<string, any>();
    const currentDeleted = new Set(getDeletedCourseIds());
    for (const c of vault.courses || []) {
      if (c && c.id && !currentDeleted.has(c.id)) courseMap.set(c.id, c);
    }
    for (const cc of customCourses) {
      if (cc && cc.id && !currentDeleted.has(cc.id)) courseMap.set(cc.id, { ...courseMap.get(cc.id), ...cc });
    }

    let restoredCount = 0;
    let mergedCount = 0;

    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      try {
        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientCourses: Array.from(courseMap.values()),
            clientStates: vault.states || [],
            clientLogs: vault.attemptLogs || [],
            clientDeletedIds: Array.from(currentDeleted),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            if (Array.isArray(data.deletedCourseIds)) {
              const localDel = new Set(getDeletedCourseIds());
              data.deletedCourseIds.forEach((id: string) => localDel.add(id));
              localStorage.setItem(DELETED_COURSES_KEY, JSON.stringify(Array.from(localDel)));
            }

            if (Array.isArray(data.courses) && data.courses.length > 0) {
              const currentV = getClientVault();
              const curDel = new Set(getDeletedCourseIds());
              const mergedCourses = data.courses
                .filter((sc: any) => !curDel.has(sc.id))
                .map((sc: any) => {
                  const localMatch = currentV.courses.find((lc: any) => lc.id === sc.id);
                  return localMatch ? { ...sc, ...localMatch } : sc;
                });

              saveClientVault({
                courses: mergedCourses,
                states: data.states || currentV.states,
              });
            }

            restoredCount = data.restoredCourses || 0;
            mergedCount = data.mergedStates || 0;
          }
        }
      } catch (serverErr) {
        // Operating in cloud/static mode
      }
    }

    // 3. CLOUD PUSH: Ensure Google Cloud Firestore has the latest unified snapshot
    const finalVault = getClientVault();
    saveUserDataToCloud({
      courses: finalVault.courses,
      states: finalVault.states,
      deletedCourseIds: Array.from(getDeletedCourseIds()),
      activeCourseId: getLastActiveCourseId() || undefined,
      openedCourseIds: getOpenedCourseIds(),
    }).catch((err) => console.warn('Cloud sync error on push:', err));

    return {
      restoredCourses: restoredCount,
      mergedStates: mergedCount,
    };
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
