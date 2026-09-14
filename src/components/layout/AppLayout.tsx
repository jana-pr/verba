'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  Sparkles,
  Check,
  GraduationCap,
  ArrowRight
} from 'lucide-react';
import { MobileQrModal } from '../mobile/MobileQrModal';
import { Course } from '@/lib/db/schema';
import { 
  markCourseAsOpened, 
  markCourseAsClosed,
  markCourseAsDeleted,
  getLastActiveCourseId, 
  performAutoSync, 
  getClientVault,
  saveClientVault,
  getAllMergedCourses,
  getOpenedCourses,
  DEFAULT_PRESET_COURSES
} from '@/lib/client-storage';
import { getAllCourses, deleteCoursePermanently } from '@/lib/data-repository';

interface AppLayoutProps {
  children: React.ReactNode;
  activeCourseId?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  activeCourseId,
}) => {
  const pathname = usePathname();
  const [urlCourseId, setUrlCourseId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const qId = params.get('id');
      if (qId) setUrlCourseId(qId);
    }
  }, [pathname]);

  const effectiveCourseId = activeCourseId || urlCourseId || null;

  // All available courses (presets + imported)
  const [courses, setCourses] = useState<Course[]>(() => {
    return getAllMergedCourses();
  });

  // Opened courses only ("Mé kurzy")
  const [openedCourses, setOpenedCourses] = useState<Course[]>(() => {
    return getOpenedCourses(getAllMergedCourses());
  });

  const [currentCourse, setCurrentCourse] = useState<Course | null>(() => {
    const all = getAllMergedCourses();
    const opened = getOpenedCourses(all);
    const savedActiveId = getLastActiveCourseId();
    const targetId = effectiveCourseId || savedActiveId;
    return (targetId && all.find((c: any) => c.id === targetId)) || opened[0] || all[0] || null;
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Synchronously update current course when route or prop changes
  useEffect(() => {
    if (effectiveCourseId && currentCourse?.id !== effectiveCourseId) {
      const found = courses.find((c) => c.id === effectiveCourseId);
      if (found) {
        setCurrentCourse(found);
        markCourseAsOpened(found.id, found);
      }
    }
  }, [effectiveCourseId]);

  // Fetch server courses once on mount and run delayed auto-sync
  useEffect(() => {
    let isMounted = true;

    const fetchCourses = async () => {
      try {
        const merged = await getAllCourses();
        if (isMounted) {
          const opened = getOpenedCourses(merged);
          setCourses(merged);
          setOpenedCourses(opened);

          const savedActiveId = getLastActiveCourseId();
          const targetId = effectiveCourseId || savedActiveId;
          const found = (targetId && merged.find((c) => c.id === targetId)) || opened[0] || merged[0];
          if (found) {
            setCurrentCourse(found);
          }
        }
      } catch (err) {
        console.error('Error fetching courses:', err);
      }
    };

    fetchCourses();

    // Background auto-sync throttled once after 3 seconds
    const syncTimer = setTimeout(() => {
      if (isMounted) {
        performAutoSync().catch(() => {});
      }
    }, 3000);

    const handleCoursesUpdated = () => {
      const all = getAllMergedCourses();
      const opened = getOpenedCourses(all);
      setCourses(all);
      setOpenedCourses(opened);
      fetchCourses();
    };

    window.addEventListener('courses-updated', handleCoursesUpdated);
    return () => {
      isMounted = false;
      clearTimeout(syncTimer);
      window.removeEventListener('courses-updated', handleCoursesUpdated);
    };
  }, []);

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const vault = getClientVault();
      if (Array.isArray(json.courses)) {
        vault.courses = json.courses;
      }
      if (Array.isArray(json.states)) {
        vault.states = json.states;
      }
      saveClientVault(vault);

      alert('Záloha byla úspěšně obnovena!');
      window.dispatchEvent(new Event('courses-updated'));
      window.location.reload();
    } catch (err: any) {
      alert(`Neplatný soubor zálohy: ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportBackup = () => {
    const vault = getClientVault();
    const blob = new Blob([JSON.stringify(vault, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verba-zaloha-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Close course from "Mé kurzy" (retains it in "Předpřipravené kurzy" / DB)
  const handleCloseCourse = (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    markCourseAsClosed(courseId);
    const remaining = openedCourses.filter((c) => c.id !== courseId);
    setOpenedCourses(remaining);

    // If current active course was closed, navigate to next available opened course
    if (currentCourse?.id === courseId) {
      if (remaining.length > 0) {
        const next = remaining[0];
        setCurrentCourse(next);
        markCourseAsOpened(next.id, next);
        window.location.href = `/courses/view?id=${next.id}`;
      } else {
        window.location.href = '/courses/new?tab=presets';
      }
    }
  };

  const handleDeleteCourse = async (
    courseId: string,
    courseName: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    e.preventDefault();

    if (!confirm(`Opravdu chcete trvale smazat kurz „${courseName}“? Všechna data kurzu budou nenávratně odstraněna.`)) {
      return;
    }

    try {
      // 1. Immediately mark deleted in client storage so it NEVER reappears
      markCourseAsDeleted(courseId);

      // 2. Remove from local state immediately
      const remainingAll = courses.filter((c) => c.id !== courseId);
      const remainingOpened = openedCourses.filter((c) => c.id !== courseId);
      setCourses(remainingAll);
      setOpenedCourses(remainingOpened);

      // 3. Call permanent cloud deletion
      await deleteCoursePermanently(courseId);

      // 4. Dispatch event to notify all components
      window.dispatchEvent(new Event('courses-updated'));

      // 5. If deleted course was active, switch to next available or redirect
      if (currentCourse?.id === courseId) {
        if (remainingOpened.length > 0) {
          const nextCourse = remainingOpened[0];
          setCurrentCourse(nextCourse);
          markCourseAsOpened(nextCourse.id, nextCourse);
          window.location.href = `/courses/view?id=${nextCourse.id}`;
        } else if (remainingAll.length > 0) {
          window.location.href = '/courses/new?tab=presets';
        } else {
          window.location.href = '/courses/new';
        }
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

            {/* Direct button to My Courses */}
            <Link
              href="/courses/my"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 bg-white text-xs font-semibold text-verba-ink transition-colors shadow-2xs shrink-0"
              title="Zobrazit přehled všech otevřených kurzů"
            >
              <GraduationCap className="w-3.5 h-3.5 text-verba-indigo shrink-0" />
              <span className="hidden sm:inline">Mé kurzy</span>
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-50 text-verba-indigo text-[10px] font-bold">
                {openedCourses.length}
              </span>
            </Link>

            {/* Course Switcher Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-indigo-300 bg-white text-xs font-medium text-verba-ink transition-colors shadow-2xs"
                aria-label="Přepnout kurz"
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
                <>
                  {/* Backdrop to close on tap outside */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsDropdownOpen(false)} 
                  />
                  <div
                    className="absolute left-0 mt-1.5 w-80 max-w-[90vw] bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-1"
                  >
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-verba-slate uppercase tracking-wider flex items-center justify-between border-b border-slate-50 pb-1.5 mb-1">
                      <Link 
                        href="/courses/my" 
                        onClick={() => setIsDropdownOpen(false)}
                        className="hover:text-verba-indigo flex items-center gap-1"
                      >
                        <span>Mé kurzy ({openedCourses.length})</span>
                      </Link>
                      <Link 
                        href="/courses/my"
                        onClick={() => setIsDropdownOpen(false)}
                        className="text-[9px] text-verba-indigo font-normal hover:underline"
                      >
                        Celý přehled &rarr;
                      </Link>
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                      {openedCourses.length === 0 ? (
                        <div className="px-3 py-5 text-center text-xs text-slate-400 space-y-2">
                          <p>Nemáte otevřený žádný kurz.</p>
                          <Link
                            href="/courses/new?tab=presets"
                            onClick={() => setIsDropdownOpen(false)}
                            className="inline-block text-xs font-semibold text-verba-indigo hover:underline"
                          >
                            Otevřít z předpřipravených &rarr;
                          </Link>
                        </div>
                      ) : (
                        openedCourses.map((c) => {
                          const isSelected = c.id === currentCourse?.id;
                          return (
                            <div
                              key={c.id}
                              className={`flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-50 transition-colors group ${
                                isSelected
                                  ? 'font-semibold text-verba-indigo bg-indigo-50/60'
                                  : 'text-verba-ink'
                              }`}
                            >
                              <Link
                                href={`/courses/view?id=${c.id}`}
                                onClick={() => {
                                  setCurrentCourse(c);
                                  markCourseAsOpened(c.id, c);
                                  setIsDropdownOpen(false);
                                }}
                                className="flex items-center justify-between flex-1 min-w-0 pr-2"
                              >
                                <div className="truncate flex items-center gap-1.5">
                                  {isSelected && (
                                    <Check className="w-3.5 h-3.5 text-verba-indigo shrink-0 stroke-[2.5]" />
                                  )}
                                  <div className="truncate">
                                    <span className="font-semibold mr-1.5">
                                      {c.target_language.toUpperCase()} ({c.cefr_level})
                                    </span>
                                    <span className="text-verba-slate">{c.domain_area}</span>
                                  </div>
                                </div>
                                <span className="text-[10px] text-verba-slate shrink-0 ml-2 font-normal">
                                  {c.completed_lessons_count || 50}/{c.total_lessons || 50}
                                </span>
                              </Link>

                              <div className="flex items-center gap-1 shrink-0">
                                {/* Close course button (removes from Mé kurzy, keeps in catalog) */}
                                <button
                                  type="button"
                                  onClick={(e) => handleCloseCourse(c.id, e)}
                                  className="p-1 rounded-md text-slate-400 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                                  title={`Zavřít kurz „${c.domain_area}“ (zůstane v Předpřipravených kurzech)`}
                                  aria-label={`Zavřít kurz ${c.domain_area}`}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>

                                {/* Permanent delete button */}
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteCourse(c.id, c.domain_area, e)}
                                  className="p-1 rounded-md text-slate-400 hover:text-verba-error hover:bg-rose-50 transition-colors"
                                  title={`Trvale smazat kurz „${c.domain_area}“`}
                                  aria-label={`Trvale smazat kurz ${c.domain_area}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="border-t border-slate-100 mt-1 pt-1 space-y-0.5">
                      <Link
                        href="/courses/new?tab=presets"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-verba-indigo hover:bg-indigo-50/60 transition-colors rounded-md"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-verba-indigo" />
                        <span>Předpřipravené kurzy (katalog)</span>
                      </Link>

                      <Link
                        href="/courses/new?tab=import"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-verba-indigo hover:bg-indigo-50 transition-colors rounded-md"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Nový kurz z GPT</span>
                      </Link>

                      <div className="border-t border-slate-100 my-1"></div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsDropdownOpen(false);
                            handleExportBackup();
                          }}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors rounded-md text-left"
                          title="Stáhnout kompletní zálohu kurzů do JSON souboru"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-500" />
                          <span>Zálohovat kurzy (JSON)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsDropdownOpen(false);
                            fileInputRef.current?.click();
                          }}
                          className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors rounded-md"
                          title="Obnovit kurzy ze záložního JSON souboru"
                        >
                          <Upload className="w-3.5 h-3.5 text-slate-500" />
                          <span>Obnovit ze zálohy</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
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
                    Mé kurzy ({openedCourses.length})
                  </span>
                  <Link
                    href="/courses/new?tab=presets"
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="text-[11px] font-semibold text-verba-indigo hover:underline flex items-center gap-1"
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>Katalog kurzů</span>
                  </Link>
                </div>

                <div className="space-y-1">
                  {openedCourses.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400 space-y-1">
                      <p>Nemáte otevřený žádný kurz.</p>
                      <Link
                        href="/courses/new?tab=presets"
                        onClick={() => setIsMobileDrawerOpen(false)}
                        className="text-xs font-semibold text-verba-indigo hover:underline"
                      >
                        Vybrat kurz z katalogu &rarr;
                      </Link>
                    </div>
                  ) : (
                    openedCourses.map((c) => {
                      const isSelected = c.id === currentCourse?.id;
                      return (
                        <div
                          key={c.id}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                            isSelected
                              ? 'bg-indigo-50 text-verba-indigo font-bold shadow-xs'
                              : 'hover:bg-slate-50 text-verba-ink'
                          }`}
                        >
                          <Link
                            href={`/courses/view?id=${c.id}`}
                            onClick={() => {
                              setCurrentCourse(c);
                              markCourseAsOpened(c.id, c);
                              setIsMobileDrawerOpen(false);
                            }}
                            className="flex-1 truncate pr-2 flex items-center gap-1.5"
                          >
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-verba-indigo shrink-0 stroke-[2.5]" />
                            )}
                            <span className="mr-1">{c.target_language.toUpperCase()} •</span>
                            <span>{c.domain_area}</span>
                            <span className="text-[10px] text-verba-slate ml-1.5 font-normal">
                              ({c.completed_lessons_count || 50}/{c.total_lessons || 50})
                            </span>
                          </Link>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleCloseCourse(c.id, e)}
                              className="p-1 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors"
                              title={`Zavřít kurz „${c.domain_area}“ (zůstane v Předpřipravených kurzech)`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleDeleteCourse(c.id, c.domain_area, e)}
                              className="p-1 text-slate-400 hover:text-verba-error hover:bg-rose-50 rounded transition-colors"
                              title={`Trvale smazat kurz „${c.domain_area}“`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
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

                <Link
                  href="/courses/my"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-verba-indigo bg-indigo-50/50 hover:bg-indigo-50"
                >
                  <div className="flex items-center gap-3">
                    <GraduationCap className="w-4 h-4 text-verba-indigo" />
                    <span>Mé kurzy</span>
                  </div>
                  <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-verba-indigo text-[10px] font-bold">
                    {openedCourses.length}
                  </span>
                </Link>

                {currentCourse && (
                  <>
                    <Link
                      href={`/courses/view?id=${currentCourse.id}`}
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-verba-ink hover:bg-slate-50"
                    >
                      <Layers className="w-4 h-4 text-verba-indigo" />
                      <span>Lekce kurzu (50 lekcí)</span>
                    </Link>

                    <Link
                      href={`/courses/practice?id=${currentCourse.id}`}
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-verba-indigo font-semibold bg-indigo-50/60"
                    >
                      <Dumbbell className="w-4 h-4 text-verba-indigo" />
                      <span>Procvičování (START PRACTICE)</span>
                    </Link>

                    <Link
                      href={`/courses/review?id=${currentCourse.id}`}
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-verba-ink hover:bg-slate-50"
                    >
                      <RotateCw className="w-4 h-4 text-verba-review" />
                      <span>Opakování (Review 50/25/25)</span>
                    </Link>

                    <Link
                      href={`/courses/dictionary?id=${currentCourse.id}`}
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-verba-ink hover:bg-slate-50"
                    >
                      <BookA className="w-4 h-4 text-verba-teal" />
                      <span>Centrální slovník</span>
                    </Link>

                    <Link
                      href={`/courses/progress?id=${currentCourse.id}`}
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
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    handleExportBackup();
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border border-slate-200 text-slate-600 text-[11px] font-medium hover:bg-slate-50 text-center"
                >
                  <Download className="w-3 h-3 text-slate-500" />
                  <span>Záloha</span>
                </button>
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
