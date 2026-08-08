import { InputHTMLAttributes, forwardRef, useId, ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Input can have different states
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;  // Error message to display
  label?: string;  // Label text
  icon?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      error,
      label,
      id,
      icon,
      ...props
    },
    ref
  ) => {
    // Use React's useId hook for stable, SSR-safe IDs
    // This generates a unique ID that's the same on server and client
    const generatedId = useId();

    // Use provided ID if available, otherwise use generated one
    const inputId = id || generatedId;

    // Base styles
    const baseStyles =
      'flex w-full rounded-lg border bg-white px-3 py-2 text-sm ' +
      'font-body text-gray-900 placeholder:text-gray-400 ' +
      'focus:outline-none focus:ring-2 focus:ring-offset-1 ' +
      'disabled:cursor-not-allowed disabled:opacity-50';

    // Error vs normal state
    const stateStyles = error
      ? 'border-red-300 focus:ring-red-500'
      : 'border-gray-300 focus:ring-primary-500';

    return (
      <div className="space-y-2">
        {/* Label (if provided) */}
        {label && (
          <label
            // Associates label with input for accessibility
            htmlFor={inputId}
            className="block text-sm font-body font-medium text-gray-700"
          >
            {label}
          </label>
        )}

        {/* Input wrapper (for icon positioning) */}
        <div className="relative">
          {/* Icon (if provided) */}
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              {icon}
            </div>
          )}

          {/* Input field */}
          <input
            id={inputId}
            type={type}
            className={cn(baseStyles, stateStyles, className,
              icon ? 'pl-10 pr-3 py-2' : 'px-3 py-2',  // ← Add left padding if icon
              error && 'border-red-500 focus:ring-red-500'
            )}
            ref={ref}
            {...props}
          />
        </div>

        {/* Error message (if provided) */}
        {error && (
          <p className="text-sm font-body text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;