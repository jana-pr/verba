/**
 * VERBA Client-Side Master Vault & Auto-Sync Engine
 * 
 * Ensures that neither courses nor learning progress (streaks, mastery, attempts)
 * are ever lost or overwritten when a new version of the app is deployed or restarted.
 */

const VAULT_KEY = 'verba_master_vault';
const OPENED_COURSES_KEY = 'verba_opened_course_ids';
const ACTIVE_COURSE_KEY = 'verba_last_active_course_id';

export interface ClientVault {
  version: string;
  lastUpdated: string;
  courses: any[];
  states: any[];
  attemptLogs: any[];
}

export function getClientVault(): ClientVault {
  if (typeof window === 'undefined') {
    return { version: '1.2', lastUpdated: '', courses: [], states: [], attemptLogs: [] };
  }
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading client vault:', e);
  }
  return { version: '1.2', lastUpdated: '', courses: [], states: [], attemptLogs: [] };
}

export function saveClientVault(vault: Partial<ClientVault>) {
  if (typeof window === 'undefined') return;
  try {
    const current = getClientVault();
    const updated: ClientVault = {
      version: '1.2',
      lastUpdated: new Date().toISOString(),
      courses: vault.courses || current.courses || [],
      states: vault.states || current.states || [],
      attemptLogs: vault.attemptLogs || current.attemptLogs || [],
    };
    localStorage.setItem(VAULT_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Error saving client vault:', e);
  }
}

/**
 * Marks a course as opened by the user and records full course data if available
 */
export function markCourseAsOpened(courseId: string, fullCourseData?: any) {
  if (typeof window === 'undefined' || !courseId) return;
  try {
    // 1. Remember last active course
    localStorage.setItem(ACTIVE_COURSE_KEY, courseId);

    // 2. Track opened courses list
    const rawOpened = localStorage.getItem(OPENED_COURSES_KEY);
    const openedList: string[] = rawOpened ? JSON.parse(rawOpened) : [];
    if (!openedList.includes(courseId)) {
      openedList.unshift(courseId);
      localStorage.setItem(OPENED_COURSES_KEY, JSON.stringify(openedList));
    }

    // 3. Cache course in vault if full data is provided
    if (fullCourseData) {
      const vault = getClientVault();
      const existingIdx = vault.courses.findIndex((c: any) => c.id === courseId);
      if (existingIdx >= 0) {
        vault.courses[existingIdx] = { ...vault.courses[existingIdx], ...fullCourseData };
      } else {
        vault.courses.push(fullCourseData);
      }
      saveClientVault(vault);
    }
  } catch (e) {
    console.warn('Error marking course as opened:', e);
  }
}

export function getOpenedCourseIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OPENED_COURSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getLastActiveCourseId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_COURSE_KEY);
}

/**
 * Saves or merges practice progress states locally
 */
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

/**
 * Bidirectional auto-sync with server
 * Restores any missing courses or progress to newly deployed instances seamlessly
 */
export async function performAutoSync(): Promise<{ restoredCourses: number; mergedStates: number } | null> {
  if (typeof window === 'undefined') return null;

  try {
    const vault = getClientVault();

    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientCourses: vault.courses || [],
        clientStates: vault.states || [],
        clientLogs: vault.attemptLogs || [],
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data.success) {
      // Update local vault with the authoritative server state
      if (Array.isArray(data.courses) && data.courses.length > 0) {
        // Merge courses into vault
        const currentVault = getClientVault();
        const serverMap = new Map(data.courses.map((c: any) => [c.id, c]));
        
        // Keep any client courses that have full lessons payload
        const mergedCourses = data.courses.map((sc: any) => {
          const localMatch = currentVault.courses.find((lc: any) => lc.id === sc.id);
          return localMatch ? { ...sc, ...localMatch } : sc;
        });

        saveClientVault({
          courses: mergedCourses,
          states: data.states || currentVault.states,
        });

        // Ensure opened courses list contains all current courses
        const opened = getOpenedCourseIds();
        data.courses.forEach((c: any) => {
          if (!opened.includes(c.id)) opened.push(c.id);
        });
        localStorage.setItem(OPENED_COURSES_KEY, JSON.stringify(opened));
      }

      return {
        restoredCourses: data.restoredCourses || 0,
        mergedStates: data.mergedStates || 0,
      };
    }
  } catch (e) {
    console.warn('AutoSync network or parse error:', e);
  }

  return null;
}

// Backward compatibility helper
export function saveCourseToLocal(course: any, fullData?: any) {
  markCourseAsOpened(course.id, fullData || course);
}

export async function syncAndRestoreMissingCourses(serverCourses: any[]): Promise<number> {
  const result = await performAutoSync();
  return result?.restoredCourses || 0;
}
