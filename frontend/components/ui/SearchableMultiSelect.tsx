'use client';

/**
 * =============================================================================
 * SEARCHABLE MULTI-SELECT COMPONENT
 * =============================================================================
 * 
 * Multi-select dropdown with search/filter functionality.
 * Used for selecting multiple items (processes, standards, etc.)
 * 
 * FEATURES:
 * - Type to search/filter options
 * - Select multiple items
 * - Show selected items as chips
 * - Remove individual selections
 * - Click outside to close
 * - Flips upward automatically when near the bottom of the viewport
 * (position:absolute with a flip direction check)
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

export interface SelectOption {
  value: number | string;
  label: string;
  subtitle?: string;  // Optional subtitle (e.g., role name under a user)
}

interface SearchableMultiSelectProps {
  options: SelectOption[];
  value: (number | string)[];  // Array of selected values
  onChange: (value: (number | string)[]) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  className?: string;
}

// ============================================
// COMPONENT
// ============================================

export default function SearchableMultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  label,
  required = false,
  error,
  disabled = false,
  className
}: SearchableMultiSelectProps) {

  // Whether the dropdown is open
  const [isOpen, setIsOpen] = useState(false);

  // Current value in the search input
  const [searchTerm, setSearchTerm] = useState('');

  /**
   * Whether the dropdown should open upward instead of downward.
   * Flipped to true when there isn't enough space below the container.
   * Recalculated every time the dropdown opens.
   */
  const [openUpward, setOpenUpward] = useState(false);

  /**
   * Wraps the entire component (label + button + dropdown).
   * Used for:
   * - Click outside detection (is the click inside this element?)
   * - Flip direction calculation (where is this element on screen?)
   */
  const containerRef = useRef<HTMLDivElement>(null);

  // Used to focus the search input automatically when dropdown opens
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter options based on what the user has typed in the search box
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.subtitle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // All currently selected option objects (for rendering chips)
  const selectedOptions = options.filter(opt => value.includes(opt.value));

  // ============================================
  // HANDLERS
  // ============================================

  /**
   * Toggle an option in the selection.
   * If already selected → remove it.
   * If not selected → add it.
   */
  const handleToggle = (optionValue: number | string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  /**
   * Remove a single chip from the selection.
   * stopPropagation prevents the click from bubbling to the button
   * and toggling the dropdown open/closed.
   */
  const handleRemove = (optionValue: number | string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    onChange(value.filter(v => v !== optionValue));
  };

  /**
   * Clear all selections at once.
   * stopPropagation prevents the click from toggling the dropdown.
   */
  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  // Toggle dropdown open/closed (disabled check prevents opening when disabled)
  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(prev => !prev);
    }
  };

  // ============================================
  // FLIP DIRECTION CHECK
  // ============================================

  /**
   * Determines whether the dropdown should open upward or downward.
   * 
   * HOW IT WORKS:
   * 1. Get the container's position in the viewport via getBoundingClientRect()
   * 2. Calculate space available below (viewport bottom - container bottom)
   * 3. Calculate space available above (container top - viewport top)
   * 4. If not enough space below AND more space above → open upward
   * 
   * estimatedDropdownHeight: search bar (~52px) + up to 5 options (~200px) = 260px
   */
  const checkFlipDirection = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const estimatedDropdownHeight = 260;

      setOpenUpward(
        spaceBelow < estimatedDropdownHeight && spaceAbove > spaceBelow
      );
    }
  };

  // ============================================
  // EFFECTS
  // ============================================

  /**
   * Run flip direction check when dropdown opens.
   * Also re-check on scroll and resize (user might scroll the container
   * into a different position while the dropdown is open).
   * 
   * WHY requestAnimationFrame?
   * checkFlipDirection calls setOpenUpward (setState). React 19 flags
   * calling setState synchronously in an effect body as a cascading render.
   * requestAnimationFrame defers the call to after the browser paints,
   * breaking the cascade — imperceptible to the user but valid to React.
   * 
   * true in addEventListener = capture phase, catches scroll on ALL elements
   * not just window — important inside scrollable modals or panels.
   */
  useEffect(() => {
    if (!isOpen) return;

    const frame = requestAnimationFrame(checkFlipDirection);

    window.addEventListener('scroll', checkFlipDirection, true);
    window.addEventListener('resize', checkFlipDirection);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', checkFlipDirection, true);
      window.removeEventListener('resize', checkFlipDirection);
    };
  }, [isOpen]);

  /**
   * Close dropdown when user clicks outside the container.
   * 
   * containerRef wraps the entire component so any click inside
   * (button, chips, search input, option buttons) is excluded.
   * Only clicks truly outside close it.
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  /**
   * Focus the search input automatically when dropdown opens.
   * Improves UX — user can start typing immediately without clicking.
   */
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  /**
   * Close dropdown on Escape key.
   * Standard keyboard accessibility behaviour for dropdowns.
   */
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div
      className={cn('relative', className)}
      ref={containerRef}
    >
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={toggleDropdown}
        disabled={disabled}
        className={cn(
          'w-full flex items-start justify-between',
          'px-4 py-2.5 rounded-lg border bg-white',
          'text-left text-sm transition-all cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-primary-500',
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:border-primary-500',
          disabled && 'bg-gray-50 cursor-not-allowed opacity-60',
          !disabled && 'hover:border-gray-400',
          selectedOptions.length > 0 ? 'min-h-[42px]' : ''
        )}
      >
        {/**
         * SELECTED CHIPS or PLACEHOLDER
         * 
         * When items are selected: render each as a removable chip.
         * When nothing selected: render the placeholder text.
         */}
        {selectedOptions.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 flex-1 mr-2">
            {selectedOptions.map((option) => (
              <span
                key={option.value}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 rounded-md text-xs font-medium"
              >
                {option.label}
                {!disabled && (
                  <X
                    className="h-3 w-3 hover:text-primary-900 cursor-pointer"
                    onClick={(e) => handleRemove(option.value, e)}
                  />
                )}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-gray-400 flex-1">
            {placeholder}
          </span>
        )}

        {/* Clear all + chevron controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Clear all button - only shown when items are selected */}
          {selectedOptions.length > 0 && !disabled && (
            <X
              className="h-4 w-4 text-gray-400 hover:text-gray-600"
              onClick={handleClearAll}
            />
          )}

          {/* Chevron rotates 180° when open */}
          <ChevronDown
            className={cn(
              'h-4 w-4 text-gray-400 transition-transform',
              isOpen && 'transform rotate-180'
            )}
          />
        </div>
      </button>

      {/* Validation error message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/**
       * DROPDOWN
       * 
       * position:absolute → relative to containerRef (the wrapping div).
       * openUpward toggles between two Tailwind classes:
       *   bottom-full mb-1 → anchors to top edge of button, opens upward
       *   top-full mt-1    → anchors to bottom edge of button, opens downward
       */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 w-full bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5',
            openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
          )}
        >
          {/* Search Input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/**
           * OPTIONS LIST
           * 
           * max-h-60 + overflow-y-auto = scrollable when options exceed height.
           * Each option shows a checkbox (filled when selected) + label + optional subtitle.
           */}
          <div className="max-h-60 overflow-y-auto py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = value.includes(option.value);

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleToggle(option.value)}
                    className={cn(
                      'w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer',
                      'hover:bg-gray-50 flex items-center gap-3',
                      isSelected && 'bg-primary-50'
                    )}
                  >
                    {/**
                     * CHECKBOX
                     * 
                     * Visual-only checkbox (not a real input).
                     * Filled purple when selected, outlined gray when not.
                     * Checkmark SVG only rendered when selected.
                     */}
                    <div
                      className={cn(
                        'w-4 h-4 border-2 rounded flex items-center justify-center flex-shrink-0',
                        isSelected
                          ? 'bg-primary-600 border-primary-600'
                          : 'border-gray-300'
                      )}
                    >
                      {isSelected && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    {/* Label + optional subtitle */}
                    <div className="flex-1">
                      <div className={cn(
                        'font-medium',
                        isSelected && 'text-primary-700'
                      )}>
                        {option.label}
                      </div>
                      {option.subtitle && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {option.subtitle}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
