'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Layers, Dumbbell, BarChart3 } from 'lucide-react';

interface BottomNavProps {
  currentCourseId?: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentCourseId }) => {
  const pathname = usePathname();

  // If in active focus practice session, hide bottom nav
  if (pathname.includes('/practice/') && !pathname.endsWith('/practice')) {
    return null;
  }

  const items = [
    { label: 'Home', href: '/', icon: Home, matchExact: true },
    {
      label: 'Course',
      href: currentCourseId ? `/courses/${currentCourseId}` : '/courses/new',
      icon: Layers,
      matchExact: false,
    },
    {
      label: 'Practice',
      href: currentCourseId ? `/courses/${currentCourseId}/practice` : '/courses/new',
      icon: Dumbbell,
      matchExact: false,
    },
    {
      label: 'Progress',
      href: currentCourseId ? `/courses/${currentCourseId}/progress` : '/courses/new',
      icon: BarChart3,
      matchExact: false,
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-4 py-2 z-40 flex items-center justify-around shadow-sm select-none safe-area-pb">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.matchExact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center py-1 px-3 min-w-[64px] rounded-lg transition-colors ${
              isActive
                ? 'text-verba-indigo font-semibold'
                : 'text-verba-slate hover:text-verba-ink'
            }`}
          >
            <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-verba-indigo stroke-[2.2]' : 'text-verba-slate stroke-[1.8]'}`} />
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
