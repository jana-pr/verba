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
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="transition-transform duration-200"
          aria-label="VERBA Logo Icon"
        >
          {/* Subtle container background with rounded corners */}
          <rect width="36" height="36" rx="9" fill="#182033" fillOpacity="0.04" />
          
          {/* Left stroke: Active Recall (Verba Teal #14A89E) */}
          <path
            d="M8 9L18 28"
            stroke="#14A89E"
            strokeWidth={iconDimensions.strokeWidth}
            strokeLinecap="round"
          />
          {/* Right stroke: Comprehension (Verba Indigo #5146E5) */}
          <path
            d="M28 9L18 28"
            stroke="#5146E5"
            strokeWidth={iconDimensions.strokeWidth}
            strokeLinecap="round"
          />
          {/* Convergence Mastery node at the apex */}
          <circle cx="18" cy="28" r="2" fill="#5146E5" />
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
