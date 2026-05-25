import React from 'react';

interface BadgeProps {
  variant: 'status' | 'alert' | 'count';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant, children, className = '' }: BadgeProps) {
  const variantClasses: Record<BadgeProps['variant'], string> = {
    status: 'bg-surface-container-high text-on-surface-variant',
    alert: 'bg-tertiary-container/20 text-tertiary border border-tertiary-container/30',
    count: 'bg-primary/20 text-primary',
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full text-label-sm px-2 py-0.5 ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
