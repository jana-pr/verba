import React from 'react';

interface VerbaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  showMotto?: boolean;
  className?: string;
}

/**
 * Official VERBA App Icon & Wordmark.
 * Abstract stylized "V" formed by two converging strokes:
 * - Left stroke (Verba Teal #14A89E): Active Recall (CZ -> Target)
 * - Right stroke (Verba Indigo #5146E5): Comprehension (Target -> CZ)
 * - Their intersection represents complete Mastery.
 */
export const VerbaLogo: React.FC<VerbaLogoProps> = ({
  size = 'md',
  showWordmark = true,
  showMotto = false,
  className = '',
}) => {
  const iconDimensions = {
    sm: { width: 24, height: 24, strokeWidth: 3 },
    md: { width: 32, height: 32, strokeWidth: 3.5 },
    lg: { width: 44, height: 44, strokeWidth: 4 },
    xl: { width: 64, height: 64, strokeWidth: 5 },
  }[size];

  const textSize = {
    sm: 'text-base tracking-tight',
    md: 'text-xl tracking-tight',
    lg: 'text-2xl tracking-tight',
    xl: 'text-4xl tracking-tight',
  }[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Abstract Stylized V Symbol */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg
          width={iconDimensions.width}
          height={iconDimensions.height}
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="transition-transform duration-200"
          aria-label="VERBA Logo Icon"
        >
          <defs>
            <linearGradient id="logoBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0F172A" />
              <stop offset="60%" stopColor="#1E1B4B" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>
            <linearGradient id="recallGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0D9488" />
            </linearGradient>
            <linearGradient id="compGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A5B4FC" />
              <stop offset="100%" stopColor="#4F46E5" />
            </linearGradient>
          </defs>

          {/* Squircle Tile */}
          <rect width="44" height="44" rx="10" fill="url(#logoBg)" />
          <rect width="43" height="43" x="0.5" y="0.5" rx="9.5" stroke="#334155" strokeOpacity="0.6" fill="none" />

          {/* Converging V Mark */}
          {/* Active Recall wing (left) */}
          <path
            d="M10 11 L15.5 11 L22 28 L19 28 L10 11 Z"
            fill="url(#recallGrad)"
          />
          {/* Comprehension wing (right) */}
          <path
            d="M34 11 L28.5 11 L22 28 L25 28 L34 11 Z"
            fill="url(#compGrad)"
          />
          {/* Central Apex & Inner Chevron */}
          <path
            d="M18 21 L22 30 L26 21 L24 21 L22 25 L20 21 Z"
            fill="#EEF2FF"
            opacity="0.95"
          />
          {/* Golden Mastery Node */}
          <polygon
            points="22,30 24,33 22,36 20,33"
            fill="#FDE68A"
          />
          <circle cx="22" cy="33" r="1" fill="#D97706" />
        </svg>
      </div>

      {/* Wordmark and Optional Motto */}
      {showWordmark && (
        <div className="flex flex-col">
          <span className={`font-bold font-sans text-verba-ink leading-none ${textSize}`}>
            VERBA
          </span>
          {showMotto && (
            <span className="text-[11px] font-medium text-verba-slate tracking-wide mt-0.5">
              Words that work.
            </span>
          )}
        </div>
      )}
    </div>
  );
};
