'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { VerbaLogo } from '../brand/VerbaLogo';
import { ChevronDown, Plus, BookOpen, Trash2, QrCode } from 'lucide-react';
import { MobileQrModal } from '../mobile/MobileQrModal';
import { Course } from '@/lib/db/schema';

interface AppLayoutProps {
  children: React.ReactNode;
  activeCourseId?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  activeCourseId,
}) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  useEffect(() => {
    fetch('/api/courses')
      .then((res) => res.json())
      .then((data: Course[]) => {
        if (Array.isArray(data)) {
          setCourses(data);
          const found = activeCourseId
            ? data.find((c) => c.id === activeCourseId)
            : data[0];
          if (found) setCurrentCourse(found);
        }
      })
      .catch((err) => console.error('Error fetching courses:', err));
  }, [activeCourseId]);

  const handleDeleteCourse = async (
    courseId: string,
    courseName: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    e.preventDefault();

    if (!confirm(`Opravdu chcete smazat kurz „${courseName}“? Všechna data kurzu budou nenávratně odstraněna.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/courses/${courseId}`, { method: 'DELETE' });
      if (res.ok) {
        setCourses((prev) => prev.filter((c) => c.id !== courseId));
        if (currentCourse?.id === courseId) {
          window.location.href = '/';
        }
      } else {
        alert('Chyba při mazání kurzu.');
      }
    } catch (err) {
      console.error('Error deleting course:', err);
    }
  };

  return (
    <div className="min-h-screen bg-verba-canvas flex flex-col md:flex-row text-verba-ink">
      {/* Desktop Sidebar */}
      <Sidebar
        currentCourseId={currentCourse?.id}
        onOpenQr={() => setIsQrModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <Link href="/">
                <VerbaLogo size="sm" showWordmark={true} />
              </Link>
            </div>

            {/* Course Switcher (Only established courses) */}
            {courses.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-300 bg-white text-xs font-medium text-verba-ink transition-colors shadow-2xs"
                >
                  <BookOpen className="w-3.5 h-3.5 text-verba-indigo" />
                  <span className="truncate max-w-[150px] sm:max-w-[220px]">
                    {currentCourse
                      ? `${currentCourse.target_language.toUpperCase()} • ${currentCourse.cefr_level} ${currentCourse.domain_area}`
                      : 'Vyberte kurz'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-verba-slate" />
                </button>

                {isDropdownOpen && (
                  <div
                    className="absolute left-0 mt-1.5 w-72 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-1"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-verba-slate uppercase tracking-wider">
                      Moje aktivní kurzy
                    </div>
                    {courses.map((c) => (
                      <div
                        key={c.id}
                        className={`flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-50 transition-colors group ${
                          c.id === currentCourse?.id
                            ? 'font-semibold text-verba-indigo bg-indigo-50/50'
                            : 'text-verba-ink'
                        }`}
                      >
                        <Link
                          href={`/courses/${c.id}`}
                          className="flex items-center justify-between flex-1 min-w-0 pr-2"
                        >
                          <div className="truncate">
                            <span className="font-semibold mr-1.5">
                              {c.target_language.toUpperCase()} ({c.cefr_level})
                            </span>
                            <span className="text-verba-slate">{c.domain_area}</span>
                          </div>
                          <span className="text-[10px] text-verba-slate shrink-0 ml-2">
                            {c.completed_lessons_count}/50
                          </span>
                        </Link>

                        {/* Delete course button */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCourse(c.id, c.domain_area, e)}
                          className="p-1 rounded-md text-slate-300 hover:text-verba-error hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                          title={`Smazat kurz ${c.domain_area}`}
                          aria-label={`Smazat kurz ${c.domain_area}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <Link
                        href="/courses/new"
                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-verba-indigo hover:bg-indigo-50 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Nový kurz</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Mobile QR Button */}
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-300/80 bg-amber-50/80 hover:bg-amber-100 text-amber-900 text-xs font-medium transition-colors shadow-2xs"
              title="Otevřít na mobilním telefonu (QR kód)"
            >
              <QrCode className="w-3.5 h-3.5 text-amber-700" />
              <span className="hidden sm:inline">Mobilní verze</span>
              <span className="sm:hidden">Mobil</span>
            </button>

            <span className="text-xs font-medium text-verba-slate hidden sm:inline">
              Jana Prošková
            </span>
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-verba-indigo flex items-center justify-center font-bold text-xs">
              JP
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-4 py-6 max-w-5xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav currentCourseId={currentCourse?.id} />

      {/* Mobile QR Code Modal */}
      <MobileQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />
    </div>
  );
};
