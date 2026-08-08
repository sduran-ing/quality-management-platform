// How This Works:
//
// app/
//   (dashboard)/
//     layout.tsx       // Wraps all dashboard pages
//     page.tsx         // Dashboard home (/)
//     documents/
//       page.tsx       //  /documents
//     audits/
//       page.tsx       //  /audits

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
  return (
  /**
   * ProtectedRoute wrapper
   * 
   * PROTECTS:
   * - Dashboard (/)
   * - All pages under (dashboard) folder
   * 
   * REDIRECTS:
   * - If not logged in to /login
   */
    <ProtectedRoute>
      {/* AchievementProvider: Wraps the dashboard layout and provides notification state to all children
      Handles the full queue lifecycle: notify(), visible, dismiss() */}
      <AchievementProvider>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar - Fixed position on left */}
        <Sidebar />

        {/* Main content area - Takes remaining width */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* TopBar */}
          <TopBar />

          {/* Page content - scrollable */}
          <main className="flex-1 p-4 overflow-y-auto">
              {children}  {/* All Dashboard pages render here */}
          </main>
        </div>

          {/* Floating achievement notifications, outside page content (bottom-right) */}
          <AchievementProgress />

          {/* Unlock modal and confetti (centered overlay) */}
          <AchievementUnlock />
      </div>
      </AchievementProvider>
    </ProtectedRoute>
  );
}