'use client';

/**
 * =============================================================================
 * MODAL HOOK
 * =============================================================================
 * 
 * Manages modal state with type-safe data
 * 
 * EXAMPLES OF DECLARATION:
 * - Simple: useModal<void>(); No data, just open/close
 * - With ID: useModal<number>(); Store entity ID
 * - With object: useModal<{ id: number; name: string }>(); Store multiple values
 * 
 * USAGE:
 * const deleteModal = useModal<number>();  // Store versionId
 * deleteModal.open(123);
 * deleteModal.close();
 * deleteModal.data = 123 or null
 * deleteModal.isOpen = true/false
 */

import { useState } from 'react';

// T stands for "Type" it's a generic, catch-all type parameter
// This hook works with any type of data, and it will depend on the modal purpose
export function useModal<T = void>() {
  const [data, setData] = useState<T | null>(null);

  return {
    // Is modal currently open?
    isOpen: data !== null,
    
    // Modal data (null when closed)
    data,
    
    // Open modal with defined data type
    open: (modalData: T) => setData(modalData),
    
    // Close modal and clear data
    close: () => setData(null)
  };
}