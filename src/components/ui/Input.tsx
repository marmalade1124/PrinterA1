import React from 'react';

interface InputProps {
  id: string;
  label: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  min?: number | string;
  max?: number | string;
  step?: number | string;
}

export function Input({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
  min,
  max,
  step,
}: InputProps) {
  return (
    <div className="flex flex-col">
      <label
        htmlFor={id}
        className="text-label-md text-on-surface-variant mb-1.5"
      >
        {label}
        {required && (
          <span className="text-error ml-1" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full rounded-lg px-3 py-2.5 bg-surface-container border text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors ${
          error ? 'border-error' : 'border-outline-variant'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
      {error && (
        <p id={`${id}-error`} className="text-error text-label-sm mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
