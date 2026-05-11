import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, className = '', disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-semibold rounded-xl transition-opacity active:opacity-70 disabled:opacity-40';
    const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-3.5 text-base' };
    const variants = {
      primary: 'bg-accent text-white shadow-sm',
      ghost: 'bg-gray-100 text-primary border border-border',
      danger: 'bg-accent-red/10 text-accent-red border border-accent-red/20',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
        {...props}
      >
        {loading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2" /> : null}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
