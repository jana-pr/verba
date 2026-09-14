'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FocusLayout } from '@/components/layout/FocusLayout';
import { AudioButton } from '@/components/practice/AudioButton';
import { Check, ArrowRight, RotateCw, AlertCircle } from 'lucide-react';

import { MasteryBadge } from '@/components/ui/MasteryBadge';
import { getPracticeQueue, submitPracticeAnswer } from '@/lib/data-repository';

function CourseReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '';

  const [cards, setCards] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    getPracticeQueue(id, 'review')
      .then((queue) => {
        const mapped = queue.map((item) => {
          const cardDir = Math.random() > 0.5 ? 'cz_to_target' : 'target_to_cz';
          return {
            ...item,
            direction: cardDir,
            prompt: cardDir === 'cz_to_target' ? item.czech_text : item.target_text,
            canonical_answer: cardDir === 'cz_to_target' ? item.target_text : item.czech_text,
          };
        });
        setCards(mapped);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!loading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [loading, currentIndex, feedback]);

  const currentCard = cards[currentIndex];

  const handleCheck = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentCard || !userAnswer.trim() || isSubmitting || feedback || !id) return;

    setIsSubmitting(true);

    try {
      const result = await submitPracticeAnswer({
        courseId: id,
        learningItemId: currentCard.id,
        userAnswer: userAnswer.trim(),
        direction: currentCard.direction,
        exerciseType: 'course_review',
      });

      setFeedback({
        evaluation: {
          isCorrect: result.isCorrect,
          feedback: result.feedback || (result.isCorrect ? 'Správně.' : `Doporučená formulace: „${result.recommendedAnswer}“.`),
          score: result.score,
          verdict: result.isCorrect ? 'correct' : 'incorrect',
          recommendedAnswer: result.recommendedAnswer,
        }
      });
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
      setIsFinished(true);
    }
  };

  const returnUrl = id ? `/courses/view?id=${id}` : '/courses/my';

  if (loading) {
    return (
      <div className="min-h-screen bg-verba-canvas flex items-center justify-center text-verba-slate">
        Připravuji Course Review (50/25/25)...
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="min-h-screen bg-verba-canvas flex flex-col items-center justify-center p-4 text-center space-y-4">
        <p className="text-sm text-verba-slate">Zatím nejsou k dispozici žádné položky k opakování.</p>
        <button
          onClick={() => router.push(returnUrl)}
          className="px-4 py-2 rounded-xl bg-verba-indigo text-white text-xs font-semibold"
        >
          Zpět do kurzu
        </button>
      </div>
    );
  }

  if (isFinished) {
    return (
      <FocusLayout exitHref={returnUrl} title="Review Hotovo" progressPercent={100}>
        <div className="flex-1 flex flex-col justify-center items-center text-center max-w-md mx-auto space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-verba-mastered flex items-center justify-center shadow-sm">
            <Check className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-verba-ink">Course Review dokončeno</h2>
            <p className="text-xs sm:text-sm text-verba-slate">
              Úspěšně jste zopakovali průřez kurzem dle schválené skladby: 50 % slabé položky, 25 % starší učivo a 25 % upevnění zvládnutého.
            </p>
          </div>
          <button
            onClick={() => router.push(returnUrl)}
            className="w-full py-3.5 px-6 rounded-xl bg-verba-indigo text-white font-semibold text-xs sm:text-sm shadow-md"
          >
            Zpět na přehled kurzu
          </button>
        </div>
      </FocusLayout>
    );
  }

  const progressPercent = ((currentIndex + 1) / cards.length) * 100;
  const isCzToTarget = currentCard?.direction === 'cz_to_target';

  return (
    <FocusLayout
      exitHref={returnUrl}
      title={`Review: ${currentIndex + 1} z ${cards.length}`}
      progressPercent={progressPercent}
      directionLabel={isCzToTarget ? 'CZ → Target' : 'Target → CZ'}
    >
      <div className="flex-1 flex flex-col justify-between max-w-xl mx-auto w-full py-2 space-y-4">
        {/* Card */}
        <div className="verba-card p-6 sm:p-7 space-y-4">
          <div className="flex items-center justify-between text-xs text-verba-slate">
            <span className="font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-verba-review border border-amber-200">
              Spaced Review
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

        {/* Input & Feedback */}
        <div className="space-y-3">
          <form onSubmit={handleCheck} className="space-y-3">
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
                  : 'border-slate-300 bg-white text-verba-ink focus:border-verba-indigo'
              }`}
            />

            {feedback && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-1 animate-in fade-in duration-150 ${
                  feedback.evaluation.isCorrect
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-slate-50 border-slate-200 text-verba-ink'
                }`}
              >
                <div className="font-bold text-sm">
                  {feedback.evaluation.isCorrect ? (
                    <span className="text-verba-mastered">Správně</span>
                  ) : (
                    <span className="text-verba-slate">Správná formulace:</span>
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

            <div className="pt-1">
              {!feedback ? (
                <button
                  type="submit"
                  disabled={!userAnswer.trim() || isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-verba-indigo hover:bg-verba-indigo-dark text-white font-semibold text-sm shadow-md transition-all disabled:opacity-40"
                >
                  Zkontrolovat
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleContinue}
                  className="w-full py-3.5 rounded-xl bg-verba-indigo hover:bg-verba-indigo-dark text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
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

export default function CourseReviewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-verba-canvas flex items-center justify-center text-verba-slate">Načítání review...</div>}>
      <CourseReviewContent />
    </Suspense>
  );
}
