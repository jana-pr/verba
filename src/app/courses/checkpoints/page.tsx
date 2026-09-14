'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FocusLayout } from '@/components/layout/FocusLayout';
import { CheckCircle2, XCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { getCheckpointData, submitPracticeAnswer } from '@/lib/data-repository';

function CheckpointContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '';
  const num = searchParams.get('num') || '10';

  const [checkpointData, setCheckpointData] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [results, setResults] = useState<any[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [loading, setLoading] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    getCheckpointData(id, Number(num))
      .then((data) => {
        setCheckpointData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [id, num]);

  useEffect(() => {
    if (!loading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [loading, currentIndex]);

  const items = checkpointData?.items || [];
  const currentItem = items[currentIndex];

  const handleNext = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentItem || !userAnswer.trim() || !id) return;

    const answer = userAnswer.trim();

    try {
      const result = await submitPracticeAnswer({
        courseId: id,
        learningItemId: currentItem.id,
        userAnswer: answer,
        direction: currentItem.direction || 'cz_to_target',
        exerciseType: 'checkpoint_test',
      });

      const isCorrect = result.isCorrect;
      if (isCorrect) setScore((prev) => prev + 1);

      setResults((prev) => [
        ...prev,
        {
          item: currentItem,
          userAnswer: answer,
          canonicalAnswer: result.recommendedAnswer || currentItem.canonical_answer,
          isCorrect,
          feedback: result.feedback,
        },
      ]);
    } catch {
      const cleanUser = answer.toLowerCase().trim();
      const cleanCanon = (currentItem.target_text || currentItem.canonical_answer || '').toLowerCase().trim();
      const isCorrect = cleanUser === cleanCanon;
      if (isCorrect) setScore((prev) => prev + 1);

      setResults((prev) => [
        ...prev,
        {
          item: currentItem,
          userAnswer: answer,
          canonicalAnswer: currentItem.target_text || currentItem.canonical_answer,
          isCorrect,
          feedback: isCorrect ? 'Správně.' : `Správná odpověď: ${currentItem.target_text || currentItem.canonical_answer}`,
        },
      ]);
    }

    setUserAnswer('');
    if (currentIndex + 1 < items.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsFinished(true);
    }
  };

  const returnUrl = id ? `/courses/view?id=${id}` : '/courses/my';

  if (loading) {
    return (
      <div className="min-h-screen bg-verba-canvas flex items-center justify-center text-verba-slate">
        Načítání milníku Checkpoint {num}...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-verba-canvas flex flex-col items-center justify-center p-4 text-center space-y-4">
        <p className="text-sm text-verba-slate">Pro tento milník nejsou k dispozici žádná data.</p>
        <button
          onClick={() => router.push(returnUrl)}
          className="px-4 py-2 rounded-xl bg-verba-indigo text-white text-xs font-semibold"
        >
          Zpět do kurzu
        </button>
      </div>
    );
  }

  const passingThreshold = Math.ceil(items.length * 0.8);
  const isPassed = score >= passingThreshold;

  if (isFinished) {
    return (
      <FocusLayout exitHref={returnUrl} title="Výsledek Checkpointu" progressPercent={100}>
        <div className="flex-1 flex flex-col justify-center items-center text-center max-w-md mx-auto space-y-6">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm ${
              isPassed ? 'bg-emerald-50 text-verba-mastered' : 'bg-amber-50 text-verba-review'
            }`}
          >
            {isPassed ? <ShieldCheck className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-verba-slate">
              {checkpointData?.title || `Checkpoint ${num}`}
            </span>
            <h2 className="text-2xl font-bold text-verba-ink">
              {isPassed ? 'Milník úspěšně splněn!' : 'Doporučeno zopakovat slabší lekce'}
            </h2>
            <div className="text-3xl font-black text-verba-indigo py-1">
              {score} / {items.length}
            </div>
            <p className="text-xs text-verba-slate max-w-sm mx-auto">
              {isPassed
                ? 'Dosáhli jste požadované hranice 80 % správných odpovědí. Výborné zvládnutí tohoto bloku lekcí.'
                : 'Pro upevnění doporučujeme projít procvičování zaměřené na lekce tohoto bloku.'}
            </p>
          </div>

          <button
            onClick={() => router.push(returnUrl)}
            className="w-full py-3.5 px-6 rounded-xl bg-verba-indigo hover:bg-verba-indigo-dark text-white font-semibold text-xs sm:text-sm shadow-md"
          >
            Zpět na přehled kurzu
          </button>
        </div>
      </FocusLayout>
    );
  }

  const progressPercent = ((currentIndex + 1) / items.length) * 100;
  const isCzToTarget = currentItem?.direction === 'cz_to_target';

  return (
    <FocusLayout
      exitHref={returnUrl}
      title={`${checkpointData?.title || 'Checkpoint'} (${currentIndex + 1}/${items.length})`}
      progressPercent={progressPercent}
      directionLabel={isCzToTarget ? 'CZ → Target' : 'Target → CZ'}
    >
      <div className="flex-1 flex flex-col justify-between max-w-xl mx-auto w-full py-2 space-y-4">
        {/* Card */}
        <div className="verba-card p-6 sm:p-7 space-y-4 border-amber-200">
          <div className="flex items-center justify-between text-xs text-verba-slate">
            <span className="font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-verba-review font-bold">
              Milník Checkpoint
            </span>
            <span>Lekce {currentItem.lesson_number}</span>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-verba-slate uppercase tracking-wider">
              {isCzToTarget ? 'Vyjádřete v cílovém jazyce:' : 'Přeložte do češtiny:'}
            </div>
            <div className="text-xl sm:text-2xl font-bold text-verba-ink tracking-tight">
              {currentItem.prompt}
            </div>
          </div>

          {currentItem.context_note && (
            <p className="text-xs text-verba-slate pt-2 border-t border-slate-100">
              <span className="font-semibold text-verba-ink">Kontext: </span>
              {currentItem.context_note}
            </p>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleNext} className="space-y-3">
          <input
            ref={inputRef}
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="Zadejte odpověď..."
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            className="w-full px-4 py-3.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-verba-ink focus:outline-hidden focus:border-verba-indigo"
          />

          <button
            type="submit"
            disabled={!userAnswer.trim()}
            className="w-full py-3.5 rounded-xl bg-verba-indigo hover:bg-verba-indigo-dark text-white font-semibold text-sm shadow-md transition-all disabled:opacity-40"
          >
            Odeslat a pokračovat
          </button>
        </form>
      </div>
    </FocusLayout>
  );
}

export default function CheckpointPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-verba-canvas flex items-center justify-center text-verba-slate">Načítání milníku...</div>}>
      <CheckpointContent />
    </Suspense>
  );
}
