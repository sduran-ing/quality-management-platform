import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * =============================================================================
 * ERROR MESSAGE COMPONENT
 * =============================================================================
 * 
 * Displays user-friendly error messages when something goes wrong
 * Optionally includes a "Try Again" button to retry the action
 * 
 * USAGE:
 * <ErrorMessage message="Failed to load data" />
 * <ErrorMessage message="Network error" onRetry={retryFunction} />
 */

interface ErrorMessageProps {
  /**
   * Error message to display
   */
  message: string;
  
  // Optional additional CSS classes
  className?: string;
  
  /**
   * Optional "Try Again" button.
   * When clicked, calls this function.
   * 
   * USAGE:
   * const handleRetry = () => {
   *   // Re-fetch data
   *   fetchData();
   * };
   * 
   * <ErrorMessage message="..." onRetry={handleRetry} />
   */
  onRetry?: () => void;
}

export default function ErrorMessage({ 
  message, 
  className,
  onRetry 
}: ErrorMessageProps) {
  return (
    <div
      className={cn(
        // Layout
        'flex flex-col',           // Stack items vertically
        'items-center',            // Center horizontally
        'justify-center',          // Center vertically
        'p-6',                     // Padding all sides
        
        // Styling
        'bg-red-50',              // Light red background
        'border border-red-200',  // Red border
        'rounded-lg',             // Rounded corners
        
        // Custom classes from parent
        className
      )}
      
      /**
       * Accessibility: role="alert"
       * 
       * Tells screen readers this is an important message.
       * Screen reader will announce it immediately.
       * 
       * Different from role="status":
       * - alert: Announces immediately (interrupts)
       * - status: Announces when convenient (polite)
       * 
       * "alert" is used for errors
       */
      role="alert"
    >
      {/**
       * 
       * AlertCircle from lucide-react
       * SIZE: w-10 h-10 (40px × 40px)
       * COLOR: text-red-500 (medium red)
       * SPACING: mb-3 (12px margin below)
       */}
      <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
      
      {/**
       * Error Message Text
       * 
       * - font-body: Use body font (Open Sans)
       * - text-sm: Slightly smaller (14px)
       * - text-red-700: Dark red
       * - text-center: Center align
       * - mb-3: Space below (if retry button present)
       */}
      <p className="font-body text-sm text-red-700 text-center mb-3">
        {message}
      </p>
      
      {/**
       * Conditional Retry Button
       * 
       * ONLY SHOWS IF: onRetry function is provided
       * 
       * - If onRetry exists (truthy) → && evaluates right side → renders button
       * - If onRetry is undefined → && stops → nothing renders
       * 
       */}
      {onRetry && (
        <button
          onClick={onRetry}
          className={cn(
            // Sizing
            'px-4 py-2',              // Padding (horizontal, vertical)
            
            // Typography
            'text-sm',                // 14px text
            'font-medium',            // Semi-bold
            'text-white',             // White text
            
            // Colors
            'bg-red-600',             // Red background
            'hover:bg-red-700',       // Darker red on hover
            
            // Shape
            'rounded-lg',             // Rounded corners
            
            // Animation
            'transition-colors',      // Smooth color change on hover
          )}
          
          /**
           * Accessibility: aria-label
           * 
           * Screen readers will say "Try again" instead of just "button"
           * More descriptive than button text alone
           */
          aria-label="Try again"
        >
          Try Again
        </button>
      )}
    </div>
  );
}