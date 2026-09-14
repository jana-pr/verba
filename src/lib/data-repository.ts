import {
  DEFAULT_PRESET_COURSES,
  getClientVault,
  saveClientVault,
  getDeletedCourseIds,
  markCourseAsDeleted,
  getOpenedCourseIds,
  markCourseAsOpened,
  getOpenedCourses,
  getLastActiveCourseId,
  recordStateProgress,
  saveImportedCourseToStorage,
  performAutoSync,
} from './client-storage';

import {
  saveUserDataToCloud,
  pullUserDataFromCloud,
  subscribeToCloudData,
  saveCustomCourseToCloud,
  deleteCustomCourseFromCloud,
  loadAllCustomCoursesFromCloud,
} from './firebase';

import { evaluateAnswer, EvaluationResult } from './evaluation';
import { calculateMasteryUpdate, calculateOverallState } from './spaced-repetition';

export interface SeedData {
  courses: any[];
  outlines: any[];
  lessons: any[];
  items: any[];
  states?: any[];
  exercises: any[];
  articles: any[];
}

let cachedSeedData: SeedData | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Initializes and caches all data:
 * 1. Fetches seed courses data (/data/seed-courses.json)
 * 2. Syncs with Google Cloud Firestore (custom courses + user progress)
 * 3. Restores from local Master Vault
 */
export async function initDataRepository(): Promise<void> {
  if (cachedSeedData && cachedSeedData.courses?.length > 0) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // 1. Load seed courses from CDN / public static asset
      if (typeof window !== 'undefined') {
        try {
          const res = await fetch('/data/seed-courses.json', { cache: 'default' });
          if (res.ok) {
            cachedSeedData = await res.json();
          }
        } catch (e) {
          console.warn('[DataRepository] Failed to fetch /data/seed-courses.json:', e);
        }
      }

      // 2. Load cloud custom courses and merge into local vault
      if (typeof window !== 'undefined') {
        try {
          const cloudCourses = await loadAllCustomCoursesFromCloud();
          if (cloudCourses && cloudCourses.length > 0) {
            const vault = getClientVault();
            const existingIds = new Set((vault.courses || []).map((c: any) => c.id));
            let changed = false;

            for (const cc of cloudCourses) {
              if (cc && cc.id && !existingIds.has(cc.id)) {
                vault.courses.push(cc);
                existingIds.add(cc.id);
                changed = true;
              }
            }

            if (changed) {
              saveClientVault(vault);
            }
          }
        } catch (cloudErr) {
          console.warn('[DataRepository] Cloud courses fetch error:', cloudErr);
        }

        // 3. Trigger background auto-sync for user learning states
        performAutoSync().catch(() => {});
      }
    } catch (err) {
      console.error('[DataRepository] Init error:', err);
    }
  })();

  return initPromise;
}

// ==========================================
// COURSE MANAGEMENT
// ==========================================

export async function getAllCourses(): Promise<any[]> {
  await initDataRepository();
  const deletedIds = new Set(getDeletedCourseIds());
  const map = new Map<string, any>();

  // 1. Seed courses (from cachedSeedData or DEFAULT_PRESET_COURSES)
  const seedCourses = cachedSeedData?.courses || DEFAULT_PRESET_COURSES;
  for (const c of seedCourses) {
    if (c && c.id && !deletedIds.has(c.id)) {
      map.set(c.id, c);
    }
  }

  // 2. Custom courses from vault
  const vault = getClientVault();
  for (const vc of vault.courses || []) {
    if (vc && vc.id && !deletedIds.has(vc.id)) {
      map.set(vc.id, { ...map.get(vc.id), ...vc });
    }
  }

  return Array.from(map.values());
}

export async function getCourseDetail(courseId: string): Promise<{
  course: any | null;
  outline: any[];
  lessons: any[];
}> {
  await initDataRepository();
  const deletedIds = new Set(getDeletedCourseIds());
  if (deletedIds.has(courseId)) {
    return { course: null, outline: [], lessons: [] };
  }

  // Check seed courses
  const seedCourse = (cachedSeedData?.courses || DEFAULT_PRESET_COURSES).find((c) => c.id === courseId);
  if (seedCourse) {
    const outlineRow = cachedSeedData?.outlines?.find((o) => o.course_id === courseId);
    let outline: any[] = [];
    if (outlineRow) {
      outline = typeof outlineRow.outline_json === 'string'
        ? JSON.parse(outlineRow.outline_json)
        : (outlineRow.outline_json || []);
    }

    const lessons = (cachedSeedData?.lessons || [])
      .filter((l) => l.course_id === courseId)
      .sort((a, b) => a.lesson_number - b.lesson_number);

    return {
      course: seedCourse,
      outline,
      lessons,
    };
  }

  // Check vault / custom courses
  const vault = getClientVault();
  const custom = (vault.courses || []).find((c: any) => c.id === courseId);
  if (custom) {
    let outline: any[] = [];
    if (custom.outline) {
      outline = custom.outline;
    } else if (custom.outline_json) {
      try {
        outline = typeof custom.outline_json === 'string' ? JSON.parse(custom.outline_json) : custom.outline_json;
      } catch {}
    }

    const lessons = custom.lessons || [];
    return {
      course: custom,
      outline,
      lessons,
    };
  }

  return { course: null, outline: [], lessons: [] };
}

// ==========================================
// LESSON DETAILS
// ==========================================

export async function getLessonDetail(courseId: string, lessonIdOrNumber: string | number): Promise<{
  course: any | null;
  lesson: any | null;
  items: any[];
  exercises: any[];
  transferArticle: any | null;
  userStates: Record<string, any>;
}> {
  await initDataRepository();

  const courseDetail = await getCourseDetail(courseId);
  if (!courseDetail.course) {
    return { course: null, lesson: null, items: [], exercises: [], transferArticle: null, userStates: {} };
  }

  let lesson: any = null;
  if (typeof lessonIdOrNumber === 'number' || !isNaN(Number(lessonIdOrNumber))) {
    const num = Number(lessonIdOrNumber);
    lesson = courseDetail.lessons.find((l) => l.lesson_number === num);
  } else {
    lesson = courseDetail.lessons.find((l) => l.id === lessonIdOrNumber);
  }

  if (!lesson) {
    return { course: courseDetail.course, lesson: null, items: [], exercises: [], transferArticle: null, userStates: {} };
  }

  const lessonId = lesson.id;

  // Find items, exercises, and articles
  let items: any[] = [];
  let exercises: any[] = [];
  let transferArticle: any = null;

  if (cachedSeedData?.items) {
    items = cachedSeedData.items.filter((it) => it.lesson_id === lessonId || it.course_id === courseId && it.lesson_number === lesson.lesson_number);
    exercises = cachedSeedData.exercises?.filter((ex) => ex.lesson_id === lessonId) || [];
    transferArticle = cachedSeedData.articles?.find((ar) => ar.lesson_id === lessonId) || null;
  }

  // If not found in seed, check in custom course data
  if (items.length === 0 && Array.isArray(lesson.items)) {
    items = lesson.items;
  }
  if (exercises.length === 0 && Array.isArray(lesson.exercises)) {
    exercises = lesson.exercises;
  }
  if (!transferArticle && lesson.transfer_article) {
    transferArticle = lesson.transfer_article;
  }

  // Map user states
  const vault = getClientVault();
  const userStates: Record<string, any> = {};
  for (const s of vault.states || []) {
    if (s && s.learning_item_id) {
      userStates[s.learning_item_id] = s;
    }
  }

  return {
    course: courseDetail.course,
    lesson,
    items,
    exercises,
    transferArticle,
    userStates,
  };
}

// ==========================================
// CENTRAL DICTIONARY
// ==========================================

export async function getDictionaryItems(
  courseId: string,
  search: string = '',
  filterState: string = 'all'
): Promise<any[]> {
  await initDataRepository();

  let allItems: any[] = [];

  if (cachedSeedData?.items) {
    allItems = cachedSeedData.items.filter((it) => it.course_id === courseId);
  }

  // If not in seed, look in custom course
  if (allItems.length === 0) {
    const vault = getClientVault();
    const custom = (vault.courses || []).find((c: any) => c.id === courseId);
    if (custom && Array.isArray(custom.lessons)) {
      for (const l of custom.lessons) {
        if (Array.isArray(l.items)) {
          allItems.push(...l.items);
        }
      }
    }
  }

  const vault = getClientVault();
  const stateMap = new Map<string, any>((vault.states || []).map((s: any) => [s.learning_item_id, s]));

  const query = search.toLowerCase().trim();

  return allItems
    .map((item) => {
      const state = stateMap.get(item.id) || {
        overall_state: 'new',
        cz_to_target_streak: 0,
        target_to_cz_streak: 0,
      };
      return {
        ...item,
        state: state.overall_state || 'new',
        overall_state: state.overall_state || 'new',
        cz_to_target_streak: state.cz_to_target_streak || 0,
        target_to_cz_streak: state.target_to_cz_streak || 0,
        last_reviewed: state.cz_to_target_last_reviewed || state.target_to_cz_last_reviewed || null,
        next_review: state.cz_to_target_next_review || state.target_to_cz_next_review || null,
      };
    })
    .filter((item) => {
      if (filterState !== 'all' && item.overall_state !== filterState) {
        return false;
      }
      if (!query) return true;
      return (
        item.target_text.toLowerCase().includes(query) ||
        item.czech_text.toLowerCase().includes(query) ||
        (item.context_note && item.context_note.toLowerCase().includes(query))
      );
    });
}

// ==========================================
// SPACED REPETITION PRACTICE
// ==========================================

export async function getPracticeQueue(
  courseId: string,
  mode: 'all' | 'review' | 'new' = 'all',
  limit: number = 20
): Promise<any[]> {
  const dictionary = await getDictionaryItems(courseId, '', 'all');
  const now = new Date().toISOString();

  let queue: any[] = [];

  if (mode === 'review') {
    queue = dictionary.filter(
      (it) =>
        it.overall_state === 'review' ||
        (it.overall_state === 'mastered' && it.next_review && it.next_review <= now) ||
        (it.overall_state === 'learning' && it.next_review && it.next_review <= now)
    );
  } else if (mode === 'new') {
    queue = dictionary.filter((it) => it.overall_state === 'new');
  } else {
    // Mixed mode: due reviews first, then learning, then new items
    const dueReviews = dictionary.filter(
      (it) => it.overall_state === 'review' || (it.next_review && it.next_review <= now)
    );
    const learning = dictionary.filter((it) => it.overall_state === 'learning' && (!it.next_review || it.next_review > now));
    const fresh = dictionary.filter((it) => it.overall_state === 'new');

    queue = [...dueReviews, ...learning, ...fresh];
  }

  // Shuffle slightly and slice to limit
  return queue.slice(0, limit);
}

export async function submitPracticeAnswer(params: {
  courseId: string;
  learningItemId: string;
  userAnswer: string;
  direction?: 'cz_to_target' | 'target_to_cz';
  exerciseType?: string;
}): Promise<{
  isCorrect: boolean;
  score: number;
  evaluationMode: string;
  feedback?: string;
  recommendedAnswer: string;
  updatedState: any;
}> {
  const {
    courseId,
    learningItemId,
    userAnswer,
    direction = 'cz_to_target',
    exerciseType = 'practice',
  } = params;

  await initDataRepository();

  // Find item
  const allItems = await getDictionaryItems(courseId, '', 'all');
  const item = allItems.find((it) => it.id === learningItemId);

  const canonicalAnswer = direction === 'cz_to_target'
    ? (item?.target_text || '')
    : (item?.czech_text || '');

  // Evaluate
  const evalResult: EvaluationResult = await evaluateAnswer(
    userAnswer,
    canonicalAnswer,
    item?.acceptable_synonyms || []
  );

  // Get current user item state
  const vault = getClientVault();
  const existingState = (vault.states || []).find((s: any) => s.learning_item_id === learningItemId) || {
    learning_item_id: learningItemId,
    course_id: courseId,
    cz_to_target_state: 'new',
    cz_to_target_streak: 0,
    target_to_cz_state: 'new',
    target_to_cz_streak: 0,
    overall_state: 'new',
  };

  const currentDirectionState = direction === 'cz_to_target'
    ? existingState.cz_to_target_state || 'new'
    : existingState.target_to_cz_state || 'new';

  const currentDirectionStreak = direction === 'cz_to_target'
    ? existingState.cz_to_target_streak || 0
    : existingState.target_to_cz_streak || 0;

  // Calculate Spaced Repetition progression
  const masteryUpdate = calculateMasteryUpdate(
    currentDirectionState,
    currentDirectionStreak,
    evalResult.isCorrect
  );

  const updatedState: any = {
    ...existingState,
    learning_item_id: learningItemId,
    course_id: courseId,
    updated_at: new Date().toISOString(),
  };

  if (direction === 'cz_to_target') {
    updatedState.cz_to_target_state = masteryUpdate.newState;
    updatedState.cz_to_target_streak = masteryUpdate.newStreak;
    updatedState.cz_to_target_last_reviewed = new Date().toISOString();
    updatedState.cz_to_target_next_review = masteryUpdate.nextReviewDate;
  } else {
    updatedState.target_to_cz_state = masteryUpdate.newState;
    updatedState.target_to_cz_streak = masteryUpdate.newStreak;
    updatedState.target_to_cz_last_reviewed = new Date().toISOString();
    updatedState.target_to_cz_next_review = masteryUpdate.nextReviewDate;
  }

  updatedState.overall_state = calculateOverallState(
    updatedState.cz_to_target_state || 'new',
    updatedState.target_to_cz_state || 'new'
  );

  // Record progress in Master Vault and immediately push to Google Cloud Firestore
  recordStateProgress(updatedState);

  // Add attempt log
  vault.attemptLogs = vault.attemptLogs || [];
  vault.attemptLogs.push({
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    course_id: courseId,
    learning_item_id: learningItemId,
    direction,
    exercise_type: exerciseType,
    user_answer: userAnswer,
    is_correct: evalResult.isCorrect ? 1 : 0,
    score: evalResult.score,
    evaluation_mode: evalResult.mode,
    created_at: new Date().toISOString(),
  });
  saveClientVault(vault);

  return {
    isCorrect: evalResult.isCorrect,
    score: evalResult.score,
    evaluationMode: evalResult.mode,
    feedback: evalResult.feedback,
    recommendedAnswer: canonicalAnswer,
    updatedState,
  };
}

// ==========================================
// COURSE PROGRESS STATS
// ==========================================

export async function getCourseProgressStats(courseId: string): Promise<{
  totalItems: number;
  masteredCount: number;
  reviewCount: number;
  learningCount: number;
  newCount: number;
  retentionRate: number;
  completedLessonsCount: number;
  totalLessons: number;
}> {
  const dictionary = await getDictionaryItems(courseId, '', 'all');
  const courseDetail = await getCourseDetail(courseId);

  let mastered = 0;
  let review = 0;
  let learning = 0;
  let fresh = 0;

  for (const item of dictionary) {
    if (item.overall_state === 'mastered') mastered++;
    else if (item.overall_state === 'review') review++;
    else if (item.overall_state === 'learning') learning++;
    else fresh++;
  }

  const total = dictionary.length;
  const activeLearned = mastered + review;
  const retentionRate = total > 0 ? Math.round((activeLearned / total) * 100) : 0;

  return {
    totalItems: total,
    masteredCount: mastered,
    reviewCount: review,
    learningCount: learning,
    newCount: fresh,
    retentionRate,
    completedLessonsCount: courseDetail.course?.completed_lessons_count || 50,
    totalLessons: courseDetail.course?.total_lessons || 50,
  };
}

export async function getFullCourseProgress(courseId: string): Promise<any> {
  const dictionary = await getDictionaryItems(courseId, '', 'all');
  const courseDetail = await getCourseDetail(courseId);
  const vault = getClientVault();

  let mastered = 0;
  let review = 0;
  let learning = 0;
  let fresh = 0;
  let czMastered = 0;
  let targetMastered = 0;

  const typeCounts: Record<string, { total: number; mastered: number }> = {};

  for (const item of dictionary) {
    if (item.overall_state === 'mastered') mastered++;
    else if (item.overall_state === 'review') review++;
    else if (item.overall_state === 'learning') learning++;
    else fresh++;

    if (item.cz_to_target_streak >= 4) czMastered++;
    if (item.target_to_cz_streak >= 4) targetMastered++;

    const t = item.item_type || 'expression';
    if (!typeCounts[t]) typeCounts[t] = { total: 0, mastered: 0 };
    typeCounts[t].total++;
    if (item.overall_state === 'mastered') typeCounts[t].mastered++;
  }

  const total = dictionary.length;
  const masteryPercent = total > 0 ? Math.round((mastered / total) * 100) : 0;
  const activeRecallPercent = total > 0 ? Math.round((czMastered / total) * 100) : 0;
  const comprehensionPercent = total > 0 ? Math.round((targetMastered / total) * 100) : 0;

  const completedLessons = courseDetail.course?.completed_lessons_count || 50;
  const totalLessons = courseDetail.course?.total_lessons || 50;
  const courseCompletionPercent = Math.round((completedLessons / totalLessons) * 100);

  const typeBreakdown = Object.entries(typeCounts).map(([item_type, val]) => ({
    item_type,
    total: val.total,
    mastered: val.mastered,
  }));

  const logs = (vault.attemptLogs || []).filter((l: any) => l.course_id === courseId);
  const correctAttempts = logs.filter((l: any) => l.is_correct).length;

  let insightMessage = 'Pokračujte v procvičování pro budování dlouhodobé paměti.';
  if (comprehensionPercent > activeRecallPercent + 15) {
    insightMessage = 'Tomuto obsahu dobře pasivně rozumíte, ale aktivní produkce (CZ → cizí jazyk) potřebuje intenzivnější trénink.';
  } else if (activeRecallPercent >= comprehensionPercent && total > 0) {
    insightMessage = 'Vynikající vyváženost mezi aktivním vybavením a porozuměním.';
  }

  return {
    courseId,
    completedLessons,
    totalLessons,
    courseCompletionPercent,
    masteryPercent,
    activeRecallPercent,
    comprehensionPercent,
    stats: {
      totalItems: total,
      mastered,
      review,
      learning,
      new: fresh,
    },
    typeBreakdown,
    weakLessons: [],
    attemptsSummary: {
      total: logs.length,
      correct: correctAttempts,
    },
    insightMessage,
  };
}

// ==========================================
// CHECKPOINTS
// ==========================================

export async function getCheckpointData(courseId: string, checkpointNumber: number): Promise<{
  checkpointNumber: number;
  coveredLessons: number[];
  items: any[];
  questions: any[];
}> {
  await initDataRepository();
  const endLesson = checkpointNumber;
  const startLesson = Math.max(1, endLesson - 4);
  const coveredLessons: number[] = [];
  for (let i = startLesson; i <= endLesson; i++) {
    coveredLessons.push(i);
  }

  const courseDetail = await getCourseDetail(courseId);
  const dictionary = await getDictionaryItems(courseId, '', 'all');

  // Filter items in covered lessons
  const coveredLessonsSet = new Set(coveredLessons);
  const items = dictionary.filter((it) => {
    return coveredLessonsSet.has(it.lesson_number);
  });

  // Create checkpoint questions from exercises
  let questions: any[] = [];
  if (cachedSeedData?.exercises) {
    for (const lesson of courseDetail.lessons) {
      if (coveredLessonsSet.has(lesson.lesson_number)) {
        const lessonExercises = cachedSeedData.exercises.filter((ex) => ex.lesson_id === lesson.id);
        questions.push(...lessonExercises);
      }
    }
  }

  if (questions.length === 0) {
    // Generate questions from items
    questions = items.slice(0, 10).map((it, idx) => ({
      id: `chk_q_${idx + 1}`,
      prompt: `Přeložte výraz: ${it.czech_text}`,
      canonical_answer: it.target_text,
      exercise_type: 'fill',
    }));
  }

  return {
    checkpointNumber,
    coveredLessons,
    items,
    questions: questions.slice(0, 15),
  };
}

// ==========================================
// GPT COURSE IMPORT & CREATION
// ==========================================

export async function importGptCourse(rawJsonInput: any): Promise<{
  success: boolean;
  courseId: string;
  domainArea: string;
  lessonCount: number;
  itemCount: number;
  message: string;
}> {
  let rawJson = rawJsonInput;
  if (typeof rawJson === 'string') {
    let cleaned = rawJson.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    rawJson = JSON.parse(cleaned);
  }

  const courseMeta = rawJson.course || rawJson;
  const lessonsList = Array.isArray(rawJson.lessons)
    ? rawJson.lessons
    : Array.isArray(courseMeta.lessons)
    ? courseMeta.lessons
    : [];

  if (lessonsList.length === 0) {
    throw new Error('Vložený JSON neobsahuje žádné lekce (klíč "lessons").');
  }

  const domainArea = courseMeta.domain_area || courseMeta.title || 'Nový kurz z GPT';
  const targetLanguage = (courseMeta.target_language || 'en').toLowerCase();
  const nativeLanguage = (courseMeta.native_language || 'cs').toLowerCase();
  const cefrLevel = (courseMeta.cefr_level || 'B2').toUpperCase();

  const safeDomainSlug = domainArea
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 30);
  const courseId = `crs_gpt_${safeDomainSlug}_${Date.now()}`;
  const nowIso = new Date().toISOString();

  // Construct full course object
  const outlineItems = lessonsList.map((l: any, idx: number) => ({
    lesson_number: l.lesson_number || idx + 1,
    title: l.title || `Lekce ${idx + 1}`,
    theme_focus: l.theme_focus || '',
    learning_goal: `Osvojení odborné terminologie a frází pro ${l.theme_focus || l.title}`,
  }));

  let totalItemsCount = 0;
  const processedLessons = lessonsList.map((l: any, idx: number) => {
    const lessonNum = l.lesson_number || idx + 1;
    const lessonId = `les_${courseId}_${lessonNum}`;

    const items = (Array.isArray(l.items) ? l.items : []).map((it: any, j: number) => {
      totalItemsCount++;
      return {
        id: `itm_${lessonId}_${j + 1}`,
        lesson_id: lessonId,
        course_id: courseId,
        lesson_number: lessonNum,
        item_type: it.item_type || (it.target_text?.includes(' ') ? 'expression' : 'word'),
        target_text: it.target_text?.trim() || '',
        czech_text: it.czech_text?.trim() || '',
        context_note: it.context_note || '',
        example_sentence_target: it.example_sentence_target || '',
        example_sentence_czech: it.example_sentence_czech || '',
        phonetic_hint: it.phonetic_hint || null,
        created_at: nowIso,
      };
    });

    const exercises = (Array.isArray(l.exercises) ? l.exercises : []).map((ex: any, k: number) => ({
      id: `ex_${lessonId}_${k + 1}`,
      lesson_id: lessonId,
      exercise_type: ex.exercise_type || 'choice',
      prompt: ex.prompt || 'Vyberte správnou možnost:',
      target_language_context: ex.target_language_context || null,
      options: ex.options || [],
      canonical_answer: ex.canonical_answer || '',
      acceptable_synonyms: ex.acceptable_synonyms || [],
      explanation: ex.explanation || '',
    }));

    return {
      id: lessonId,
      course_id: courseId,
      lesson_number: lessonNum,
      title: l.title || `Lekce ${lessonNum}`,
      theme_focus: l.theme_focus || '',
      article_title: l.article_title || l.title || `Odborný text k lekci ${lessonNum}`,
      article_body: l.article_body || `Professional article focusing on ${l.title || domainArea}.`,
      listening_script: l.listening_script || '',
      status: 'completed',
      items,
      exercises,
      transfer_article: l.transfer_article || null,
      created_at: nowIso,
    };
  });

  const fullCourse = {
    id: courseId,
    user_id: 'usr_jana_default',
    target_language: targetLanguage,
    native_language: nativeLanguage,
    cefr_level: cefrLevel,
    domain_area: domainArea,
    status: 'ready',
    total_lessons: lessonsList.length,
    completed_lessons_count: lessonsList.length,
    created_at: nowIso,
    updated_at: nowIso,
    outline: outlineItems,
    lessons: processedLessons,
  };

  // 1. Save locally in Master Vault
  saveImportedCourseToStorage(fullCourse);

  // 2. Save permanently to Google Cloud Firestore (collection 'verba_courses')
  await saveCustomCourseToCloud(fullCourse);

  // 3. Notify UI
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('courses-updated'));
  }

  return {
    success: true,
    courseId,
    domainArea,
    lessonCount: lessonsList.length,
    itemCount: totalItemsCount,
    message: `Kurz „${domainArea}“ byl úspěšně vytvořen a trvale uložen v Google Cloud Firestore.`,
  };
}

// ==========================================
// COURSE DELETION (PERMANENT)
// ==========================================

export async function deleteCoursePermanently(courseId: string): Promise<boolean> {
  // 1. Mark as deleted in local vault & user_data
  markCourseAsDeleted(courseId);

  // 2. Delete document in verba_courses
  await deleteCustomCourseFromCloud(courseId);

  // 3. Update deletedCourseIds in Firestore
  await saveUserDataToCloud({
    deletedCourseIds: getDeletedCourseIds(),
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('courses-updated'));
  }

  return true;
}
