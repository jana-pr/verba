'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Course, Lesson } from '@/lib/db/schema';
import { 
  BookOpen, 
  Dumbbell, 
  RotateCw, 
  CheckCircle2, 
  ArrowRight, 
  Layers,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Trash2
} from 'lucide-react';

export default function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [outline, setOutline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDeleteCourse = async () => {
    if (!course) return;
    if (!confirm(`Opravdu chcete trvale smazat kurz „${course.domain_area}“? Všechny lekce, slovíčka a historie pokusů budou nenávratně odstraněny.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/courses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        window.location.href = '/';
      } else {
        alert('Chyba při mazání kurzu.');
        setIsDeleting(false);
      }
    } catch (err) {
      console.error(err);
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetch(`/api/courses/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.course) {
          setCourse(data.course);
          setLessons(data.lessons || []);
          setOutline(data.outline || []);
        }
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
          Načítání kurzu...
        </div>
      </AppLayout>
    );
  }

  if (!course) {
    return (
      <AppLayout>
        <div className="text-center py-20 text-verba-slate">Kurz nebyl nalezen.</div>
      </AppLayout>
    );
  }

  // Combine outline and generated lessons
  const lessonItems = Array.from({ length: 50 }, (_, i) => {
    const num = i + 1;
    const generated = lessons.find((l) => l.lesson_number === num);
    const outlineItem = outline.find((o) => o.lesson_number === num);
    const isCheckpoint = num % 10 === 0;

    return {
      number: num,
      title: generated?.title || outlineItem?.title || `Lekce ${num}`,
      theme_focus: generated?.theme_focus || outlineItem?.theme_focus || '',
      isGenerated: Boolean(generated),
      isCheckpoint,
    };
  });

  return (
    <AppLayout activeCourseId={id}>
      <div className="space-y-6">
        {/* Course Header */}
        <div className="verba-card p-4 sm:p-6 border-indigo-100 bg-gradient-to-br from-white via-white to-indigo-50/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-verba-indigo font-bold text-[11px] border border-indigo-100">
                {course.target_language.toUpperCase()} • {course.cefr_level}
              </span>
              <span className="text-[11px] font-semibold text-verba-slate">
                50 lekcí
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-verba-ink tracking-tight truncate">
              {course.domain_area}
            </h1>
            <p className="text-xs text-verba-slate max-w-xl line-clamp-2">
              Kompletní strukturovaný kurz o 50 lekcích s obousměrným nácvikem aktivního vybavení i pasivního porozumění.
            </p>
          </div>

          <div className="flex sm:flex-row md:flex-col gap-2 shrink-0">
            <Link
              href={`/courses/${id}/practice`}
              className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-verba-indigo hover:bg-verba-indigo-dark text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-98"
            >
              <Dumbbell className="w-3.5 h-3.5" />
              <span>START PRACTICE</span>
            </Link>
            <Link
              href={`/courses/${id}/review`}
              className="flex-1 sm:flex-initial py-2 px-3 rounded-xl border border-slate-200 hover:border-indigo-200 bg-white text-verba-ink hover:text-verba-indigo font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCw className="w-3 h-3" />
              <span>Review (50/25/25)</span>
            </Link>
          </div>
        </div>

        {/* Milestone Checkpoints Info Bar (Horizontally scrollable / flexible) */}
        <div className="flex gap-1.5 sm:gap-2 text-center select-none overflow-x-auto pb-1 no-scrollbar w-full max-w-full">
          {[10, 20, 30, 40, 50].map((cp) => (
            <Link
              key={cp}
              href={`/courses/${id}/checkpoints/${cp}`}
              className="flex-1 min-w-[58px] p-2 rounded-xl bg-white border border-slate-200 hover:border-amber-300 hover:bg-amber-50/30 transition-all group shrink-0 sm:shrink"
            >
              <div className="text-[9px] font-bold text-verba-slate group-hover:text-verba-review uppercase">
                CP {cp / 10}
              </div>
              <div className="text-[11px] font-extrabold text-verba-ink mt-0.5">
                Lekce {cp}
              </div>
            </Link>
          ))}
        </div>

        {/* 50 Lessons Grid / List (Svobodný výběr) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-bold text-verba-ink">
              Všech 50 lekcí kurzu
            </h2>
            <span className="text-xs text-verba-slate font-medium">
              Připraveno {lessons.length} z 50 lekcí
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lessonItems.map((item) => (
              <Link
                key={item.number}
                href={`/courses/${id}/lessons/${item.number}`}
                className={`verba-card p-4 flex items-start justify-between gap-3 verba-card-hover ${
                  item.isCheckpoint
                    ? 'border-l-4 border-l-verba-review bg-amber-50/20'
                    : ''
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                      item.isCheckpoint
                        ? 'bg-verba-review text-white'
                        : 'bg-indigo-50 text-verba-indigo'
                    }`}
                  >
                    {item.number}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-bold text-verba-ink truncate">
                        {item.title}
                      </h3>
                      {item.isCheckpoint && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-amber-100 text-verba-review shrink-0">
                          Milník
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-verba-slate truncate mt-0.5">
                      {item.theme_focus}
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-verba-slate shrink-0 mt-2" />
              </Link>
            ))}
          </div>
        </div>

        {/* Course Management & Danger Zone */}
        <div className="verba-card p-6 border-slate-200/80 bg-white space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-verba-ink">Správa kurzu</h3>
              <p className="text-xs text-verba-slate mt-0.5">
                Pokud již tento kurz nepotřebujete, můžete jej trvale smazat včetně všech vygenerovaných lekcí a historie pokusů.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDeleteCourse}
              disabled={isDeleting}
              className="py-2.5 px-4 rounded-xl border border-rose-200 text-verba-error hover:bg-rose-50 text-xs font-semibold flex items-center justify-center gap-2 transition-colors shrink-0 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeleting ? 'Mažu kurz...' : 'Smazat tento kurz'}</span>
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
