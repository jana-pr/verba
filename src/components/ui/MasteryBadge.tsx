import React from 'react';
import { LearningState } from '@/lib/db/schema';
import { CheckCircle2, Clock, BookOpen, Sparkles } from 'lucide-react';

interface MasteryBadgeProps {
  state: LearningState;
  directionLabel?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const MasteryBadge: React.FC<MasteryBadgeProps> = ({
  state,
  directionLabel,
  size = 'md',
  className = '',
}) => {
  const configs: Record<
    LearningState,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    new: {
      label: 'Nový',
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      border: 'border-slate-200',
      icon: <Sparkles className="w-3 h-3 text-slate-500" />,
    },
    learning: {
      label: 'Učím se',
      bg: 'bg-indigo-50',
      text: 'text-verba-indigo',
      border: 'border-indigo-100',
      icon: <BookOpen className="w-3 h-3 text-verba-indigo" />,
    },
    review: {
      label: 'K opakování',
      bg: 'bg-amber-50',
      text: 'text-verba-review',
      border: 'border-amber-200',
      icon: <Clock className="w-3 h-3 text-verba-review" />,
    },
    mastered: {
      label: 'Zvládnuto',
      bg: 'bg-emerald-50',
      text: 'text-verba-mastered',
      border: 'border-emerald-200',
      icon: <CheckCircle2 className="w-3 h-3 text-verba-mastered" />,
    },
  };

  const current = configs[state] ?? configs.new;
  const isSm = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-full ${current.bg} ${current.text} ${current.border} ${
        isSm ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      } ${className}`}
    >
      {current.icon}
      {directionLabel && (
        <span className="font-semibold uppercase tracking-wider text-[9px] opacity-75">
          {directionLabel}:
        </span>
      )}
      <span>{current.label}</span>
    </span>
  );
};
