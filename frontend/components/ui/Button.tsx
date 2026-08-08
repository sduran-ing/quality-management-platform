import { ButtonHTMLAttributes, forwardRef } from 'react';
// Looks for: lib/utils/index.ts
import { cn } from '@/lib/utils';
import Spinner from './Spinner';    // Import <Spinner> for loading effect

/**
 * BUTTON VARIANTS
 * Define the different visual and utility styles that <Button> can have
 * 
 * STANDARD VARIANTS (opinionated, full styling):
 * - primary: Main call-to-action buttons
 * - secondary: Secondary actions
 * - outline: Alternative actions
 * - danger: Destructive actions
 * - ghost: Subtle actions
 * 
 * UTILITY VARIANTS (minimal styling, specific use cases):
 * - icon: Icon-only buttons (notifications, toolbar actions)
 * - menu: Menu trigger buttons (dropdowns, user menu)
 * - menuItem: Items inside dropdown menus
 */
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'icon' | 'menu' | 'menuItem';
type ButtonSize = 'sm' | 'md' | 'lg';

// Props interface - TypeScript needs to know what properties this component accepts
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  // The ? means that is a optional property
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  // We inherit all standard button props (onClick, disabled, type, etc.)
  // from ButtonHTMLAttributes
}

// forwardRef allows parent components to access the button's DOM node
// Useful for forms, focus management, etc.
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',  // Default to primary if not specified
      size = 'md',          // Default to medium size
      isLoading = false,
      disabled = false,
      children,
      type = 'button',
      ...props  // Spread remaining props (onClick, type, etc.)
    },
    ref  // The forwarded ref
  ) => {
    // Base styles that ALL buttons share
    const baseStyles =cn(
    'inline-flex items-center',
    'font-body font-medium',
    'transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'cursor-pointer',
  );

  /**
   * Size variants
   * 
   * Applied to: primary, secondary, outline, danger, ghost
   * It gives rounded borders
   * NOT applied to: icon, menu, menuItem (they have custom sizing)
   */
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-4 py-2 text-sm rounded-lg',
    lg: 'px-6 py-3 text-base rounded-lg',
  };

// Variant styles, each variant defines its complete appearance:

  const variantStyles = {
    /**
     * PRIMARY - Main call-to-action
     * 
     * Use for: Submit forms, primary actions, "Save", "Create"
     */
    primary: cn(
      'bg-primary-600 text-white justify-center',
      'hover:bg-primary-700',
      'focus:ring-primary-500',
      'active:bg-primary-800',
    ),

    /**
     * SECONDARY - Alternative actions
     * 
     * Use for: Secondary actions, "Cancel", "Back"
     */
    secondary: cn(
      'bg-secondary-600 text-white justify-center',
      'hover:bg-secondary-700',
      'focus:ring-secondary-500',
      'active:bg-secondary-800',
    ),

    /**
     * OUTLINE - Subtle actions
     * 
     * Use for: Less prominent actions, filters, toggles
     */
    outline: cn(
      'bg-white text-gray-700 border border-gray-300 justify-center',
      'hover:bg-gray-50 hover:border-gray-400',
      'focus:ring-primary-500',
      'active:bg-gray-100',
    ),

    /**
     * DANGER - Destructive actions
     * 
     * Use for: "Delete", "Remove", "Disable"
     */
    danger: cn(
      'bg-red-600 text-white justify-center',
      'hover:bg-red-700',
      'focus:ring-red-500',
      'active:bg-red-800',
    ),

    /**
     * GHOST - Very subtle actions
     * 
     * Use for: Tertiary actions, table row actions
     */
    ghost: cn(
      'bg-transparent text-gray-700 justify-center',
      'hover:bg-gray-100',
      'focus:ring-gray-500',
      'active:bg-gray-200',
    ),

    /**
     * ICON - Icon-only buttons
     * 
     * Use for: Notification bell, toolbar icons, close buttons
     * 
     * Example:
     * <Button variant="icon">
     *   <Bell className="w-5 h-5" />
     * </Button>
     */
    icon: cn(
      'p-2 rounded-lg',
      'text-gray-600',
      'hover:bg-gray-100 hover:text-gray-900',
      'focus:ring-primary-500',
      'active:bg-gray-200',
    ),

    /**
     * MENU - Menu trigger buttons
     * 
     * Use for: User menu, dropdown triggers, complex buttons
     * 
     * Example:
     * <Button variant="menu" onClick={toggleMenu}>
     *   <Avatar />
     *   <UserName />
     *   <ChevronDown />
     * </Button>
     */
    menu: cn(
      'justify-start gap-3 px-3 py-2 rounded-lg', // justify-start for left alignment, gap-3 to left padding between elements  
      'text-gray-900',
      'hover:bg-gray-100',
      'focus:ring-primary-500',
      'active:bg-gray-100', // // Add eg.: isUserMenuOpen && 'bg-gray-100'  // Active state    
    ),

    /**
     * MENU ITEM - Items inside dropdown menus
     * 
     * Use for: Dropdown menu items, context menu items
     * 
     * Variations:
     * - Default: gray text, gray hover
     * - Danger: red text, red hover (for delete/logout)
     * 
     * Example:
     * <Button variant="menuItem">
     *   <Settings /> Settings
     * </Button>
     * <Button variant="menuItem" className="text-red-600 hover:bg-red-50">
     *   <LogOut /> Logout
     * </Button>
     */
    menuItem: cn(
      'w-full justify-start px-4 py-2 rounded-none', // justify-start for left alignment  
      'text-sm text-gray-700',
      'hover:bg-gray-50',
      'focus:ring-0 focus:bg-gray-100',
      'active:bg-gray-100', // Add eg.: isUserMenuOpen && 'bg-gray-100'  // Active state  
    ),
  };

  /**
   * Determine if this variant uses standard sizing
   * 
   * Standard variants: primary, secondary, outline, danger, ghost
   * Custom sizing: icon, menu, menuItem
   */
  const usesStandardSizing = !['icon', 'menu', 'menuItem'].includes(variant);

    return (
      <button
        type={type}
        ref={ref}
        // cn function properly merges all the styles involved with the element
        className={cn(
          baseStyles,
          variantStyles[variant],
          usesStandardSizing && sizeStyles[size],  // Only apply size to standard variants
          className  // Allow parent to override styles
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {/* Show spinner if loading */}
        {isLoading && <Spinner size="sm" />}
      {children}
    </button>

    );
  }
);

// Display name for debugging in React DevTools
Button.displayName = 'Button';

export default Button;