import { cn } from '@/lib/utils';

/**
 * =============================================================================
 * SPINNER COMPONENT
 * =============================================================================
 * 
 * Shows a spinning circle while data is loading
 * Provides visual feedback that something is happening
 * 
 * USAGE:
 * <Spinner size="md" />
 * <Spinner size="lg" className="my-custom-class" />
 */

interface SpinnerProps {
  /**
   * - sm: Small (16px)
   * - md: Medium (32px)
   * - lg: Large (48px)
   */
  size?: 'sm' | 'md' | 'lg';
  
  // Optional additional CSS classes
  className?: string;
}

export default function Spinner({ size = 'md', className }: SpinnerProps) {
  /**
   * Size configuration
   * 
   * Maps size prop to actual Tailwind classes:
   * - w-* h-*: Width and height
   * - border-*: Border thickness
   */
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',      // 16px × 16px, 2px border
    md: 'w-8 h-8 border-3',      // 32px × 32px, 3px border
    lg: 'w-12 h-12 border-4',    // 48px × 48px, 4px border
  };

  return (
    <div
      className={cn(
        // Base spinner styles (always applied)
        'animate-spin',              // Tailwind animation - rotates continuously
        'rounded-full',              // Makes it a perfect circle
        'border-primary-600',        // Border color (emerald green)
        'border-t-transparent',      // Top border transparent (creates spinning effect)
        
        // Size-specific styles (from sizeClasses object)
        sizeClasses[size],
        
        // Custom classes passed from parent
        className
      )}
      
      /**
       * Accessibility attributes
       * 
       * role="status":
       * - Tells screen readers this is a status indicator
       * - Screen reader announces "loading" to user
       * 
       * aria-label="Loading":
       * - Describes what's happening
       * - Important for users who can't see the spinner
       */
      role="status"
      aria-label="Loading"
    >
      {/**
       * sr-only class (screen reader only)
       * 
       * - Visually hidden (display: none equivalent)
       * - Screen reader users need text
       * - "Loading..." tells them what's happening
       * 
       */}
      <span className="sr-only">Loading...</span>
    </div>
  );
}