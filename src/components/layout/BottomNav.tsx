'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Layers, Dumbbell, BookA, Menu } from 'lucide-react';

interface BottomNavProps {
  currentCourseId?: string;
  onOpenMenu?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentCourseId, onOpenMenu }) => {
  const pathname = usePathname();

  // If in active focus practice session, hide bottom nav
  if (pathname.includes('/practice/') && !pathname.endsWith('/practice')) {
    return null;
  }

  const items = [
    { label: 'Domů', href: '/', icon: Home, matchExact: true },
    {
      label: 'Lekce',
      href: currentCourseId ? `/courses/view?id=${currentCourseId}` : '/courses/new',
      icon: Layers,
      matchExact: false,
    },
    {
      label: 'Procvičit',
      href: currentCourseId ? `/courses/practice?id=${currentCourseId}` : '/courses/new',
      icon: Dumbbell,
      matchExact: false,
    },
    {
      label: 'Slovník',
      href: currentCourseId ? `/courses/dictionary?id=${currentCourseId}` : '/courses/new',
      icon: BookA,
      matchExact: false,
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 z-40 flex items-center justify-around shadow-sm select-none safe-area-pb">
      {items.map((item) => {
        const Icon = item.icon;
        const baseHref = item.href.split('?')[0];
        const isActive = item.matchExact
          ? pathname === item.href
          : (baseHref === '/' ? pathname === '/' : pathname.startsWith(baseHref));

        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center py-1 px-2.5 min-w-[56px] rounded-lg transition-colors ${
              isActive
                ? 'text-verba-indigo font-semibold'
                : 'text-verba-slate hover:text-verba-ink'
            }`}
          >
            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 mb-0.5 ${isActive ? 'text-verba-indigo stroke-[2.2]' : 'text-verba-slate stroke-[1.8]'}`} />
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </Link>
        );
      })}

      {/* Menu Drawer trigger button */}
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex flex-col items-center py-1 px-2.5 min-w-[56px] rounded-lg text-verba-slate hover:text-verba-ink transition-colors"
        aria-label="Otevřít menu"
      >
        <Menu className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5 text-verba-slate stroke-[1.8]" />
        <span className="text-[10px] tracking-tight font-medium">Menu</span>
      </button>
    </nav>
  );
};
