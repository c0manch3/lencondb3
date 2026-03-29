import { type InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, className = '', ...rest }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const hasError = Boolean(error);
    const describedBy = [
      hasError && inputId ? `${inputId}-error` : null,
      helperText && inputId ? `${inputId}-helper` : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-brown-800"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          className={`
            bg-cream-50 border rounded px-3 py-2
            text-brown-900 text-sm
            placeholder:text-brown-400
            transition-colors duration-200
            min-h-touch
            ${hasError
              ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
              : 'border-brown-200 focus:border-brown-500 focus:ring-1 focus:ring-brown-500'
            }
            focus:outline-none
            ${className}
          `}
          {...rest}
        />
        {hasError && (
          <p
            id={inputId ? `${inputId}-error` : undefined}
            className="text-xs text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}
        {!hasError && helperText && (
          <p
            id={inputId ? `${inputId}-helper` : undefined}
            className="text-xs text-brown-400"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
