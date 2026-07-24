import React from 'react';

interface ProgressScaleProps {
  value: number;
  target: number;
  achieved?: boolean;
  compact?: boolean;
  ariaLabel: string;
}

const clampPercentage = (value: number) => Math.min(Math.max(value, 0), 100);

export const ProgressScale: React.FC<ProgressScaleProps> = ({
  value,
  target,
  achieved = value >= target,
  compact = false,
  ariaLabel,
}) => {
  const safeValue = clampPercentage(value);
  const safeTarget = clampPercentage(target);
  const scaleTicks = [0, 25, 50, 75, 100];

  return (
    <div className={`relative ${compact ? 'pt-1' : 'pt-7'}`}>
      {!compact && (
        <div
          className="absolute top-0 -translate-x-1/2"
          style={{ left: `${safeTarget}%` }}
        >
          <span className="inline-flex whitespace-nowrap rounded-full border border-slate-300 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 shadow-sm">
            เกณฑ์ผ่าน {safeTarget}%
          </span>
        </div>
      )}

      <div
        className={`relative w-full overflow-visible rounded-full border border-slate-200 bg-slate-100 ${
          compact ? 'h-3' : 'h-4'
        }`}
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeValue}
        aria-valuetext={`ดำเนินการแล้ว ${safeValue} เปอร์เซ็นต์ จากสเกล 100 เปอร์เซ็นต์ เกณฑ์ผ่าน ${safeTarget} เปอร์เซ็นต์`}
      >
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <div
            className={`h-full rounded-full transition-[width] duration-1000 ease-out ${
              achieved
                ? 'bg-gradient-to-r from-teal-500 via-emerald-500 to-green-500'
                : 'bg-gradient-to-r from-amber-400 to-orange-400'
            }`}
            style={{ width: `${safeValue}%` }}
          />
        </div>

        {[25, 50, 75].map((tick) => (
          <span
            key={tick}
            className="absolute inset-y-0 w-px bg-white/80"
            style={{ left: `${tick}%` }}
            aria-hidden="true"
          />
        ))}

        <span
          className="absolute -top-1 -bottom-1 z-10 w-0.5 rounded-full bg-slate-900 shadow-sm"
          style={{ left: `${safeTarget}%` }}
          aria-hidden="true"
        />

        {!compact && (
          <span
            className={`absolute top-1/2 z-20 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-md ${
              achieved ? 'bg-emerald-600' : 'bg-amber-500'
            }`}
            style={{ left: `${safeValue}%` }}
            aria-hidden="true"
          />
        )}
      </div>

      <div className="relative mt-1.5 h-4 text-[9px] font-medium text-slate-400" aria-hidden="true">
        {scaleTicks.map((tick) => (
          <span
            key={tick}
            className="absolute -translate-x-1/2"
            style={{ left: `${tick}%` }}
          >
            {tick}%
          </span>
        ))}
      </div>
    </div>
  );
};
