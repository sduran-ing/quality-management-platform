'use client';  // This makes it a Client Component (can use hooks and state)

/**
 * =============================================================================
 * TOP BAR COMPONENT
 * =============================================================================
 * 
 * Top navigation bar shown on all authenticated pages.
 * 
 * FEATURES:
 * - Shows current user name and role
 * - User dropdown menu with logout
 * - Responsive design
 */

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Bell, User, Trophy, LogOut, ChevronDown } from 'lucide-react';
import { cn, getInitials, formatSnakeCase } from '@/lib/utils';
import { useAuth } from '@/lib/contexts/AuthContext';   // Import useAuth to access and use context
import Button from '@/components/ui/Button';

export default function TopBar() {
  // Get user data and logout function from Auth Context
  const { user, logout } = useAuth();
  
  // State to control dropdown visibility
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  // Ref for click outside detection
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click was outside the element (the dropdown menu)
      // contains() checks if clicked element is inside dropdown
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);
/**
 * USAGE
 * <div ref={dropdownRef}>
 * <button onClick={() => setIsUserMenuOpen(true)}>Menu</button>
 * {isUserMenuOpen && <div>Dropdown content</div>}
 * </div>
 */

  /**
   * Toggle user menu
   */
  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  /**
   * Handle logout
   * 
   * Calls logout from Auth Context which:
   * - Clears user state
   * - Removes token from localStorage
   * - Redirects to login page
   */
  const handleLogout = () => {
    setIsUserMenuOpen(false);
    logout();
  };

  // Safety check (shouldn't happen in protected route)
  if (!user) {
    return null;
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Left side - Top bar title placeholder */}
      <div className="flex items-center gap-4">
        <h2 className="font-heading text-xl font-semibold text-gray-900">
          {/* Top bar title */}
        </h2>
      </div>

      {/* Right side - Notifications and User Menu */}
      <div className="flex items-center gap-4">
        {/* Notifications button */}
        <Button
          variant="icon"
          aria-label="Notifications"
          className="relative"
        >
          <Bell className="w-5 h-5" />
          
          {/* Notification badge (if there are unread notifications) */}
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </Button>

        {/* User menu dropdown - Using the reference created before */}
        <div className="relative" ref={dropdownRef}>
          {/* User menu trigger button */}
          <Button
            variant="menu"
            onClick={toggleUserMenu}
            className={cn(
              isUserMenuOpen && 'bg-gray-100'  // Active state
            )}
          >
            {/* User avatar with initials */}
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
              <span className="text-white font-body font-medium text-sm">
                {getInitials(`${user.firstName} ${user.lastName}`)}
              </span>
            </div>

            {/* User name and role - Hidden on mobile (md:block) */}
            <div className="text-left hidden md:block">
              <p className="font-body text-base font-medium text-gray-900">
                {user.firstName} {user.lastName}
              </p>
              <p className="font-body text-sm text-gray-500">
                {formatSnakeCase(user.role)}
              </p>
            </div>

            {/* Dropdown arrow */}
            <ChevronDown 
              className={cn(
                'w-4 h-4 text-gray-500 transition-transform duration-200',
                isUserMenuOpen && 'rotate-180'
              )}
            />
          </Button>

          {/* Dropdown menu */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
              {/* User info section */}
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="font-body text-sm text-gray-500 mt-1">
                  {user.email}
                </p>
                <p className="font-body text-sm text-gray-500 mt-1">
                  {user.company.name}
                </p>
              </div>

              {/* Menu items */}
              <div className="py-2">
                {/* My Profile */}
                <Link
                  href="/"
                  // href="/profile"
                  className={cn(
                    'flex items-center gap-3 px-4 py-2',
                    'font-body text-sm text-gray-700',
                    'hover:bg-primary-50 hover:text-primary-700 transition-colors'
                  )}
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <User className="w-4 h-4" />
                  <span>My Profile</span>
                </Link>

                {/* Achievements */}
                <Link
                  href="/achievements"
                  className={cn(
                    'flex items-center gap-3 px-4 py-2',
                    'font-body text-sm text-gray-700',
                    'hover:bg-primary-50 hover:text-primary-700 transition-colors'
                  )}
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <Trophy className="w-4 h-4" />
                  <span>Achievements</span>
                </Link>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100 my-2" />

              {/* Logout */}
              <button
                onClick={handleLogout}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2',
                  'font-body text-sm text-red-600',
                  'hover:bg-red-50 transition-colors cursor-pointer'
                )}
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}