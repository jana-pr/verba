'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { VerbaLogo } from '../brand/VerbaLogo';
import { 
  Home, 
  Layers, 
  Dumbbell, 
  RotateCw, 
  BookA, 
  BarChart3, 
  PlusCircle, 
  CheckSquare,
  QrCode,
  BookOpen
} from 'lucide-react';

interface SidebarProps {
  currentCourseId?: string;
  onOpenQr?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentCourseId, onOpenQr }) => {
  const pathname = usePathname();

  const navItems = [
    { label: 'Domů', href: '/', icon: Home, matchExact: true },
    ...(currentCourseId
      ? [
          { label: 'Lekce kurzu', href: `/courses/${currentCourseId}`, icon: Layers },
          { label: 'Procvičování', href: `/courses/${currentCourseId}/practice`, icon: Dumbbell },
          { label: 'Opakování (Review)', href: `/courses/${currentCourseId}/review`, icon: RotateCw },
          { label: 'Centrální slovník', href: `/courses/${currentCourseId}/dictionary`, icon: BookA },
          { label: 'Můj progress', href: `/courses/${currentCourseId}/progress`, icon: BarChart3 },
        ]
      : []),
    { label: 'Katalog kurzů', href: '/courses/new?tab=presets', icon: BookOpen },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-100 h-screen sticky top-0 px-4 py-6 justify-between select-none">
      <div className="space-y-8">
        <div className="px-2">
          <Link href="/" className="inline-block hover:opacity-90 transition-opacity">
            <VerbaLogo size="md" showMotto={true} />
          </Link>
        </div>

        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.matchExact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-50 text-verba-indigo font-semibold shadow-xs'
                    : 'text-verba-slate hover:text-verba-ink hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-verba-indigo' : 'text-verba-slate'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom CTA for new course and mobile QR */}
      <div className="pt-4 border-t border-slate-100 space-y-2">
        {onOpenQr && (
          <button
            type="button"
            onClick={onOpenQr}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100/70 text-amber-900 font-medium text-xs transition-colors"
          >
            <QrCode className="w-3.5 h-3.5 text-amber-700" />
            <span>Mobilní verze (QR)</span>
          </button>
        )}
        <Link
          href="/courses/new"
          className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl border border-indigo-200 text-verba-indigo hover:bg-indigo-50 font-medium text-xs transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Vytvořit nový kurz</span>
        </Link>
      </div>
    </aside>
  );
};
