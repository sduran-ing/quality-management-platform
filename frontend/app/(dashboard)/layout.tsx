'use client';

/**
 * Dashboard layout with mobile-responsive sidebar
 *
 * State lives here because layout is the common parent
 * of both TopBar (button) and Sidebar (panel)
 * 
 * How This Works:
 * 
 * app/
 *   (dashboard)/
 *     layout.tsx       // Wraps all dashboard pages
 *     page.tsx         // Dashboard home (/)
 *     documents/
 *       page.tsx       //  /documents
 *     audits/
 *       page.tsx       //  /audits
 */


import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { AchievementProvider } from '@/lib/contexts/AchievementContext';
import AchievementProgress from '@/components/achievements/AchievementProgress';
import AchievementUnlock from '@/components/achievements/AchievementUnlock';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Controls whether the sidebar is open on mobile.
  // On desktop this value is ignored — sidebar is always visible via CSS.
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const pathname = usePathname();

  /**
   * Close sidebar whenever the user navigates to a new page.
   * Without this, tapping a nav link on mobile would navigate
   * but leave the sidebar overlay open.
   */
useEffect(() => {
  const frame = requestAnimationFrame(() => setIsSidebarOpen(false));
  return () => cancelAnimationFrame(frame);
}, [pathname]);

  return (
    <ProtectedRoute>
      <AchievementProvider>
        <div className="flex h-screen bg-gray-50">

          {/**
           * MOBILE BACKDROP
           *
           * A semi-transparent overlay rendered BEHIND the sidebar.
           * Clicking it closes the sidebar (same as tapping outside).
           *
           * Only visible on mobile (md:hidden) because on desktop
           * the sidebar is always open and needs no backdrop.
           *
           * z-20: below sidebar (z-30) but above page content
           */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 z-20 bg-black/50 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Sidebar receives open state and a way to close itself */}
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />

          {/* Main content area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* TopBar receives toggle function for hamburger button */}
            <TopBar onMenuToggle={() => setIsSidebarOpen(prev => !prev)} />

            {/* Page content */}
            <main className="flex-1 p-4 overflow-y-auto">
              {children}
            </main>
          </div>

          <AchievementProgress />
          <AchievementUnlock />
        </div>
      </AchievementProvider>
    </ProtectedRoute>
  );
}