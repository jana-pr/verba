'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { CurriculumLessonOutline } from '@/lib/db/schema';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  BookOpen, 
  AlertCircle,
  Loader2,
  Layers,
  ChevronRight
} from 'lucide-react';

export default function NewCoursePage() {
  const router = useRouter();

  // Form inputs
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [cefrLevel, setCefrLevel] = useState('B2');
  const [domainArea, setDomainArea] = useState('Project Management');

  // Outline review state
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [outline, setOutline] = useState<CurriculumLessonOutline[] | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateOutline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainArea.trim()) return;

    setIsGeneratingOutline(true);
    setError(null);

    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_language: targetLanguage,
          cefr_level: cefrLevel,
          domain_area: domainArea.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error('Chyba při přípravě osnovy kurzu.');
      }

      const data = await res.json();
      setCourseId(data.courseId);
      setOutline(data.outline);
    } catch (err: any) {
      setError(err.message || 'Nepodařilo se připravit osnovu.');
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const handleApproveOutline = async () => {
    if (!courseId) return;
    setIsApproving(true);
    setError(null);

    try {
      const res = await fetch(`/api/courses/${courseId}/approve-outline`, {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('Schválení osnovy selhalo.');
      }

      // Redirect to resumable generation page
      router.push(`/courses/${courseId}/generate`);
    } catch (err: any) {
      setError(err.message || 'Chyba při schvalování osnovy.');
      setIsApproving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-8 py-2">
        {/* Step Header */}
        <div>
          <span className="text-xs font-semibold text-verba-slate uppercase tracking-wider">
            Krok 1 ze 2
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-verba-ink tracking-tight mt-0.5">
            {outline ? 'Kontrola Curriculum Outline' : 'Vytvoření nového odborného kurzu'}
          </h1>
          <p className="text-xs sm:text-sm text-verba-slate mt-1">
            {outline
              ? 'Zkontrolujte navržených 50 tematických lekcí a milníků. Teprve po Vašem schválení se začne generovat kompletní obsah.'
              : 'Definujte cílový jazyk, CEFR úroveň a profesní obor. Systém sestaví pedagogicky provázanou osnovu o 50 lekcích.'}
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-verba-error shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Phase 1: Setup Form (hidden once outline is ready to review) */}
        {!outline && (
          <form onSubmit={handleGenerateOutline} className="verba-card p-6 sm:p-8 space-y-6">
            <div className="space-y-4">
              {/* Target Language */}
              <div>
                <label className="block text-xs font-semibold text-verba-ink uppercase tracking-wider mb-2">
                  Cílový jazyk (Target Language)
                </label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-verba-ink focus:outline-hidden focus:border-verba-indigo"
                >
                  <option value="en">Angličtina (English) — Primární MVP</option>
                  <option value="de">Němčina (Deutsch) — Architektonická podpora</option>
                  <option value="es">Španělština (Español) — Architektonická podpora</option>
                </select>
                <p className="text-[11px] text-verba-slate mt-1.5">
                  Výchozí domácí jazyk pro překlady a vysvětlení: <strong>Čeština (CZ)</strong>.
                </p>
              </div>

              {/* CEFR Level */}
              <div>
                <label className="block text-xs font-semibold text-verba-ink uppercase tracking-wider mb-2">
                  CEFR Úroveň
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((lvl) => (
                    <button
                      type="button"
                      key={lvl}
                      onClick={() => setCefrLevel(lvl)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        cefrLevel === lvl
                          ? 'bg-verba-indigo text-white border-verba-indigo shadow-xs'
                          : 'bg-white text-verba-slate border-slate-200 hover:border-indigo-200'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Domain / Professional Area */}
              <div>
                <label className="block text-xs font-semibold text-verba-ink uppercase tracking-wider mb-2">
                  Profesní oblast / Odbornost (Professional Domain)
                </label>
                <input
                  type="text"
                  value={domainArea}
                  onChange={(e) => setDomainArea(e.target.value)}
                  placeholder="např. Project Management, Software Engineering, Financial Audit..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-verba-ink focus:outline-hidden focus:border-verba-indigo"
                  required
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    'Project Management',
                    'Product Management',
                    'Software Engineering',
                    'Negotiation & Sales',
                    'Human Resources',
                  ].map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setDomainArea(preset)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-[11px] font-medium text-verba-slate hover:text-verba-indigo transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isGeneratingOutline || !domainArea.trim()}
              className="w-full py-3.5 px-6 rounded-xl bg-verba-indigo hover:bg-verba-indigo-dark text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGeneratingOutline ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sestavuji 50-lekcí Curriculum Outline...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generovat 50-lekcí Curriculum Outline</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Phase 2: Curriculum Outline Review (Mandatory Business Gate) */}
        {outline && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Approval Banner */}
            <div className="verba-card p-5 border-indigo-200 bg-indigo-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-16 z-20 backdrop-blur-md">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-verba-indigo uppercase tracking-wider">
                    Povinná schvalovací brána
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-white border border-indigo-200 font-semibold text-verba-ink">
                    50 témat připraveno
                  </span>
                </div>
                <p className="text-xs text-verba-slate">
                  Obsah všech lekcí se vygeneruje až po Vašem explicitním schválení.
                </p>
              </div>

              <button
                onClick={handleApproveOutline}
                disabled={isApproving}
                className="py-3 px-6 rounded-xl bg-verba-indigo hover:bg-verba-indigo-dark text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95 disabled:opacity-50"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Schvaluji osnovu...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Schválit osnovu a generovat kurz</span>
                  </>
                )}
              </button>
            </div>

            {/* List of 50 Lessons in Outline */}
            <div className="verba-card divide-y divide-slate-100 overflow-hidden">
              <div className="p-4 bg-slate-50/60 font-semibold text-xs text-verba-slate uppercase tracking-wider flex justify-between">
                <span>Struktura kurzu: {targetLanguage.toUpperCase()} • {cefrLevel} {domainArea}</span>
                <span>Celkem 50 lekcí (včetně 5 milníků)</span>
              </div>

              {outline.map((item) => {
                const isCheckpoint = item.lesson_number % 10 === 0;

                return (
                  <div
                    key={item.lesson_number}
                    className={`p-4 transition-colors flex items-start gap-4 ${
                      isCheckpoint
                        ? 'bg-amber-50/40 hover:bg-amber-50/70 border-l-4 border-l-verba-review'
                        : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        isCheckpoint
                          ? 'bg-verba-review text-white'
                          : 'bg-indigo-50 text-verba-indigo'
                      }`}
                    >
                      {item.lesson_number}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-verba-ink">
                          {item.title}
                        </h3>
                        {isCheckpoint && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-verba-review shrink-0">
                            Milník Checkpoint {item.lesson_number / 10}
                          </span>
                        )}
                      </div>

                      {item.theme_focus && (
                        <div className="text-xs font-semibold text-verba-indigo flex items-center gap-1.5">
                          <span className="opacity-75">Konkrétní téma:</span>
                          <span>{item.theme_focus}</span>
                        </div>
                      )}

                      <p className="text-xs text-verba-slate leading-relaxed">
                        <span className="font-medium text-verba-ink">Cíl: </span>
                        {item.learning_goal}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
