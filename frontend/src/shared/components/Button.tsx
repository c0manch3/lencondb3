import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react';
import Spinner from './Spinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-brown-900 text-cream-50 hover:bg-black',
  secondary: 'bg-cream-200 text-brown-900 hover:bg-cream-300 border border-brown-200',
  ghost: 'bg-transparent text-brown-700 hover:bg-cream-200',
  danger: 'bg-red-700 text-white hover:bg-red-800',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      children,
      disabled,
      className = '',
      ...rest
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center gap-2
          rounded font-medium
          transition-all duration-200
          cursor-pointer
          disabled:opacity-50 disabled:cursor-not-allowed
          min-h-touch
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
        {...rest}
      >
        {loading ? (
          <Spinner size="sm" />
        ) : icon ? (
          <span className="inline-flex shrink-0">{icon}</span>
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;
