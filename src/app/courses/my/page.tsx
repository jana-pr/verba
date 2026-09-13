'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { 
  getAllMergedCourses, 
  getOpenedCourses, 
  markCourseAsClosed, 
  markCourseAsDeleted, 
  markCourseAsOpened, 
  getLastActiveCourseId 
} from '@/lib/client-storage';
import { 
  BookOpen, 
  Layers, 
  Dumbbell, 
  BookA, 
  X, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  GraduationCap
} from 'lucide-react';

export default function MyCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>(() => getAllMergedCourses());
  const [openedCourses, setOpenedCourses] = useState<any[]>(() => getOpenedCourses(getAllMergedCourses()));
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshCourses = async () => {
    try {
      const res = await fetch('/api/courses');
      const serverData = res.ok ? await res.json() : [];
      const merged = getAllMergedCourses(Array.isArray(serverData) ? serverData : []);
      const opened = getOpenedCourses(merged);
      setCourses(merged);
      setOpenedCourses(opened);
    } catch {
      const merged = getAllMergedCourses();
      setCourses(merged);
      setOpenedCourses(getOpenedCourses(merged));
    } finally {
      setActiveCourseId(getLastActiveCourseId());
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCourses();

    const handleUpdate = () => refreshCourses();
    window.addEventListener('courses-updated', handleUpdate);
    return () => window.removeEventListener('courses-updated', handleUpdate);
  }, []);

  const handleClose = (courseId: string, courseName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    markCourseAsClosed(courseId);
    const remaining = openedCourses.filter((c) => c.id !== courseId);
    setOpenedCourses(remaining);
    window.dispatchEvent(new Event('courses-updated'));
  };

  const handleDelete = async (courseId: string, courseName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm(`Opravdu chcete trvale smazat kurz „${courseName}“? Všechna data kurzu budou nenávratně odstraněna.`)) {
      return;
    }
    markCourseAsDeleted(courseId);
    const remainingAll = courses.filter((c) => c.id !== courseId);
    const remainingOpened = openedCourses.filter((c) => c.id !== courseId);
    setCourses(remainingAll);
    setOpenedCourses(remainingOpened);
    try {
      await fetch(`/api/courses/${courseId}`, { method: 'DELETE' });
    } catch {}
    window.dispatchEvent(new Event('courses-updated'));
  };

  const handleSelectActive = (course: any) => {
    markCourseAsOpened(course.id, course);
    setActiveCourseId(course.id);
    router.push(`/courses/${course.id}`);
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-verba-indigo font-bold text-[11px] uppercase tracking-wider border border-indigo-100">
                Vzdělávací prostor
              </span>
              <span className="text-xs text-verba-slate font-medium">
                {openedCourses.length} {openedCourses.length === 1 ? 'otevřený kurz' : openedCourses.length < 5 ? 'otevřené kurzy' : 'otevřených kurzů'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-verba-ink tracking-tight flex items-center gap-2.5">
              <GraduationCap className="w-7 h-7 text-verba-indigo stroke-[2]" />
              <span>Mé kurzy</span>
            </h1>
            <p className="text-xs sm:text-sm text-verba-slate mt-1 max-w-xl">
              Zde máte přehledně zobrazeny všechny aktuálně otevřené kurzy. Kurz můžete kdykoliv zavřít (zůstane v předpřipravených kurzech) nebo trvale smazat.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              href="/courses/new?tab=presets"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-verba-ink text-xs font-semibold shadow-2xs transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-verba-indigo" />
              <span>Katalog kurzů</span>
            </Link>

            <Link
              href="/courses/new?tab=import"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-verba-indigo hover:bg-verba-indigo-dark text-white text-xs font-semibold shadow-xs transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nový kurz z GPT</span>
            </Link>
          </div>
        </div>

        {/* Empty State */}
        {openedCourses.length === 0 ? (
          <div className="verba-card p-8 sm:p-12 text-center max-w-lg mx-auto space-y-5 my-8 border-dashed border-slate-300">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-verba-indigo flex items-center justify-center mx-auto shadow-sm">
              <BookOpen className="w-7 h-7 stroke-[1.8]" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-bold text-verba-ink">
                Nemáte otevřený žádný kurz
              </h2>
              <p className="text-xs sm:text-sm text-verba-slate leading-relaxed">
                Vyberte si některý z odborných kurzů v katalogu nebo vložte vlastní osnovu lekcí vygenerovanou přes GPT.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/courses/new?tab=presets"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-verba-indigo hover:bg-verba-indigo-dark text-white font-semibold text-xs shadow-sm transition-all"
              >
                <BookOpen className="w-4 h-4" />
                <span>Otevřít z katalogu</span>
              </Link>
              <Link
                href="/courses/new?tab=import"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-verba-ink font-semibold text-xs transition-colors"
              >
                <Plus className="w-4 h-4 text-verba-indigo" />
                <span>Vložit z GPT</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Grid of Opened Courses */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {openedCourses.map((c) => {
              const isActive = c.id === activeCourseId;
              const total = c.total_lessons || 50;
              const completed = c.completed_lessons_count || total;
              const progressPct = Math.round((completed / total) * 100);

              return (
                <div
                  key={c.id}
                  className={`verba-card p-5 sm:p-6 flex flex-col justify-between transition-all hover:shadow-md relative overflow-hidden ${
                    isActive
                      ? 'border-verba-indigo ring-1 ring-verba-indigo/30 bg-gradient-to-br from-white via-white to-indigo-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Active Indicator Ribbon */}
                  {isActive && (
                    <div className="absolute top-0 right-0 bg-verba-indigo text-white text-[10px] font-bold px-3 py-0.5 rounded-bl-lg uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                      <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                      <span>Aktivní</span>
                    </div>
                  )}

                  <div className="space-y-3.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-verba-indigo font-bold text-xs border border-indigo-100 uppercase tracking-wide">
                        {c.target_language.toUpperCase()} • {c.cefr_level}
                      </span>
                      <span className="text-[11px] text-verba-slate font-medium">
                        Čeština → Cizí jazyk
                      </span>
                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-verba-ink tracking-tight leading-snug">
                        {c.domain_area}
                      </h2>
                      <p className="text-xs text-verba-slate mt-1 line-clamp-2">
                        Profesní terminologie, syntaktické fráze, modelové články a obousměrný trénink.
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-verba-slate">Průchod kurzem</span>
                        <span className="font-bold text-verba-ink font-mono text-[11px]">
                          {completed} / {total} lekcí ({progressPct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-verba-indigo to-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-5 mt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                      <button
                        type="button"
                        onClick={() => handleSelectActive(c)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-verba-indigo hover:bg-verba-indigo-dark text-white font-semibold text-xs shadow-2xs transition-all active:scale-95"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Otevřít lekce</span>
                      </button>

                      <Link
                        href={`/courses/${c.id}/practice`}
                        className="inline-flex items-center justify-center gap-1 py-2 px-3 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/60 text-verba-indigo font-semibold text-xs transition-colors"
                        title="Spustit procvičování ve Focus Mode"
                      >
                        <Dumbbell className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Procvičit</span>
                      </Link>

                      <Link
                        href={`/courses/${c.id}/dictionary`}
                        className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-verba-slate hover:text-verba-ink transition-colors"
                        title="Zobrazit centrální slovník kurzu"
                      >
                        <BookA className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    {/* Close and Delete Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleClose(c.id, c.domain_area, e)}
                        className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-200 text-slate-400 hover:text-amber-700 transition-colors"
                        title={`Zavřít kurz „${c.domain_area}“ (zůstane v katalogu Předpřipravených kurzů)`}
                        aria-label="Zavřít kurz z Mých kurzů"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDelete(c.id, c.domain_area, e)}
                        className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 transition-colors"
                        title={`Trvale smazat kurz „${c.domain_area}“`}
                        aria-label="Trvale smazat kurz"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}