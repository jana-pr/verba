'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { VerbaLogo } from '../brand/VerbaLogo';
import { 
  ChevronDown, 
  Plus, 
  BookOpen, 
  Trash2, 
  QrCode, 
  Download, 
  Upload, 
  Menu, 
  X, 
  Layers, 
  Dumbbell, 
  RotateCw, 
  BookA, 
  BarChart3, 
  Home, 
  Sparkles 
} from 'lucide-react';
import { MobileQrModal } from '../mobile/MobileQrModal';
import { Course } from '@/lib/db/schema';
import { syncAndRestoreMissingCourses, saveCourseToLocal } from '@/lib/client-storage';

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
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchAndSyncCourses = async () => {
      try {
        const res = await fetch('/api/courses');
        const data: Course[] = await res.json();
        if (Array.isArray(data)) {
          setCourses(data);
          const found = activeCourseId
            ? data.find((c) => c.id === activeCourseId)
            : data[0];
          if (found) setCurrentCourse(found);

          // Auto-cache to local storage
          data.forEach((c) => saveCourseToLocal(c));

          // Auto-sync missing courses if client has them but server lost them (e.g. redeploy)
          const restored = await syncAndRestoreMissingCourses(data);
          if (restored > 0) {
            const reRes = await fetch('/api/courses');
            const reData: Course[] = await reRes.json();
            if (Array.isArray(reData)) setCourses(reData);
          }
        }
      } catch (err) {
        console.error('Error fetching courses:', err);
      }
    };

    fetchAndSyncCourses();
  }, [activeCourseId]);

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const res = await fetch('/api/courses/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });

      if (res.ok) {
        alert('Záloha byla úspěšně obnovena!');
        window.location.reload();
      } else {
        const err = await res.json();
        alert(`Chyba při obnově zálohy: ${err.error || 'Neznámá chyba'}`);
      }
    } catch (err: any) {
      alert(`Neplatný soubor zálohy: ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
    <div className="min-h-screen bg-verba-canvas flex flex-col md:flex-row text-verba-ink w-full max-w-full overflow-x-hidden">
      {/* Desktop Sidebar */}
      <Sidebar
        currentCourseId={currentCourse?.id}
        onOpenQr={() => setIsQrModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full max-w-full pb-20 md:pb-8 overflow-x-hidden">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-3 sm:px-4 py-2.5 flex items-center justify-between w-full max-w-full overflow-x-hidden">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden p-1.5 -ml-1 rounded-lg text-verba-ink hover:bg-slate-100 transition-colors shrink-0"
              aria-label="Otevřít hlavní menu"
              title="Menu navigace"
            >
              <Menu className="w-5 h-5 text-verba-ink" />
            </button>

            {/* Logo */}
            <Link href="/" className="shrink-0">
              <VerbaLogo size="sm" showWordmark={true} />
            </Link>

            {/* Course Switcher Pill */}
            {courses.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-indigo-300 bg-white text-xs font-medium text-verba-ink transition-colors shadow-2xs"
                >
                  <BookOpen className="w-3.5 h-3.5 text-verba-indigo shrink-0" />
                  <span className="truncate max-w-[90px] xs:max-w-[140px] sm:max-w-[200px]">
                    {currentCourse
                      ? `${currentCourse.target_language.toUpperCase()} • ${currentCourse.domain_area}`
                      : 'Vyberte kurz'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-verba-slate shrink-0" />
                </button>

                {isDropdownOpen && (
                  <div
                    className="absolute left-0 mt-1.5 w-72 max-w-[90vw] bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-1"
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
                          className="p-1 rounded-md text-slate-300 hover:text-verba-error hover:bg-rose-50 transition-colors opacity-80 sm:opacity-0 group-hover:opacity-100 shrink-0"
                          title={`Smazat kurz ${c.domain_area}`}
                          aria-label={`Smazat kurz ${c.domain_area}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="border-t border-slate-100 mt-1 pt-1 space-y-0.5">
                      <Link
                        href="/courses/new"
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-verba-indigo hover:bg-indigo-50 transition-colors rounded-md"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Nový kurz z GPT</span>
                      </Link>

                      <div className="border-t border-slate-100 my-1"></div>

                      <a
                        href="/api/courses/backup"
                        download
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors rounded-md"
                        title="Stáhnout kompletní zálohu kurzů do JSON souboru"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>Zálohovat kurzy (JSON)</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors rounded-md"
                        title="Obnovit kurzy ze záložního JSON souboru"
                      >
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>Obnovit ze zálohy</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Mobile QR Button */}
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg border border-amber-300/80 bg-amber-50/80 hover:bg-amber-100 text-amber-900 text-xs font-medium transition-colors shadow-2xs"
              title="Otevřít na mobilním telefonu (QR kód)"
            >
              <QrCode className="w-3.5 h-3.5 text-amber-700" />
              <span className="hidden sm:inline">Mobil</span>
            </button>

            <div className="w-7 h-7 rounded-full bg-indigo-100 text-verba-indigo flex items-center justify-center font-bold text-xs shrink-0">
              JP
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-3 py-4 sm:px-4 sm:py-6 max-w-5xl w-full mx-auto overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav 
        currentCourseId={currentCourse?.id} 
        onOpenMenu={() => setIsMobileDrawerOpen(true)}
      />

      {/* Mobile Navigation Drawer */}
      {isMobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Slide-out Panel */}
          <div className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col justify-between p-4 overflow-y-auto z-10 animate-in slide-in-from-left duration-200">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <Link href="/" onClick={() => setIsMobileDrawerOpen(false)}>
                  <VerbaLogo size="sm" showMotto={true} />
                </Link>
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-verba-ink hover:bg-slate-100"
                  aria-label="Zavřít menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Active Courses Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-verba-slate uppercase tracking-wider">
                    Moje kurzy
                  </span>
                  <Link
                    href="/courses/new"
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="text-[11px] font-semibold text-verba-indigo hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Nový kurz</span>
                  </Link>
                </div>

                <div className="space-y-1">
                  {courses.map((c) => (
                    <div
                      key={c.id}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                        c.id === currentCourse?.id
                          ? 'bg-indigo-50 text-verba-indigo font-bold shadow-xs'
                          : 'hover:bg-slate-50 text-verba-ink'
                      }`}
                    >
                      <Link
                        href={`/courses/${c.id}`}
                        onClick={() => setIsMobileDrawerOpen(false)}
                        className="flex-1 truncate pr-2"
                      >
                        <span className="mr-1">{c.target_language.toUpperCase()} •</span>
                        <span>{c.domain_area}</span>
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCourse(c.id, c.domain_area, e)}
                        className="p-1 text-slate-300 hover:text-verba-error rounded transition-colors"
                        title="Smazat kurz"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation Links for Current Course */}
              <div className="space-y-1 border-t border-slate-100 pt-4">
                <span className="text-[10px] font-bold text-verba-slate uppercase tracking-wider block px-1 mb-2">
                  Navigace kurzem
                </span>

                <Link
                  href="/"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-verba-ink hover:bg-slate-50"
                >
                  <Home className="w-4 h-4 text-verba-slate" />
                  <span>Domů</span>
                </Link>

                {currentCourse && (
                  <>
                    <Link
                      href={`/courses/${currentCourse.id}`}
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-verba-ink hover:bg-slate-50"
                    >
                      <Layers className="w-4 h-4 text-verba-indigo" />
                      <span>Lekce kurzu (50 lekcí)</span>
                    </Link>

                    <Link
                      href={`/courses/${currentCourse.id}/practice`}
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-verba-indigo font-semibold bg-indigo-50/60"
                    >
                      <Dumbbell className="w-4 h-4 text-verba-indigo" />
                      <span>Procvičování (START PRACTICE)</span>
                    </Link>

                    <Link
                      href={`/courses/${currentCourse.id}/review`}
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-verba-ink hover:bg-slate-50"
                    >
                      <RotateCw className="w-4 h-4 text-verba-review" />
                      <span>Opakování (Review 50/25/25)</span>
                    </Link>

                    <Link
                      href={`/courses/${currentCourse.id}/dictionary`}
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-verba-ink hover:bg-slate-50"
                    >
                      <BookA className="w-4 h-4 text-verba-teal" />
                      <span>Centrální slovník</span>
                    </Link>

                    <Link
                      href={`/courses/${currentCourse.id}/progress`}
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-verba-ink hover:bg-slate-50"
                    >
                      <BarChart3 className="w-4 h-4 text-verba-slate" />
                      <span>Můj progress</span>
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Drawer Bottom Actions */}
            <div className="border-t border-slate-100 pt-4 space-y-2 mt-4">
              <Link
                href="/courses/new"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-verba-indigo text-white font-semibold text-xs shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Vložit kurz z GPT</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  setIsQrModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl border border-amber-200 bg-amber-50/80 text-amber-900 text-xs font-medium"
              >
                <QrCode className="w-3.5 h-3.5 text-amber-700" />
                <span>Mobilní QR kód</span>
              </button>

              <div className="flex gap-2 pt-1">
                <a
                  href="/api/courses/backup"
                  download
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border border-slate-200 text-slate-600 text-[11px] font-medium hover:bg-slate-50 text-center"
                >
                  <Download className="w-3 h-3 text-slate-500" />
                  <span>Záloha</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border border-slate-200 text-slate-600 text-[11px] font-medium hover:bg-slate-50 text-center"
                >
                  <Upload className="w-3 h-3 text-slate-500" />
                  <span>Obnovit</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile QR Code Modal */}
      <MobileQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />

      {/* Hidden File Input for Backup Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportBackup}
        accept=".json"
        className="hidden"
      />
    </div>
  );
};
