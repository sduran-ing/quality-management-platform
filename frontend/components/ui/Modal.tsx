'use client';

/**
 * =============================================================================
 * REUSABLE MODAL COMPONENT
 * =============================================================================
 * 
 * Base modal with overlay, animations, and accessibility
 * Used for confirmations, forms, and other dialogs
 */

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;

  // TypeScript type that represents anything React can render
  // Is necessary because each modal is going to render differents <div>, <p>, <Components>, etc...
  children: React.ReactNode;    
  
  size?: 'sm' | 'md' | 'lg';
  showCloseButton?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true
}: ModalProps) {
  
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Size classes
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl'
  };

  return (
    <>
      {/* Backdrop overlay - click to close */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal container - centered */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        
        {/* Modal content */}
        <div
          className={cn(
            'bg-white rounded-lg shadow-xl w-full',
            sizeClasses[size],
            'transform transition-all'
          )}
          onClick={(e) => e.stopPropagation()} // Prevent close when clicking inside modal
        >
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-primary-600 rounded-t-lg">
            <h2 className="text-xl font-semibold text-white">
              {title}
            </h2>
            
            {/* Close button (X) */}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-white hover:text-gray-600 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-6 w-6 cursor-pointer" />
              </button>
            )}
          </div>

          {/* Body - children content */}
          <div className="px-6 py-4">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}