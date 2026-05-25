import React from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  icon?: string;
}

export function Button({
  variant = 'primary',
  children,
  onClick,
  disabled = false,
  type = 'button',
  className = '',
  icon,
}: ButtonProps) {
  const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: 'bg-primary text-on-primary hover:opacity-90',
    secondary:
      'bg-surface-container-high text-on-surface border border-white/10 hover:bg-surface-variant',
    ghost: 'text-on-surface-variant hover:text-on-surface hover:bg-white/5',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 min-h-[44px] min-w-[44px] rounded-lg px-4 py-2 font-medium text-label-md transition-all ${variantClasses[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {icon && (
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </button>
  );
}
