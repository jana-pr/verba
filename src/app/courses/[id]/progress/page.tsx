'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  RotateCw,
  Sparkles,
  Layers,
  Dumbbell
} from 'lucide-react';

export default function ProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/courses/${id}/progress`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <AppLayout activeCourseId={id}>
        <div className="flex items-center justify-center py-20 text-verba-slate">
          Načítání přehledu postupu...
        </div>
      </AppLayout>
    );
  }

  if (!data) {
    return (
      <AppLayout activeCourseId={id}>
        <div className="text-center py-20 text-verba-slate">Data kurzu nebyla nalezena.</div>
      </AppLayout>
    );
  }

  const {
    completedLessons,
    totalLessons,
    courseCompletionPercent,
    masteryPercent,
    activeRecallPercent,
    comprehensionPercent,
    stats,
    typeBreakdown,
    weakLessons,
    attemptsSummary,
    insightMessage,
  } = data;

  return (
    <AppLayout activeCourseId={id}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200/60 pb-4">
          <div>
            <span className="text-xs font-semibold text-verba-slate uppercase tracking-wider">
              Analytika a zvládnutí učiva
            </span>
            <h1 className="text-2xl font-bold text-verba-ink tracking-tight">
              Můj progress a mastery
            </h1>
            <p className="text-xs text-verba-slate mt-0.5">
              Hloubkový pohled na poměr aktivního vybavení a pasivního porozumění.
            </p>
          </div>

          <Link
            href={`/courses/${id}/practice`}
            className="py-2.5 px-4 rounded-xl bg-verba-indigo hover:bg-verba-indigo-dark text-white font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5"
          >
            <Dumbbell className="w-3.5 h-3.5" />
            <span>Spustit procvičování</span>
          </Link>
        </div>

        {/* Pedagogical Insight Banner (Sekce 21) */}
        <div className="verba-card p-5 border-indigo-100 bg-gradient-to-r from-indigo-50/60 via-white to-white flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-verba-indigo text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-verba-indigo uppercase tracking-wider">
              Pedagogické doporučení
            </span>
            <p className="text-sm font-semibold text-verba-ink leading-snug">
              „{insightMessage}“
            </p>
          </div>
        </div>

        {/* Top 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="verba-card p-5 space-y-2">
            <span className="text-xs font-semibold text-verba-slate uppercase tracking-wider">
              Dokončené lekce
            </span>
            <div className="text-2xl font-black text-verba-ink">
              {completedLessons} <span className="text-sm font-normal text-verba-slate">/ {totalLessons}</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-verba-teal h-full rounded-full" style={{ width: `${courseCompletionPercent}%` }} />
            </div>
            <div className="text-[11px] text-verba-slate">{courseCompletionPercent}% kurzu zpřístupněno</div>
          </div>

          <div className="verba-card p-5 space-y-2">
            <span className="text-xs font-semibold text-verba-slate uppercase tracking-wider">
              Celkové Mastery
            </span>
            <div className="text-2xl font-black text-verba-mastered">
              {masteryPercent}%
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-verba-mastered h-full rounded-full" style={{ width: `${masteryPercent}%` }} />
            </div>
            <div className="text-[11px] text-verba-slate">
              {stats.mastered} z {stats.totalItems} položek plně zvládnuto
            </div>
          </div>

          <div className="verba-card p-5 space-y-2">
            <span className="text-xs font-semibold text-verba-slate uppercase tracking-wider">
              Historie pokusů (Attempts)
            </span>
            <div className="text-2xl font-black text-verba-indigo">
              {attemptsSummary.total}
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-verba-indigo h-full rounded-full"
                style={{
                  width: `${
                    attemptsSummary.total > 0
                      ? Math.round((attemptsSummary.correct / attemptsSummary.total) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
            <div className="text-[11px] text-verba-slate">
              Úspěšnost pokusů:{' '}
              {attemptsSummary.total > 0
                ? Math.round((attemptsSummary.correct / attemptsSummary.total) * 100)
                : 0}
              %
            </div>
          </div>
        </div>

        {/* Bidirectional Mastery Comparison (Sekce 21: Rozdíl CZ->Target vs Target->CZ) */}
        <div className="verba-card p-6 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-verba-ink">
                Obousměrná bilance: Active Recall vs. Comprehension
              </h2>
              <p className="text-xs text-verba-slate">
                Porovnání aktivní produkce jazyka vůči pasivnímu porozumění.
              </p>
            </div>
            <span className="text-xs font-bold text-verba-indigo bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              Oddělená evidence směrů
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Active Recall: CZ -> Target */}
            <div className="p-4 rounded-xl border border-teal-200/80 bg-teal-50/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-verba-teal">
                    Produkční směr
                  </span>
                  <h3 className="text-sm font-bold text-verba-ink">Active Recall (CZ → Target)</h3>
                </div>
                <span className="text-2xl font-black text-verba-teal">{activeRecallPercent}%</span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div className="bg-verba-teal h-full rounded-full" style={{ width: `${activeRecallPercent}%` }} />
              </div>
              <p className="text-[11px] text-verba-slate">
                Vyjadřování z mateřského jazyka do cizího jazyka. Vyžaduje hlubší paměťovou stopu.
              </p>
            </div>

            {/* Comprehension: Target -> CZ */}
            <div className="p-4 rounded-xl border border-indigo-200/80 bg-indigo-50/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-verba-indigo">
                    Receptivní směr
                  </span>
                  <h3 className="text-sm font-bold text-verba-ink">Comprehension (Target → CZ)</h3>
                </div>
                <span className="text-2xl font-black text-verba-indigo">{comprehensionPercent}%</span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div className="bg-verba-indigo h-full rounded-full" style={{ width: `${comprehensionPercent}%` }} />
              </div>
              <p className="text-[11px] text-verba-slate">
                Schopnost porozumět cizímu textu nebo poslechu a přiřadit správný význam.
              </p>
            </div>
          </div>
        </div>

        {/* Breakdown by Words, Phrases, Sentences */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="verba-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-verba-ink">Rozpad mastery dle typu obsahu</h3>
            <div className="space-y-3">
              {typeBreakdown?.map((tb: any) => {
                const typePercent = tb.total > 0 ? Math.round((tb.mastered / tb.total) * 100) : 0;
                return (
                  <div key={tb.item_type} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="capitalize text-verba-slate">{tb.item_type}s</span>
                      <span className="font-bold text-verba-ink">
                        {tb.mastered} / {tb.total} ({typePercent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-verba-indigo h-full rounded-full" style={{ width: `${typePercent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weak areas needing attention */}
          <div className="verba-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-verba-ink">Oblasti vyžadující pozornost</h3>
              <span className="text-[11px] text-verba-slate">Dle chybovosti</span>
            </div>

            {weakLessons?.length > 0 ? (
              <div className="space-y-2.5">
                {weakLessons.map((wl: any) => (
                  <div
                    key={wl.lesson_number}
                    className="p-3 rounded-xl border border-amber-200/80 bg-amber-50/30 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-verba-ink truncate">
                        Lekce {wl.lesson_number}: {wl.title}
                      </div>
                      <div className="text-[11px] text-verba-slate">
                        {wl.mistakes} chyb z {wl.attempts} pokusů
                      </div>
                    </div>
                    <Link
                      href={`/courses/${id}/practice?lessonId=${wl.lesson_number}`}
                      className="px-2.5 py-1 rounded-lg bg-verba-review text-white font-semibold text-[11px] shrink-0"
                    >
                      Procvičit
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-slate-50 text-center text-xs text-verba-slate">
                Zatím nebyly zaznamenány žádné opakované chyby.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
