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

  return (
    <div className={compact ? 'relative' : 'relative pt-8'}>
      {!compact && (
        <div
          className="absolute top-0 z-20 -translate-x-1/2"
          style={{ left: `${safeTarget}%` }}
          aria-hidden="true"
        >
          <span className="inline-flex whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2 py-1 text-[9px] font-bold text-slate-600 shadow-sm">
            เป้าหมาย {safeTarget}%
          </span>
        </div>
      )}

      <div
        className={`relative w-full overflow-visible rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200 ${compact ? 'h-2.5' : 'h-3.5'}`}
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeValue}
        aria-valuetext={`ผลปัจจุบัน ${safeValue} เปอร์เซ็นต์ เป้าหมาย ${safeTarget} เปอร์เซ็นต์`}
      >
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <div
            className={`h-full rounded-full transition-[width] duration-700 ease-out ${
              achieved
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500'
                : 'bg-gradient-to-r from-amber-400 to-orange-400'
            }`}
            style={{ width: `${safeValue}%` }}
          ></div>
          {[25, 50, 75].map((tick) => (
            <span
              key={tick}
              className="absolute inset-y-0 w-px bg-white/70"
              style={{ left: `${tick}%` }}
              aria-hidden="true"
            ></span>
          ))}
        </div>

        <span
          className={`absolute z-10 w-0.5 -translate-x-1/2 rounded-full bg-slate-950 ${compact ? '-bottom-1 -top-1' : '-bottom-1.5 -top-1.5'}`}
          style={{ left: `${safeTarget}%` }}
          aria-hidden="true"
        ></span>

        {!compact && (
          <span
            className={`absolute left-0 top-1/2 z-20 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_2px_8px_rgba(15,23,42,0.25)] ${
              achieved ? 'bg-emerald-600' : 'bg-amber-500'
            }`}
            style={{ left: `${safeValue}%` }}
            aria-hidden="true"
          ></span>
        )}
      </div>

      {!compact && (
        <div className="mt-2 flex justify-between text-[9px] font-semibold tabular-nums text-slate-400" aria-hidden="true">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      )}
    </div>
  );
};
