'use client';

// React hooks used to build the custom hooks
import { useState, useEffect } from 'react';

// API functions that talk to the backend
import { getDashboardStats, getDocumentStats, getUpcomingAudits } from '@/lib/api/dashboard';

/**
 * =============================================================================
 * CUSTOM HOOK: useDashboardStats
 * =============================================================================
 * 
 * This hook fetches dashboard statistics from our backend API.
 * It manages three pieces of state: data, loading, and error.
 * 
 * HOW IT WORKS:
 * 1. Component calls useDashboardStats()
 * 2. Hook immediately starts fetching data
 * 3. Hook returns { data, isLoading, error }
 * 4. Component re-renders when data arrives
 */
export function useDashboardStats() {
  /**
   * STATE 1: data
   * 
   * This holds the actual dashboard statistics from the backend.
   * 
   * INITIAL VALUE: null (we don't have data yet)
   *  
   * WHY useState?
   * - We need React to re-render the component when data arrives
   * - useState triggers re-renders when data changes
   * - Without it, component wouldn't update when data loads
   */
  const [data, setData] = useState<{
    openCorrectiveActions: number;
    openFindings: number;
    myAudits: number;
    myAuditsThisQuarter: number;
  } | null>(null);

  /**
   * STATE 2: isLoading
   * 
   * This tracks whether we're currently fetching data from the API.
   * 
   * INITIAL VALUE: true (we start loading immediately)
   * 
   * FLOW:
   * - Start: true (show spinner)
   * - API returns: false (hide spinner, show data)
   * - Error occurs: false (hide spinner, show error)
   * 
   * WHY isLoading:
   * - Shows user something is happening (better UX than blank screen)
   * - Prevents user from clicking buttons while data loads
   */
  const [isLoading, setIsLoading] = useState(true);

  /**
   * STATE 3: error
   * 
   * This holds any error message if the API call fails.
   * 
   * INITIAL VALUE: null (no error yet)
   * 
   * WHY error:
   * - Network might be down
   * - Backend might be down
   * - User's token might be expired
   * - We need to tell the user something went wrong
   */
  const [error, setError] = useState<string | null>(null);

  // =============================================================================
  // DATA FETCHING LOGIC
  // =============================================================================
  
  /**
   * WHAT IS useEffect?
   * - Runs code AFTER the component renders
   * - Perfect for data fetching (can't fetch during render - causes issues)
   * - Can run once, or every time something changes
   * 
   * IN THIS CASE:
   * - Runs once when component first mounts (empty dependency array [])
   * - Fetches dashboard stats from backend
   * - Updates state when data arrives (or error occurs)
   * 
   * FLOW:
   * 1. Component renders (with isLoading: true, data: null)
   * 2. useEffect runs AFTER render
   * 3. Fetches data from API
   * 4. When API responds, updates state
   * 5. State update triggers re-render with new data
   */
  useEffect(() => {
    /**
     * INNER FUNCTION: fetchStats
     * 
     * WHY A FUNCTION INSIDE useEffect?
     * - useEffect can't be async directly
     * - We need async/await to wait for API response
     * - Solution: Create async function inside, then call it
     *
     */
    const fetchStats = async () => {

      try {
        /**
         * Tells UI to show spinner
         * User knows something is happening
         */
        setIsLoading(true);
        
        /**
         * Clear any previous errors
         * 
         * WHY?
         * - User might have hit "retry" after an error
         * - We don't want old error messages showing
         * - Start fresh
         */
        setError(null);
        
        /**
         * Call the API
         * 1. Backend sends response back
         * 2. apiClient interceptor unwraps response.data
         * 3. We get back: { success: true, data: { ... } }
         * 
         * AWAIT:
         * 'await' pauses execution until API responds, without it, response would be undefined (Promise hasn't resolved yet)
         * 
         */
        const response = await getDashboardStats();
        
        /**
         * Save data to state
         * 
         * - response.data contains { openCorrectiveActions: 12, openFindings: 8, ... }
         * - setData(response.data) updates the data state
         * - React sees state changed → re-renders component
         * - Component now has data → shows real numbers instead of spinner
         * 
         * NOTE: This triggers a re-render
         * - Component re-runs with new data
         * - isLoading is still true at this point
         * - Is set to false in finally block
         */
        setData(response.data);
        
      } catch (err: any) {
        /**
         * THE err OBJECT:
         * - Contains error details from apiClient interceptor
         * - Has .message property with user-friendly text
         */
        
        //Log error for debugging
        console.error('Error fetching dashboard stats:', err);
        
        // Set error message for user
        setError(err.message || 'Failed to load dashboard statistics');
        
      } finally {
        /**
         * Set loading to false         * 
         * Ensures we ALWAYS stop the spinner
         */
        setIsLoading(false);
      }
    };

    /**
     * EXECUTE THE FUNCTION
     * 
     * We defined fetchStats above, now we actually call it.
     * 
     * WHY NOT CALL IT DIRECTLY IN useEffect?
     * Because useEffect can't be async, so we wrap it in a function.
     */
    fetchStats();
    
  }, []); 
  /**
   * DEPENDENCY ARRAY: []
   * 
   * The empty array [] means "run this effect ONCE when component mounts"
   * 
   * Empty array: useEffect(() => { ... }, [])
   * - Runs ONCE when component mounts
   * - Perfect for initial data fetch
   * - Dashboard stats don't depend on any props
   * - We want to fetch once when page loads
   * 
   * WHAT HAPPENS:
   * 1. Component mounts (renders first time)
   * 2. useEffect runs → calls fetchStats()
   * 3. Component won't run this useEffect again
   * 4. Unless component unmounts and mounts again
   */

  // =============================================================================
  // RETURN VALUES
  // =============================================================================
  
  /**
   * Return an object with data, loading state, and error
   * 
   * COMPONENT RECEIVES:
   * {
   *   data: { openCorrectiveActions: 12, ... } or null,
   *   isLoading: true or false,
   *   error: "error message" or null
   * }
   * 
   * COMPONENT USES IT:
   * if (isLoading) return <Spinner />;
   * if (error) return <Error message={error} />;
   * return <div>{data.openCorrectiveActions} CA</div>;
   */
  return { data, isLoading, error };
}

/**
 * =============================================================================
 * CUSTOM HOOK: useDocumentStats
 * =============================================================================
 * 
 * This follows the EXACT SAME PATTERN as useDashboardStats above.
 * Only differences:
 * 1. Different API endpoint (documents/stats instead of stats)
 * 2. Different data shape (draft, pending, approved, obsolete)
 */
export function useDocumentStats() {
  // State for document statistics
  const [data, setData] = useState<{
    draft: number;
    pending: number;
    approved: number;
  } | null>(null);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  
  // Error state
  const [error, setError] = useState<string | null>(null);

  // Fetch data when component mounts
  useEffect(() => {
    const fetchDocumentStats = async () => {
      try {
        // Start loading
        setIsLoading(true);
        setError(null);
        
        // Call API - waits for backend to respond
        const response = await getDocumentStats();
        
        // Save data - triggers component re-render
        setData(response.data);
        
      } catch (err: any) {
        // Handle errors - network issues, backend down, etc.
        console.error('Error fetching document stats:', err);
        setError(err.message || 'Failed to load document statistics');
        
      } finally {
        // Always stop loading (success or error)
        setIsLoading(false);
      }
    };

    // Execute the fetch function
    fetchDocumentStats();
  }, []); // Empty array = run once on mount

  // Return state for component to use
  return { data, isLoading, error };
}

/**
 * =============================================================================
 * CUSTOM HOOK: useUpcomingAudits
 * =============================================================================
 */
export function useUpcomingAudits() {
  // State for upcoming audits (array of audit objects)
  const [data, setData] = useState<Array<{
    id: number;
    title: string;
    scheduledStartDate: string;
    scheduledEndDate: string;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    leadAuditor: {
      id: number;
      firstName: string;
      lastName: string;
    } | null;
    processes: Array<{
      id: number;
      name: string;
      acronym: string;
    }>;
    standards: Array<{
      id: number;
      name: string;
      version: string;
    }>;
  }> | null>(null);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  
  // Error state
  const [error, setError] = useState<string | null>(null);

  // Fetch data when component mounts
  useEffect(() => {
    const fetchUpcomingAudits = async () => {
      try {
        // Start loading
        setIsLoading(true);
        setError(null);
        
        // Call API - waits for backend
        const response = await getUpcomingAudits();
        
        // Backend returns { success: true, data: { audits: [...] } }
        // We want just the audits array
        setData(response.data.audits);
        
      } catch (err: any) {
        // Handle errors
        console.error('Error fetching upcoming audits:', err);
        setError(err.message || 'Failed to load upcoming audits');
        
      } finally {
        // Stop loading
        setIsLoading(false);
      }
    };

    // Execute the fetch
    fetchUpcomingAudits();
  }, []); // Run once on mount

  // Return state for component
  return { data, isLoading, error };
}