'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { MasteryBadge } from '@/components/ui/MasteryBadge';
import { AudioButton } from '@/components/practice/AudioButton';
import { 
  BookOpen, 
  Dumbbell, 
  Headphones, 
  FileText, 
  CheckSquare, 
  ArrowLeft, 
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function LessonDetailPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id, lessonId } = use(params);

  const [activeTab, setActiveTab] = useState<'overview' | 'vocab' | 'article' | 'listening' | 'exercises'>('vocab');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Exercise state
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [exerciseResults, setExerciseResults] = useState<Record<string, any>>({});

  useEffect(() => {
    fetch(`/api/courses/${id}/lessons/${lessonId}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [id, lessonId]);

  if (loading) {
    return (
      <AppLayout activeCourseId={id}>
        <div className="flex items-center justify-center py-20 text-verba-slate">
          Načítání lekce...
        </div>
      </AppLayout>
    );
  }

  if (!data?.lesson) {
    return (
      <AppLayout activeCourseId={id}>
        <div className="text-center py-20 text-verba-slate">Lekce nebyla nalezena.</div>
      </AppLayout>
    );
  }

  const { lesson, items, exercises, transferArticle } = data;
  const currentNum = lesson.lesson_number;

  const handleCheckExercise = async (ex: any) => {
    const answer = userAnswers[ex.id] || '';
    if (!answer.trim()) return;

    try {
      const res = await fetch(`/api/courses/${id}/practice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learning_item_id: null,
          direction: 'cz_to_target',
          user_answer: answer,
          canonical_answer: ex.canonical_answer,
          acceptable_synonyms: ex.acceptable_synonyms,
          exercise_type: ex.exercise_type,
        }),
      });
      const result = await res.json();
      setExerciseResults((prev) => ({ ...prev, [ex.id]: result.evaluation }));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AppLayout activeCourseId={id}>
      <div className="space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/courses/${id}`}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-verba-slate transition-colors"
              title="Zpět na přehled kurzu"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <span className="text-xs font-semibold text-verba-slate uppercase tracking-wider">
                Lekce {lesson.lesson_number} z 50
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-verba-ink tracking-tight">
                {lesson.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/courses/${id}/practice?lessonId=${lesson.lesson_number}`}
              className="py-2 px-4 rounded-xl bg-verba-indigo hover:bg-verba-indigo-dark text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-1.5"
            >
              <Dumbbell className="w-3.5 h-3.5" />
              <span>Procvičit tuto lekci</span>
            </Link>

            {currentNum < 50 && (
              <Link
                href={`/courses/${id}/lessons/${currentNum + 1}`}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-verba-slate transition-colors"
                title="Další lekce"
              >
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>

        {/* Tab Navigation (Horizontally scrollable on mobile) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar select-none border-b border-slate-100">
          {[
            { id: 'vocab', label: 'Vocabulary & Phrases', icon: Sparkles, badge: items?.length },
            { id: 'overview', label: 'Overview & Goals', icon: BookOpen },
            { id: 'article', label: 'Odborný článek', icon: FileText },
            { id: 'listening', label: 'Listening', icon: Headphones },
            { id: 'exercises', label: 'Cvičení & Test', icon: CheckSquare, badge: exercises?.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-verba-indigo text-white font-semibold shadow-xs'
                    : 'bg-white text-verba-slate hover:text-verba-ink border border-slate-200/80 hover:border-indigo-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-verba-slate'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-verba-slate'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: VOCABULARY & PHRASES (Sekce 24: Contextual cards with bidirectional states) */}
        {activeTab === 'vocab' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 text-xs text-verba-slate font-medium">
              <span>{items.length} odborných výrazů a frází</span>
              <span>Obousměrná mastery: Active Recall (CZ→EN) + Comprehension (EN→CZ)</span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {items.map((item: any) => (
                <div
                  key={item.id}
                  className="verba-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 verba-card-hover"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-verba-slate">
                        {item.item_type}
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-verba-ink tracking-tight">
                        {item.target_text}
                      </h3>
                      <AudioButton text={item.target_text} size="sm" />
                      {item.phonetic_hint && (
                        <span className="text-xs text-verba-slate font-mono hidden sm:inline">
                          {item.phonetic_hint}
                        </span>
                      )}
                    </div>

                    <div className="text-sm font-semibold text-verba-indigo">
                      {item.czech_text}
                    </div>

                    {item.context_note && (
                      <p className="text-xs text-verba-slate">
                        <span className="font-semibold text-verba-ink">Kontext: </span>
                        {item.context_note}
                      </p>
                    )}

                    {item.example_sentence_target && (
                      <div className="pt-1 text-xs text-verba-ink bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                        <div className="font-medium italic">„{item.example_sentence_target}“</div>
                        <div className="text-verba-slate mt-0.5">„{item.example_sentence_czech}“</div>
                      </div>
                    )}
                  </div>

                  {/* Bidirectional Mastery Badges & Practice Action */}
                  <div className="flex md:flex-col items-center md:items-end justify-between gap-2 border-t md:border-t-0 pt-2 md:pt-0 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <MasteryBadge
                        state={item.cz_to_target_state}
                        directionLabel="CZ→EN"
                        size="sm"
                      />
                      <MasteryBadge
                        state={item.target_to_cz_state}
                        directionLabel="EN→CZ"
                        size="sm"
                      />
                    </div>

                    <Link
                      href={`/courses/${id}/practice?lessonId=${lesson.lesson_number}&direction=cz_to_target`}
                      className="text-xs font-semibold text-verba-indigo hover:underline flex items-center gap-1"
                    >
                      <span>Trénovat Active Recall</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="verba-card p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-verba-ink">Téma a zaměření</h2>
              <p className="text-sm text-verba-slate leading-relaxed">{lesson.theme_focus}</p>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-verba-ink">Pedagogický princip lekce</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="font-bold text-verba-indigo">1. Understand it</div>
                  <div className="text-verba-slate mt-1">Porozumění terminologii a odbornému kontextu v článku.</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="font-bold text-verba-teal">2. Recall it</div>
                  <div className="text-verba-slate mt-1">Aktivní vybavení z češtiny do cílového jazyka (Active Recall).</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="font-bold text-verba-mastered">3. Use it</div>
                  <div className="text-verba-slate mt-1">Aplikace v novém profesním kontextu v Article & Comprehension.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ARTICLE (Sekce 16 Reader UI) */}
        {activeTab === 'article' && (
          <div className="verba-card p-6 sm:p-8 space-y-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-semibold text-verba-slate uppercase tracking-wider">
                  Profesní článek lekce
                </span>
                <h2 className="text-xl font-bold text-verba-ink tracking-tight mt-0.5">
                  {lesson.article_title}
                </h2>
              </div>
              <AudioButton text={lesson.article_body} size="md" />
            </div>

            <div className="text-sm sm:text-base text-verba-ink leading-relaxed space-y-4 font-normal">
              {lesson.article_body.split('\n\n').map((paragraph: string, idx: number) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: LISTENING */}
        {activeTab === 'listening' && (
          <div className="verba-card p-6 sm:p-8 space-y-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-semibold text-verba-slate uppercase tracking-wider">
                  Listening & Comprehension
                </span>
                <h2 className="text-xl font-bold text-verba-ink tracking-tight mt-0.5">
                  Poslechový scénář
                </h2>
              </div>
              <AudioButton text={lesson.listening_script} size="md" />
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm text-verba-slate leading-relaxed">
              {lesson.listening_script}
            </div>

            <div className="pt-2">
              <Link
                href={`/courses/${id}/practice?lessonId=${lesson.lesson_number}&type=sentences`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-verba-indigo hover:bg-verba-indigo-dark text-white font-medium text-xs shadow-sm"
              >
                <Headphones className="w-4 h-4" />
                <span>Procvičit poslech a přepis</span>
              </Link>
            </div>
          </div>
        )}

        {/* TAB 5: EXERCISES */}
        {activeTab === 'exercises' && (
          <div className="space-y-4 max-w-2xl mx-auto">
            <div className="px-1 text-xs text-verba-slate font-medium">
              Porozuměcí cvičení a test lekce
            </div>

            {exercises?.map((ex: any, idx: number) => {
              const result = exerciseResults[ex.id];
              const answer = userAnswers[ex.id] || '';

              return (
                <div key={ex.id} className="verba-card p-5 sm:p-6 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="w-6 h-6 rounded-md bg-indigo-50 text-verba-indigo text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 text-sm font-semibold text-verba-ink">
                      {ex.prompt}
                    </div>
                  </div>

                  {ex.target_language_context && (
                    <div className="text-xs text-verba-slate italic">
                      {ex.target_language_context}
                    </div>
                  )}

                  {/* Options for choice type */}
                  {ex.options && ex.options.length > 0 ? (
                    <div className="space-y-2">
                      {ex.options.map((opt: string) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setUserAnswers({ ...userAnswers, [ex.id]: opt })}
                          className={`w-full p-3 rounded-xl border text-left text-xs font-medium transition-all ${
                            answer === opt
                              ? 'bg-indigo-50/70 border-verba-indigo text-verba-indigo'
                              : 'bg-white border-slate-200 text-verba-ink hover:bg-slate-50'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={answer}
                      onChange={(e) => setUserAnswers({ ...userAnswers, [ex.id]: e.target.value })}
                      placeholder="Zadejte odpověď..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium text-verba-ink focus:outline-hidden focus:border-verba-indigo"
                    />
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => handleCheckExercise(ex)}
                      disabled={!answer.trim()}
                      className="py-2 px-4 rounded-xl bg-verba-indigo hover:bg-verba-indigo-dark text-white font-medium text-xs disabled:opacity-40"
                    >
                      Zkontrolovat
                    </button>

                    {result && (
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          result.isCorrect
                            ? 'bg-emerald-50 text-verba-mastered border border-emerald-200'
                            : 'bg-rose-50 text-verba-error border border-rose-200'
                        }`}
                      >
                        {result.isCorrect ? 'Správně' : 'Nesprávně'}
                      </span>
                    )}
                  </div>

                  {result && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-verba-ink space-y-1">
                      <div>{result.feedback}</div>
                      {ex.explanation && (
                        <div className="text-verba-slate text-[11px] pt-1 border-t border-slate-200/60">
                          {ex.explanation}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
