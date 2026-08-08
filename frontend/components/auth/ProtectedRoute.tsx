'use client';

/**
 * =============================================================================
 * PROTECTED ROUTE COMPONENT
 * =============================================================================
 * 
 * Protects pages that require authentication
 * Redirects to login if user is not authenticated
 * Wrap authenticated pages/layouts in this component
 * 
 * FLOW:
 * 1. Component checks if user is authenticated (via useAuth)
 * 2. If loading → show loading spinner
 * 3. If not authenticated → redirect to login
 * 4. If authenticated → render children
 */

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';  // Import useAuth to access and use context
import Spinner from '@/components/ui/Spinner';

interface ProtectedRouteProps {
  // Child components to wrap
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();  // // Get functions from context

  useEffect(() => {
    /**
     * REDIRECT TO LOGIN IF NOT AUTHENTICATED
     * 
     * WHY useEffect?
     * - Can't call router.push during render
     * - Must wait for component to mount
     * - React Hook rules
     */
    // Check authentication, if it finished loading (false) and is not authenticated (false)
    if (!isLoading && !isAuthenticated) {
      // Save the attempted URL to redirect back after login
      const returnUrl = pathname !== '/' ? `?returnUrl=${pathname}` : '';

      // Redirect to login to validate credentials
      router.push(`/login${returnUrl}`);
    }
  }, [isAuthenticated, isLoading, router, pathname]);

  /**
   * LOADING STATE
   * 
   * Show spinner while:
   * - Checking if token exists
   * - Verifying token with backend
   * - Loading user data
   */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-gray-600 font-body">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  /**
   * NOT AUTHENTICATED
   * 
   * Don't render anything.
   * useEffect above will redirect to login.
   */
  if (!isAuthenticated) {
    // null to prevent flash of protected content
    return null;
  }

  /**
   * AUTHENTICATED
   * 
   * User is logged in then it renders protected content
   */
  return <>{children}</>;
}