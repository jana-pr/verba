'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { Course } from '@/lib/db/schema';
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
  Brain
} from 'lucide-react';

export default function HomePage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [progressData, setProgressData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/courses')
      .then((res) => res.json())
      .then(async (data: Course[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setCourses(data);
          const first = data[0];
          setActiveCourse(first);

          if (first.status === 'ready' || first.completed_lessons_count > 0) {
            const progRes = await fetch(`/api/courses/${first.id}/progress`);
            const prog = await progRes.json();
            setProgressData(prog);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
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
            <p className="text-sm sm:text-base text-verba-slate max-w-md mx-auto">
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
              <span>Vytvořit svůj první odborný kurz</span>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const isReady = activeCourse?.status === 'ready' || (activeCourse?.completed_lessons_count || 0) > 0;
  const isRecallLagging =
    progressData && progressData.comprehensionPercent > progressData.activeRecallPercent + 10;

  return (
    <AppLayout activeCourseId={activeCourse?.id}>
      <div className="space-y-6">
        {/* Top Greeting & Intent: "Co mám dnes udělat?" */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200/60 pb-4">
          <div>
            <span className="text-xs font-semibold text-verba-slate uppercase tracking-wider">
              Dnešní plán
            </span>
            <h1 className="text-2xl font-bold text-verba-ink tracking-tight">
              Co máte dnes udělat?
            </h1>
          </div>
          <div className="text-xs font-medium text-verba-slate">
            Aktivní kurz: <span className="font-semibold text-verba-ink">{activeCourse?.target_language.toUpperCase()} • {activeCourse?.cefr_level} {activeCourse?.domain_area}</span>
          </div>
        </div>

        {/* If course is still in generation or outline phase */}
        {activeCourse?.status === 'outline_pending' && (
          <div className="verba-card p-6 border-amber-200 bg-amber-50/40 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-verba-review shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-verba-ink">Osnova kurzu čeká na Vaše schválení</h3>
                <p className="text-xs text-verba-slate mt-1">
                  Před zahájením generování lekcí je nutné zkontrolovat a schválit 50-lekcí curriculum outline.
                </p>
              </div>
            </div>
            <Link
              href={`/courses/${activeCourse.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-verba-indigo text-white text-xs font-medium hover:bg-verba-indigo-dark"
            >
              <span>Zkontrolovat a schválit osnovu</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {activeCourse?.status === 'generating' && (
          <div className="verba-card p-6 border-indigo-200 bg-indigo-50/30 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-verba-ink">Probíhá generování kurzu</h3>
                <p className="text-xs text-verba-slate mt-0.5">
                  Vygenerováno {activeCourse.completed_lessons_count} z 50 lekcí.
                </p>
              </div>
              <Link
                href={`/courses/${activeCourse.id}/generate`}
                className="px-3.5 py-1.5 rounded-lg bg-verba-indigo text-white text-xs font-medium hover:bg-verba-indigo-dark"
              >
                Otevřít generátor
              </Link>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-verba-indigo h-full transition-all"
                style={{ width: `${(activeCourse.completed_lessons_count / 50) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Main CTA Section for ready course */}
        {isReady && activeCourse && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Primary Action Card: Mobile CTA = START PRACTICE */}
            <div className="md:col-span-2 verba-card p-6 sm:p-7 border-indigo-100 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-white via-white to-indigo-50/30">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-verba-indigo border border-indigo-100 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-verba-indigo" />
                    <span>Doporučeno na dnešek</span>
                  </span>
                  <span className="text-xs text-verba-slate font-medium">
                    ~10–15 minut
                  </span>
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-verba-ink">
                    Denní procvičování (Practice)
                  </h2>
                  <p className="text-xs sm:text-sm text-verba-slate mt-1 max-w-lg">
                    Cílené upevnění odborné slovní zásoby a frází. Algoritmus automaticky vybral položky, které vyžadují pozornost.
                  </p>
                </div>

                {/* Recall vs Comprehension Alert */}
                {isRecallLagging && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-verba-review shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Upozornění na slabší směr: </span>
                      Tomuto obsahu dobře rozumíte pasivně, ale aktivní produkce (CZ → EN) zaostává. Dnešní cvičení preferuje aktivní vybavení.
                    </div>
                  </div>
                )}
              </div>

              {/* CTAs: Mobile Primary = Start Practice; Secondary = Continue Learning */}
              <div className="pt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link
                  href={`/courses/${activeCourse.id}/practice`}
                  className="flex-1 py-3.5 px-6 rounded-xl bg-verba-indigo hover:bg-verba-indigo-dark text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98"
                >
                  <Dumbbell className="w-4 h-4" />
                  <span>START PRACTICE</span>
                </Link>

                <Link
                  href={`/courses/${activeCourse.id}/lessons/1`}
                  className="py-3 px-5 rounded-xl border border-slate-200 hover:border-indigo-200 bg-white text-verba-ink hover:text-verba-indigo font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-4 h-4 text-verba-slate" />
                  <span>Pokračovat v lekcích</span>
                </Link>
              </div>
            </div>

            {/* Quick Metrics Card */}
            <div className="verba-card p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-verba-slate uppercase tracking-wider">
                    Postup kurzem
                  </span>
                  <Link
                    href={`/courses/${activeCourse.id}/progress`}
                    className="text-[11px] font-semibold text-verba-indigo hover:underline flex items-center gap-1"
                  >
                    <span>Detail</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-medium mb-1">
                      <span className="text-verba-slate">Dokončené lekce</span>
                      <span className="font-bold text-verba-ink">
                        {activeCourse.completed_lessons_count} / 50
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-verba-teal h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (activeCourse.completed_lessons_count / 50) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium mb-1">
                      <span className="text-verba-slate">Celkové Mastery</span>
                      <span className="font-bold text-verba-mastered">
                        {progressData?.masteryPercent || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-verba-mastered h-full rounded-full"
                        style={{ width: `${progressData?.masteryPercent || 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bidirectional comparison indicator */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="text-[11px] font-semibold text-verba-slate uppercase">
                    Obousměrná bilance:
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="text-[10px] text-verba-slate font-medium">
                        Active Recall (CZ→EN)
                      </div>
                      <div className="text-sm font-bold text-verba-teal mt-0.5">
                        {progressData?.activeRecallPercent || 0}%
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="text-[10px] text-verba-slate font-medium">
                        Porozumění (EN→CZ)
                      </div>
                      <div className="text-sm font-bold text-verba-indigo mt-0.5">
                        {progressData?.comprehensionPercent || 0}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Link
                href={`/courses/${activeCourse.id}/review`}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 hover:border-indigo-200 text-verba-ink hover:text-verba-indigo font-medium text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Spustit Course Review (50/25/25)</span>
              </Link>
            </div>
          </div>
        )}

        {/* Quick Navigation Cards */}
        {isReady && activeCourse && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <Link
              href={`/courses/${activeCourse.id}`}
              className="verba-card p-4 hover:border-indigo-200 transition-all text-left"
            >
              <BookOpen className="w-5 h-5 text-verba-indigo mb-2" />
              <div className="text-xs font-bold text-verba-ink">Seznam lekcí</div>
              <div className="text-[11px] text-verba-slate mt-0.5">50 témat kurzu</div>
            </Link>

            <Link
              href={`/courses/${activeCourse.id}/dictionary`}
              className="verba-card p-4 hover:border-indigo-200 transition-all text-left"
            >
              <BookOpen className="w-5 h-5 text-verba-teal mb-2" />
              <div className="text-xs font-bold text-verba-ink">Centrální slovník</div>
              <div className="text-[11px] text-verba-slate mt-0.5">
                {progressData?.stats?.totalItems || 0} položek
              </div>
            </Link>

            <Link
              href={`/courses/${activeCourse.id}/checkpoints/10`}
              className="verba-card p-4 hover:border-indigo-200 transition-all text-left"
            >
              <CheckCircle2 className="w-5 h-5 text-verba-mastered mb-2" />
              <div className="text-xs font-bold text-verba-ink">Milník Checkpoint</div>
              <div className="text-[11px] text-verba-slate mt-0.5">Ověření po 10 lekcích</div>
            </Link>

            <Link
              href={`/courses/${activeCourse.id}/progress`}
              className="verba-card p-4 hover:border-indigo-200 transition-all text-left"
            >
              <TrendingUp className="w-5 h-5 text-verba-review mb-2" />
              <div className="text-xs font-bold text-verba-ink">Analytika</div>
              <div className="text-[11px] text-verba-slate mt-0.5">Slabá místa a grafy</div>
            </Link>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
