import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-semibold text-secondary">{label}</label>}
      <input
        ref={ref}
        className={`bg-white text-primary placeholder-gray-400 rounded-xl px-4 py-3.5 text-base outline-none border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 transition ${error ? 'border-accent-red ring-2 ring-accent-red/20' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-xs font-medium text-accent-red">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';
