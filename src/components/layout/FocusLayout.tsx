'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

interface FocusLayoutProps {
  children: React.ReactNode;
  exitHref: string;
  title: string;
  progressPercent: number;
  directionLabel?: string;
}

export const FocusLayout: React.FC<FocusLayoutProps> = ({
  children,
  exitHref,
  title,
  progressPercent,
  directionLabel,
}) => {
  // Prevent scrolling of background on mobile when keyboard opens
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-verba-canvas flex flex-col h-[100dvh] overflow-hidden text-verba-ink">
      {/* Top minimal header */}
      <header className="shrink-0 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between gap-4">
        <Link
          href={exitHref}
          className="p-1.5 rounded-lg text-verba-slate hover:text-verba-ink hover:bg-slate-100 transition-colors"
          aria-label="Ukončit cvičení"
        >
          <X className="w-5 h-5" />
        </Link>

        {/* Center Progress Bar */}
        <div className="flex-1 max-w-md">
          <div className="flex items-center justify-between text-[11px] font-medium text-verba-slate mb-1">
            <span>{title}</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-verba-indigo h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.max(2, Math.min(100, progressPercent))}%` }}
            />
          </div>
        </div>

        {/* Direction Indicator */}
        {directionLabel && (
          <div className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-50 text-verba-indigo border border-indigo-100">
            {directionLabel}
          </div>
        )}
      </header>

      {/* Main Focus Area (scrollable if needed on small screens) */}
      <main className="flex-1 overflow-y-auto px-4 py-4 max-w-2xl w-full mx-auto flex flex-col justify-between">
        {children}
      </main>
    </div>
  );
};
