import React from 'react';

interface ProgressBarProps {
  value: number;
  label?: string;
  colorClass?: string;
}

export function ProgressBar({ value, label, colorClass = 'bg-primary' }: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-label-sm text-on-surface-variant">{label}</span>
          <span className="text-label-sm text-on-surface-variant">{clampedValue}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-1.5 w-full bg-surface-container-lowest rounded-full overflow-hidden"
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
