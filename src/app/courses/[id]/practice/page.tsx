'use client';

import React, { useEffect, useState, use, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FocusLayout } from '@/components/layout/FocusLayout';
import { AudioButton } from '@/components/practice/AudioButton';
import { markCourseAsOpened, recordStateProgress } from '@/lib/client-storage';
import { 
  Check, 
  ArrowRight, 
  Volume2, 
  RotateCw, 
  Sparkles, 
  FileText, 
  Dumbbell 
} from 'lucide-react';

export default function PracticePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const lessonId = searchParams.get('lessonId');
  const initialDirection = searchParams.get('direction') || 'mixed';
  const initialType = searchParams.get('type') || 'mixed';

  // Session configuration state
  const [direction, setDirection] = useState(initialDirection);
  const [contentType, setContentType] = useState(initialType);
  const [isSessionActive, setIsSessionActive] = useState(false);

  // Cards and queue state
  const [cards, setCards] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<any | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const startSession = async () => {
    try {
      const query = new URLSearchParams({
        direction,
        type: contentType,
        ...(lessonId ? { lessonId } : {}),
      });

      const res = await fetch(`/api/courses/${id}/practice?${query}`);
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        setCards(data);
        setCurrentIndex(0);
        setUserAnswer('');
        setFeedback(null);
        setSessionSummary(null);
        setIsSessionActive(true);
      }
    } catch (err) {
      console.error('Error starting practice session:', err);
    }
  };

  const currentCard = cards[currentIndex];

  useEffect(() => {
    if (isSessionActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSessionActive, currentIndex, feedback]);

  const handleCheck = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentCard || !userAnswer.trim() || isSubmitting || feedback) return;

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/courses/${id}/practice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learning_item_id: currentCard.id,
          direction: currentCard.direction,
          user_answer: userAnswer.trim(),
          canonical_answer: currentCard.canonical_answer,
          exercise_type: 'type_target',
        }),
      });

      const data = await res.json();
      setFeedback(data);

      if (data.masteryUpdate) {
        recordStateProgress({
          learning_item_id: currentCard.id,
          course_id: id,
          cz_to_target_state: currentCard.direction === 'cz_to_target' ? data.masteryUpdate.newState : currentCard.cz_to_target_state,
          cz_to_target_streak: currentCard.direction === 'cz_to_target' ? data.masteryUpdate.streak : currentCard.cz_to_target_streak,
          target_to_cz_state: currentCard.direction === 'target_to_cz' ? data.masteryUpdate.newState : currentCard.target_to_cz_state,
          target_to_cz_streak: currentCard.direction === 'target_to_cz' ? data.masteryUpdate.streak : currentCard.target_to_cz_streak,
          overall_state: data.masteryUpdate.overallState,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinue = () => {
    setUserAnswer('');
    setFeedback(null);

    if (currentIndex + 1 < cards.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Session finished
      setSessionSummary({
        total: cards.length,
      });
    }
  };

  // 1. SETUP / CONFIGURATION SCREEN (Before starting Focus Mode)
  if (!isSessionActive) {
    return (
      <div className="min-h-screen bg-verba-canvas p-4 flex flex-col justify-center max-w-xl mx-auto space-y-6 select-none">
        <div className="space-y-2">
          <span className="text-xs font-semibold text-verba-slate uppercase tracking-wider">
            Practice Setup
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-verba-ink tracking-tight">
            Procvičování ve Focus Mode
          </h1>
          <p className="text-xs sm:text-sm text-verba-slate">
            Zvolte směr a typ obsahu pro nerušené, soustředěné procvičování.
          </p>
        </div>

        <div className="verba-card p-6 space-y-6">
          {/* Direction selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-verba-ink uppercase tracking-wider">
              Směr učení (Direction)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'cz_to_target', label: 'CZ → Cizí jazyk', sub: 'Active Recall' },
                { id: 'target_to_cz', label: 'Cizí jazyk → CZ', sub: 'Comprehension' },
                { id: 'mixed', label: 'Kombinovaný', sub: 'Dle slabšího' },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDirection(d.id)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    direction === d.id
                      ? 'border-verba-indigo bg-indigo-50/50 text-verba-indigo shadow-2xs font-semibold'
                      : 'border-slate-200 bg-white text-verba-slate hover:border-indigo-200'
                  }`}
                >
                  <div className="text-xs font-bold">{d.label}</div>
                  <div className="text-[10px] opacity-80 mt-0.5">{d.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Content Type selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-verba-ink uppercase tracking-wider">
              Typ obsahu (Content Type)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'words', label: 'Slovíčka' },
                { id: 'phrases', label: 'Fráze' },
                { id: 'sentences', label: 'Celé věty' },
                { id: 'mixed', label: 'Vše (Mixed)' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setContentType(t.id)}
                  className={`p-2.5 rounded-xl border text-center text-xs font-medium transition-all ${
                    contentType === t.id
                      ? 'border-verba-indigo bg-indigo-50 text-verba-indigo font-bold'
                      : 'border-slate-200 bg-white text-verba-slate hover:border-indigo-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startSession}
            className="w-full py-3.5 px-6 rounded-xl bg-verba-indigo hover:bg-verba-indigo-dark text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <Dumbbell className="w-4 h-4" />
            <span>Spustit Focus Mode</span>
          </button>
        </div>

        <button
          onClick={() => router.push(`/courses/${id}`)}
          className="text-center text-xs font-medium text-verba-slate hover:text-verba-ink py-2"
        >
          Zpět na přehled kurzu
        </button>
      </div>
    );
  }

  // 2. SESSION SUMMARY SCREEN
  if (sessionSummary) {
    return (
      <FocusLayout
        exitHref={`/courses/${id}`}
        title="Dokončeno"
        progressPercent={100}
      >
        <div className="flex-1 flex flex-col justify-center items-center text-center max-w-md mx-auto space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-verba-mastered flex items-center justify-center shadow-sm">
            <Check className="w-8 h-8 stroke-[2.5]" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-verba-ink">
              Procvičování dokončeno
            </h2>
            <p className="text-xs sm:text-sm text-verba-slate">
              Všechny položky byly vyhodnoceny a Vaše obousměrná historie pokusů byla úspěšně aktualizována.
            </p>
          </div>

          <div className="w-full flex flex-col gap-2 pt-4">
            <button
              onClick={() => {
                setIsSessionActive(false);
                startSession();
              }}
              className="w-full py-3 px-6 rounded-xl bg-verba-indigo hover:bg-verba-indigo-dark text-white font-semibold text-xs sm:text-sm shadow-sm transition-all"
            >
              Další série procvičování
            </button>
            <button
              onClick={() => router.push(`/courses/${id}`)}
              className="w-full py-3 px-6 rounded-xl border border-slate-200 bg-white text-verba-slate hover:text-verba-ink font-medium text-xs sm:text-sm transition-colors"
            >
              Zpět na přehled kurzu
            </button>
          </div>
        </div>
      </FocusLayout>
    );
  }

  // 3. FOCUS MODE ACTIVE CARD VIEW (iPhone 12 mini ergonomics)
  const progressPercent = ((currentIndex + 1) / cards.length) * 100;
  const isCzToTarget = currentCard?.direction === 'cz_to_target';

  return (
    <FocusLayout
      exitHref={`/courses/${id}`}
      title={`${currentIndex + 1} z ${cards.length}`}
      progressPercent={progressPercent}
      directionLabel={isCzToTarget ? 'CZ → Target' : 'Target → CZ'}
    >
      <div className="flex-1 flex flex-col justify-between max-w-xl mx-auto w-full py-2 space-y-4">
        {/* Prompt Card */}
        <div className="verba-card p-6 sm:p-7 space-y-4">
          <div className="flex items-center justify-between text-xs text-verba-slate">
            <span className="font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-md bg-slate-100">
              {currentCard?.item_type}
            </span>
            <span>Lekce {currentCard?.lesson_number}</span>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-verba-slate uppercase tracking-wider">
              {isCzToTarget ? 'Vyjádřete v cílovém jazyce:' : 'Přeložte do češtiny:'}
            </div>
            <div className="text-xl sm:text-2xl font-bold text-verba-ink tracking-tight flex items-center gap-3">
              <span>{currentCard?.prompt}</span>
              {!isCzToTarget && <AudioButton text={currentCard?.prompt} size="sm" />}
            </div>
          </div>

          {currentCard?.context_note && (
            <p className="text-xs text-verba-slate pt-2 border-t border-slate-100">
              <span className="font-semibold text-verba-ink">Kontext: </span>
              {currentCard.context_note}
            </p>
          )}
        </div>

        {/* Answer Input & Feedback Block (Optimized for soft keyboard on small screens) */}
        <div className="space-y-3">
          <form onSubmit={handleCheck} className="space-y-3">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                disabled={Boolean(feedback)}
                placeholder="Zadejte odpověď..."
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                className={`w-full px-4 py-3.5 rounded-xl border text-sm font-medium transition-colors focus:outline-hidden ${
                  feedback
                    ? feedback.evaluation.isCorrect
                      ? 'border-emerald-300 bg-emerald-50/20 text-emerald-950'
                      : 'border-rose-300 bg-rose-50/20 text-rose-950'
                    : 'border-slate-300 bg-white text-verba-ink focus:border-verba-indigo focus:ring-1 focus:ring-verba-indigo'
                }`}
              />
            </div>

            {/* Calm, Non-punishing Feedback Banner (Sekce 25) */}
            {feedback && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-1 animate-in fade-in duration-150 ${
                  feedback.evaluation.isCorrect
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-slate-50 border-slate-200 text-verba-ink'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  {feedback.evaluation.isCorrect ? (
                    <span className="text-verba-mastered">Správně</span>
                  ) : (
                    <span className="text-verba-slate font-bold">Doporučená formulace:</span>
                  )}
                </div>

                {!feedback.evaluation.isCorrect && (
                  <div className="text-sm font-bold text-verba-indigo flex items-center gap-2">
                    <span>{currentCard?.canonical_answer}</span>
                    {isCzToTarget && <AudioButton text={currentCard?.canonical_answer} size="sm" />}
                  </div>
                )}

                <div className="text-verba-slate text-[11px] pt-1">
                  {feedback.evaluation.feedback}
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-1">
              {!feedback ? (
                <button
                  type="submit"
                  disabled={!userAnswer.trim() || isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-verba-indigo hover:bg-verba-indigo-dark text-white font-semibold text-sm shadow-md transition-all disabled:opacity-40 active:scale-98"
                >
                  Zkontrolovat
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleContinue}
                  className="w-full py-3.5 rounded-xl bg-verba-indigo hover:bg-verba-indigo-dark text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
                >
                  <span>Pokračovat</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </FocusLayout>
  );
}
