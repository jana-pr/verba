'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { Course, Lesson } from '@/lib/db/schema';
import { 
  Dumbbell, 
  BookOpen, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCw, 
  Sparkles, 
  PlusCircle,
  TrendingUp,
  Brain,
  ChevronRight,
  BookA
} from 'lucide-react';

import { getLastActiveCourseId, markCourseAsOpened, getAllMergedCourses } from '@/lib/client-storage';

export default function HomePage() {
  const [courses, setCourses] = useState<Course[]>(() => getAllMergedCourses());
  const [activeCourse, setActiveCourse] = useState<Course | null>(() => {
    const all = getAllMergedCourses();
    const savedId = getLastActiveCourseId();
    return (savedId && all.find(c => c.id === savedId)) || all[0] || null;
  });
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [outline, setOutline] = useState<any[]>([]);
  const [progressData, setProgressData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lessonFilter, setLessonFilter] = useState<'all' | 'milestones'>('all');

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch('/api/courses');
        const data: Course[] = res.ok ? await res.json() : [];
        const merged = getAllMergedCourses(Array.isArray(data) ? data : []);
        setCourses(merged);

        const savedActiveId = getLastActiveCourseId();
        const targetCourse = (savedActiveId && merged.find((c) => c.id === savedActiveId)) || merged[0];
        if (targetCourse) {
          setActiveCourse(targetCourse);
          markCourseAsOpened(targetCourse.id, targetCourse);

          // Fetch full course data including lessons & outline
          try {
            const courseRes = await fetch(`/api/courses/${targetCourse.id}`);
            if (courseRes.ok) {
              const courseData = await courseRes.json();
              if (courseData.lessons) setLessons(courseData.lessons);
              if (courseData.outline) setOutline(courseData.outline);
            }
          } catch (e) {
            console.error('Error fetching course lessons:', e);
          }

          if (targetCourse.status === 'ready' || targetCourse.completed_lessons_count > 0) {
            try {
              const progRes = await fetch(`/api/courses/${targetCourse.id}/progress`);
              if (progRes.ok) {
                const prog = await progRes.json();
                setProgressData(prog);
              }
            } catch (e) {
              console.error('Error fetching progress:', e);
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('courses-updated', handleUpdate);
    return () => window.removeEventListener('courses-updated', handleUpdate);
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20 text-verba-slate">
          <div className="animate-spin mr-2">◷</div> Načítání...
        </div>
      </AppLayout>
    );
  }

  // If user has no courses yet, display onboarding CTA
  if (courses.length === 0) {
    return (
      <AppLayout>
        <div className="max-w-xl mx-auto py-12 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-verba-indigo flex items-center justify-center mx-auto shadow-sm">
            <Brain className="w-8 h-8 stroke-[1.8]" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-verba-ink">
              Vítejte v aplikaci VERBA
            </h1>
            <p className="text-xs sm:text-sm text-verba-slate max-w-md mx-auto">
              Osobní learning environment pro cílené studium odborného cizího jazyka. 
              Understand it. Recall it. Use it.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/courses/new"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-verba-indigo hover:bg-verba-indigo-dark text-white font-semibold text-sm shadow-md transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Vložit nebo vytvořit nový kurz</span>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const isReady = activeCourse?.status === 'ready' || (activeCourse?.completed_lessons_count || 0) > 0;
  const isRecallLagging =
    progressData && progressData.comprehensionPercent > progressData.activeRecallPercent + 10;

  // Combine outline and generated lessons
  const totalCount = 50;
  const allLessons = Array.from({ length: totalCount }, (_, i) => {
    const num = i + 1;
    const generated = lessons.find((l) => l.lesson_number === num);
    const outlineItem = outline.find((o) => o.lesson_number === num);
    const isCheckpoint = num % 10 === 0;

    return {
      number: num,
      title: generated?.title || outlineItem?.title || `Lekce ${num}`,
      theme_focus: generated?.theme_focus || outlineItem?.theme_focus || '',
      isCheckpoint,
    };
  });

  const displayedLessons = lessonFilter === 'milestones'
    ? allLessons.filter(l => l.isCheckpoint)
    : allLessons;

  return (
    <AppLayout activeCourseId={activeCourse?.id}>
      <div className="space-y-4 sm:space-y-6">
        {/* COMPACT ACTIVE COURSE HERO & QUICK CTAS */}
        {isReady && activeCourse && (
          <div className="verba-card p-3.5 sm:p-5 border-indigo-100 bg-gradient-to-br from-white via-white to-indigo-50/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-verba-indigo font-bold text-[10px] sm:text-xs border border-indigo-100 uppercase">
                    {activeCourse.target_language} • {activeCourse.cefr_level}
                  </span>
                  <span className="text-[11px] font-semibold text-verba-slate truncate">
                    {activeCourse.domain_area}
                  </span>
                </div>
                <h1 className="text-base sm:text-xl font-bold text-verba-ink tracking-tight truncate">
                  Lekce 1: {allLessons[0]?.title || 'Základní lekce'}
                </h1>
                <p className="text-[11px] sm:text-xs text-verba-slate truncate mt-0.5">
                  {allLessons[0]?.theme_focus || 'Začněte studium odborné terminologie'}
                </p>
              </div>

              {/* Quick Actions (Compact) */}
              <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                <Link
                  href={`/courses/${activeCourse.id}/lessons/1`}
                  className="flex-1 sm:flex-initial py-2 px-3.5 rounded-xl bg-verba-indigo hover:bg-verba-indigo-dark text-white font-semibold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-98"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Otevřít lekci 1</span>
                </Link>

                <Link
                  href={`/courses/${activeCourse.id}/practice`}
                  className="flex-1 sm:flex-initial py-2 px-3.5 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/60 text-verba-indigo font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Dumbbell className="w-3.5 h-3.5" />
                  <span>START PRACTICE</span>
                </Link>
              </div>
            </div>

            {/* Active Recall Alert (Compact if active) */}
            {isRecallLagging && (
              <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                <AlertTriangle className="w-3.5 h-3.5 text-verba-review shrink-0" />
                <span className="truncate">
                  Aktivní produkce (CZ→EN) zaostává za porozuměním. Dnešní nácvik upřednostňuje aktivní recall.
                </span>
              </div>
            )}
          </div>
        )}

        {/* PRIMARY FOCUS: KURZ SAMOTNÝ (VŠECH 50 LEKCÍ) */}
        {isReady && activeCourse && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-verba-ink">
                  Lekce kurzu
                </h2>
                <span className="text-[11px] font-medium text-verba-slate">
                  (50 témat)
                </span>
              </div>

              {/* Filter pills */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-medium">
                <button
                  type="button"
                  onClick={() => setLessonFilter('all')}
                  className={`px-2 py-0.5 rounded-md transition-colors ${
                    lessonFilter === 'all'
                      ? 'bg-white text-verba-indigo font-bold shadow-2xs'
                      : 'text-verba-slate hover:text-verba-ink'
                  }`}
                >
                  Všechny
                </button>
                <button
                  type="button"
                  onClick={() => setLessonFilter('milestones')}
                  className={`px-2 py-0.5 rounded-md transition-colors ${
                    lessonFilter === 'milestones'
                      ? 'bg-white text-verba-review font-bold shadow-2xs'
                      : 'text-verba-slate hover:text-verba-ink'
                  }`}
                >
                  Milníky (CP 1–5)
                </button>
              </div>
            </div>

            {/* Compact list of lessons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {displayedLessons.map((item) => (
                <Link
                  key={item.number}
                  href={`/courses/${activeCourse.id}/lessons/${item.number}`}
                  className={`verba-card p-2.5 sm:p-3 flex items-center justify-between gap-2.5 verba-card-hover transition-all ${
                    item.isCheckpoint
                      ? 'border-l-4 border-l-verba-review bg-amber-50/20'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        item.isCheckpoint
                          ? 'bg-verba-review text-white'
                          : 'bg-indigo-50 text-verba-indigo'
                      }`}
                    >
                      {item.number}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-bold text-verba-ink truncate">
                          {item.title}
                        </h3>
                        {item.isCheckpoint && (
                          <span className="text-[9px] font-bold px-1 rounded-sm bg-amber-100 text-verba-review shrink-0">
                            CP {item.number / 10}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-verba-slate truncate">
                        {item.theme_focus}
                      </p>
                    </div>
                  </div>

                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* SECONDARY & COMPACT: PŘEHLEDY, BILANCE A NÁSTROJE */}
        {isReady && activeCourse && (
          <div className="verba-card p-3 sm:p-4 border-slate-200/80 bg-white space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-[11px] font-bold text-verba-slate uppercase tracking-wider">
                Přehled a bilance
              </span>
              <Link
                href={`/courses/${activeCourse.id}/progress`}
                className="text-[11px] font-semibold text-verba-indigo hover:underline flex items-center gap-0.5"
              >
                <span>Plná analytika</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Metrics pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center select-none">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className="text-[9px] text-verba-slate font-medium">Dokončeno</div>
                <div className="text-xs font-bold text-verba-ink mt-0.5">
                  {activeCourse.completed_lessons_count} / 50 lekcí
                </div>
              </div>

              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className="text-[9px] text-verba-slate font-medium">Celkové Mastery</div>
                <div className="text-xs font-bold text-verba-mastered mt-0.5">
                  {progressData?.masteryPercent || 0}%
                </div>
              </div>

              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className="text-[9px] text-verba-slate font-medium">Active Recall (CZ→EN)</div>
                <div className="text-xs font-bold text-verba-teal mt-0.5">
                  {progressData?.activeRecallPercent || 0}%
                </div>
              </div>

              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className="text-[9px] text-verba-slate font-medium">Porozumění (EN→CZ)</div>
                <div className="text-xs font-bold text-verba-indigo mt-0.5">
                  {progressData?.comprehensionPercent || 0}%
                </div>
              </div>
            </div>

            {/* Compact action buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                href={`/courses/${activeCourse.id}/review`}
                className="py-2 px-3 rounded-lg border border-slate-200 hover:border-indigo-200 text-verba-ink hover:text-verba-indigo font-medium text-xs flex items-center justify-center gap-1.5 transition-colors text-center"
              >
                <RotateCw className="w-3 h-3 text-verba-review" />
                <span className="truncate">Review (50/25/25)</span>
              </Link>

              <Link
                href={`/courses/${activeCourse.id}/dictionary`}
                className="py-2 px-3 rounded-lg border border-slate-200 hover:border-indigo-200 text-verba-ink hover:text-verba-indigo font-medium text-xs flex items-center justify-center gap-1.5 transition-colors text-center"
              >
                <BookA className="w-3 h-3 text-verba-teal" />
                <span className="truncate">Centrální slovník</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
