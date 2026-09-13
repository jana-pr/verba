'use client';

import React, { useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { 
  CheckCircle2, 
  Loader2, 
  Pause, 
  Play, 
  AlertCircle, 
  ArrowRight,
  Sparkles,
  Layers
} from 'lucide-react';

export default function GenerateCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [course, setCourse] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(50);
  const [currentTitle, setCurrentTitle] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCancelledRef = useRef(false);

  useEffect(() => {
    // 1. Fetch initial course status
    fetch(`/api/courses/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.course) {
          setCourse(data.course);
          setCurrentStep(data.course.completed_lessons_count || 0);

          if (data.course.status === 'ready' || data.course.completed_lessons_count >= 50) {
            setIsCompleted(true);
            setIsGenerating(false);
          } else {
            // Start generation loop
            runGenerationLoop();
          }
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Nepodařilo se načíst stav kurzu.');
      });

    return () => {
      isCancelledRef.current = true;
    };
  }, [id]);

  const runGenerationLoop = async () => {
    isCancelledRef.current = false;
    setIsGenerating(true);
    setError(null);

    while (!isCancelledRef.current) {
      try {
        const res = await fetch(`/api/courses/${id}/generate-step`, {
          method: 'POST',
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Chyba serveru při generování lekce.`);
        }

        const data = await res.json();
        setCurrentStep(data.current);
        setTotalSteps(data.total);
        if (data.lessonTitle) setCurrentTitle(data.lessonTitle);

        if (data.completed || data.current >= 50) {
          setIsCompleted(true);
          setIsGenerating(false);
          break;
        }

        // Slight micro-pause so user can see progress move smoothly
        await new Promise((resolve) => setTimeout(resolve, 150));
      } catch (err: any) {
        console.error('Generation loop error:', err);
        setError(err.message || 'Generování bylo přerušeno. Již vytvořené lekce jsou bezpečně uloženy.');
        setIsGenerating(false);
        break;
      }
    }
  };

  const handleTogglePause = () => {
    if (isGenerating) {
      isCancelledRef.current = true;
      setIsGenerating(false);
    } else {
      runGenerationLoop();
    }
  };

  const percent = Math.min(100, Math.round((currentStep / totalSteps) * 100));

  return (
    <AppLayout activeCourseId={id}>
      <div className="max-w-2xl mx-auto py-8 space-y-8">
        <div>
          <span className="text-xs font-semibold text-verba-slate uppercase tracking-wider">
            Idempotentní generování kurzu
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-verba-ink tracking-tight mt-0.5">
            {isCompleted ? 'Kurz je kompletně připraven!' : 'Generuji obsah 50 lekcí...'}
          </h1>
          <p className="text-xs sm:text-sm text-verba-slate mt-1">
            {isCompleted
              ? 'Všech 50 lekcí, odborných článků, slovní zásoby a cvičení bylo úspěšně uloženo do databáze.'
              : 'Systém inkrementálně vytváří a ukládá jednotlivé lekce. V případě přerušení generování bezpečně naváže tam, kde skončilo.'}
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-verba-review shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Generování bylo pozastaveno: </span>
                {error}
                <div className="mt-1 text-verba-slate">
                  Uloženo: <strong>{currentStep} z 50 lekcí</strong>. Žádná data nebyla ztracena.
                </div>
              </div>
            </div>
            <button
              onClick={runGenerationLoop}
              className="px-4 py-2 rounded-lg bg-verba-indigo text-white font-medium text-xs hover:bg-verba-indigo-dark"
            >
              Pokračovat od lekce {currentStep + 1}
            </button>
          </div>
        )}

        {/* Progress Card */}
        <div className="verba-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isCompleted
                    ? 'bg-emerald-50 text-verba-mastered'
                    : 'bg-indigo-50 text-verba-indigo'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <Loader2 className="w-6 h-6 animate-spin" />
                )}
              </div>
              <div>
                <div className="text-xs font-semibold text-verba-slate">
                  {isCompleted ? 'Hotovo' : 'Zpracovává se'}
                </div>
                <div className="text-base font-bold text-verba-ink">
                  Lekce {currentStep} z {totalSteps}
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-2xl font-black text-verba-indigo">{percent}%</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div
                className="bg-verba-indigo h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>

            {!isCompleted && currentTitle && (
              <div className="flex items-center justify-between text-xs text-verba-slate pt-1 truncate">
                <span className="truncate">Právě uloženo: <strong>{currentTitle}</strong></span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="pt-2 flex items-center justify-between">
            {!isCompleted && (
              <button
                onClick={handleTogglePause}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:border-indigo-200 text-xs font-semibold text-verba-ink hover:text-verba-indigo bg-white transition-colors"
              >
                {isGenerating ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pozastavit</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Pokračovat v generování</span>
                  </>
                )}
              </button>
            )}

            {isCompleted && (
              <button
                onClick={() => router.push(`/courses/${id}`)}
                className="w-full py-3.5 px-6 rounded-xl bg-verba-indigo hover:bg-verba-indigo-dark text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Vstoupit do kurzu</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Feature guarantee reminder */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-verba-slate space-y-1">
          <div className="font-semibold text-verba-ink">Garance stability obsahu:</div>
          <div>
            Vygenerovaný obsah každé lekce je trvale uložen v lokální databázi. Otevření lekce nikdy nezpůsobí její znovuvygenerování.
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
