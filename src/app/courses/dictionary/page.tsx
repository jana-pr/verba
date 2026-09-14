'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { MasteryBadge } from '@/components/ui/MasteryBadge';
import { AudioButton } from '@/components/practice/AudioButton';
import { Search, BookA, Sparkles, Filter, ArrowRight } from 'lucide-react';
import { getDictionaryItems } from '@/lib/data-repository';

function DictionaryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '';

  const [items, setItems] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({ all: 0, learning: 0, review: 0, mastered: 0, new: 0 });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | learning | review | mastered
  const [itemType, setItemType] = useState(''); // '' | word | expression | phrase | sentence
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    getDictionaryItems(id, search, filter)
      .then((dictItems) => {
        let filtered = dictItems;
        if (itemType) {
          filtered = filtered.filter((it) => it.item_type === itemType);
        }
        setItems(filtered);

        // Compute counts from all items
        getDictionaryItems(id, '', 'all').then((all) => {
          let mastered = 0;
          let review = 0;
          let learning = 0;
          let fresh = 0;
          for (const it of all) {
            if (it.overall_state === 'mastered') mastered++;
            else if (it.overall_state === 'review') review++;
            else if (it.overall_state === 'learning') learning++;
            else fresh++;
          }
          setCounts({
            all: all.length,
            mastered,
            review,
            learning,
            new: fresh,
          });
        });

        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [id, filter, search, itemType]);

  if (!id) {
    return (
      <AppLayout>
        <div className="text-center py-20 text-verba-slate">
          <p className="font-semibold text-base mb-2">Vyberte kurz pro zobrazení slovníku.</p>
          <Link href="/courses/my" className="text-xs font-semibold text-verba-indigo hover:underline">
            Přejít do Mých kurzů
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeCourseId={id}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200/60 pb-4">
          <div>
            <span className="text-xs font-semibold text-verba-slate uppercase tracking-wider">
              Znalostní mapa kurzu
            </span>
            <h1 className="text-2xl font-bold text-verba-ink tracking-tight">
              Centrální slovník (Dictionary)
            </h1>
            <p className="text-xs text-verba-slate mt-0.5">
              Kompletní přehled všech odborných výrazů, frází a vět napříč 50 lekcemi s obousměrným stavem mastery.
            </p>
          </div>

          <div className="text-xs font-semibold text-verba-slate">
            Zobrazeno {items.length} z {counts.all} položek
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="verba-card p-4 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-verba-slate absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Vyhledat v angličtině, češtině nebo kontextu..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm font-medium text-verba-ink focus:outline-hidden focus:border-verba-indigo focus:bg-white"
            />
          </div>

          {/* Filter Tabs matching spec: All / Learning / Review / Mastered */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'Všechny', count: counts.all },
              { id: 'learning', label: 'Učím se (Learning)', count: counts.learning },
              { id: 'review', label: 'K opakování (Review)', count: counts.review },
              { id: 'mastered', label: 'Zvládnuto (Mastered)', count: counts.mastered },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === tab.id
                    ? 'bg-verba-indigo text-white font-bold shadow-2xs'
                    : 'bg-slate-100 text-verba-slate hover:text-verba-ink hover:bg-slate-200/70'
                }`}
              >
                <span>{tab.label}</span>
                <span className="ml-1.5 opacity-75 font-mono text-[10px]">({tab.count})</span>
              </button>
            ))}

            <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

            {/* Type selector */}
            <select
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-verba-slate focus:outline-hidden"
            >
              <option value="">Všechny typy</option>
              <option value="word">Slovíčka (Words)</option>
              <option value="expression">Výrazy (Expressions)</option>
              <option value="phrase">Fráze (Phrases)</option>
              <option value="sentence">Věty (Sentences)</option>
            </select>
          </div>
        </div>

        {/* Dictionary Items List */}
        {loading ? (
          <div className="text-center py-12 text-verba-slate">Načítání slovníku...</div>
        ) : items.length === 0 ? (
          <div className="verba-card p-12 text-center text-verba-slate space-y-2">
            <BookA className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-medium">Nenalezeny žádné položky odpovídající filtru.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="verba-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 verba-card-hover"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-verba-slate">
                      {item.item_type}
                    </span>
                    <Link
                      href={`/courses/lessons?id=${id}&lessonId=${item.lesson_number}`}
                      className="text-[11px] font-semibold text-verba-indigo hover:underline"
                    >
                      Lekce {item.lesson_number}
                    </Link>
                  </div>

                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-verba-ink">
                      {item.target_text}
                    </h3>
                    <AudioButton text={item.target_text} size="sm" />
                    {item.phonetic_hint && (
                      <span className="text-xs text-verba-slate font-mono hidden sm:inline">
                        {item.phonetic_hint}
                      </span>
                    )}
                  </div>

                  <div className="text-sm font-semibold text-verba-teal">
                    {item.czech_text}
                  </div>

                  {item.context_note && (
                    <p className="text-xs text-verba-slate">
                      <span className="font-semibold text-verba-ink">Kontext: </span>
                      {item.context_note}
                    </p>
                  )}

                  {item.example_sentence_target && (
                    <div className="text-xs text-verba-slate italic pt-1">
                      „{item.example_sentence_target}“
                    </div>
                  )}
                </div>

                {/* Bidirectional Mastery Display */}
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-2 border-t md:border-t-0 pt-2 md:pt-0 shrink-0">
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
                    href={`/courses/practice?id=${id}&lessonId=${item.lesson_number}&direction=cz_to_target`}
                    className="text-xs font-semibold text-verba-indigo hover:underline flex items-center gap-1"
                  >
                    <span>Procvičit</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function DictionaryPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20 text-verba-slate">Načítání slovníku...</div>}>
      <DictionaryContent />
    </Suspense>
  );
}
