/**
 * =============================================================================
 * DASHBOARD PAGE
 * =============================================================================
 * 
 * This is the main dashboard that shows:
 * 1. Statistics cards (My Tasks, Open Findings, My Audits)
 * 2. Document status pie chart
 * 3. Achievement progress
 * 4. Upcoming audits schedule
 */

'use client';
/**
 * 'use client' directive
 * 
 * WHY NEEDED:
 * - We use React hooks (useState from custom hooks)
 * - We access browser APIs (localStorage in apiClient)
 * - We make client-side API calls
 * 
 * WITHOUT IT:
 * - Next.js tries to render on server
 * - Crashes (no localStorage on server)
 * - Hooks don't work in server components
 */

// Icons from lucide-react
import {
  Search,
  AlertTriangle,
  CheckSquare
} from 'lucide-react';

// Dashboard components (display data)
import StatCard from '@/components/dashboard/StatCard';
import DocumentStatusChart from '@/components/dashboard/DocumentStatusChart';
import AchievementSummary from '@/components/dashboard/AchievementSummary';
import { useAchievements } from '@/lib/hooks/useAchievements';    // Achievements hook
import UpcomingAudits from '@/components/dashboard/UpcomingAudits';

// UI components (loading & error states)
import Spinner from '@/components/ui/Spinner';
import ErrorMessage from '@/components/ui/ErrorMessage';

// Custom hooks (fetch data from backend)
import {
  useDashboardStats,      // Fetches: openCorrectiveActions, openFindings, myAudits
  useDocumentStats,       // Fetches: draft, pending, approved, obsolete counts
  useUpcomingAudits       // Fetches: next 5 upcoming audits
} from '@/lib/hooks/useDashboard';

export default function DashboardPage() {
  // ===========================================================================
  // DATA FETCHING
  // ===========================================================================

  /**
   * Fetch dashboard statistics 
   * 
   * Rename to avoid name collisions:
   * - data: stats (clearer name)
   * - isLoading: statsLoading (specific to stats)
   * - error: statsError (specific to stats)
   * 
   * WHY?
   * We have multiple data sources. Without renaming:
   * const { data, isLoading } = useDashboardStats();
   * const { data, isLoading } = useDocumentStats();  // Name collision
   */
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError
  } = useDashboardStats();        // Calls useDashboardStats() hook and returns { data, isLoading, error }

  /**
   * Fetch document statistics
   * 
   * Returns: { draft: 17, pending: 10, approved: 13 }
   */
  const {
    data: documentStats,
    isLoading: documentStatsLoading,
    error: documentStatsError
  } = useDocumentStats();

  /**
   * Fetch upcoming audits
   * 
   * Returns array of audit objects (max 5) (the component filters them)
   */
  const {
    data: upcomingAudits,
    isLoading: auditsLoading,
    error: auditsError
  } = useUpcomingAudits();

  /**
   * Fetch achievements
   * 
   * Returns 2 arrays of achievements. Completed and in progress (max 3 each) (the component filters them)
  */
  const { 
    achievements, 
    isLoading: achievementsLoading,
    error: achievementsError
  } = useAchievements();

  // Calculate My Tasks, if 'documentStats' and 'stats' are retrieved add the tasks of documents and corrective actions
  const myTasks =
    documentStats && stats
      ? documentStats.draft + documentStats.pending + stats.openCorrectiveActions : 0;
  

  return (

    <div className="space-y-6">
      {/**
       * ========================================================================
       * PAGE HEADER
       * ========================================================================
       */}
      <div>
        <h1 className="font-heading text-3xl font-bold text-gray-900">
          Dashboard
        </h1>
        <p className="font-body text-gray-600 mt-1">
          Welcome back! Your account activity is ready to review.
        </p>
      </div>

      {/**
       * ========================================================================
       * STATS GRID - ROW 1
       * ========================================================================
       * 
       * Shows 3 stat cards in a responsive grid:
       * - Mobile: 1 column (stacked)
       * - Tablet: 2 columns
       * - Desktop: 3 columns
       * 
       * RESPONSIVE CLASSES:
       * grid-cols-1: Default (mobile) - 1 column
       * md:grid-cols-2: Medium screens - 2 columns
       * lg:grid-cols-3: Large screens - 3 columns
       */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/**
         * CONDITIONAL RENDERING - THREE STATES
         * 
         * STATE 1: Loading (statsLoading === true)
         * - Show 3 skeleton cards with spinners
         * - Maintains layout (no shift when data loads)
         * 
         * STATE 2: Error (statsError !== null)
         * - Show error message
         * - Spans all columns (col-span-full)
         * 
         * STATE 3: Success (stats !== null)
         * - Show actual stat cards with real data
         * 
         * The order matters:
         * 1° Check loading first (prevents showing old data while refreshing)
         * 2° Check error second (prevents showing partial data on error)
         * 3° Show data last (when we know it's valid)
         */}

        {statsLoading ? (
          /**
           * LOADING STATE - Empty Cards
           * 
           * 3 CARDS
           * - Maintains layout (prevents layout shift)
           * - User sees where content will appear
           * - Better UX than blank space
           * 
           * WHY FRAGMENT <>?
           * - We need to return multiple elements
           * - Can't return array directly in JSX
           * - Fragment groups them without extra DOM node
           */
          <>
            {/* Card 1 - My Tasks */}
            <div className="bg-white rounded-xl shadow-card border border-gray-100 p-6 flex items-center justify-center h-32">
              <Spinner size="md" />
            </div>

            {/* Card 2 - Open Findings */}
            <div className="bg-white rounded-xl shadow-card border border-gray-100 p-6 flex items-center justify-center h-32">
              <Spinner size="md" />
            </div>

            {/* Card 3 - My Audits */}
            <div className="bg-white rounded-xl shadow-card border border-gray-100 p-6 flex items-center justify-center h-32">
              <Spinner size="md" />
            </div>
          </>

        ) : statsError ? (
          /**
           * ERROR STATE
           * 
           * col-span-full:
           * - Spans all 3 columns
           * - Error message centered across grid
           * - Doesn't leave empty cards
           */
          <div className="col-span-full">
            <ErrorMessage message={statsError} />
          </div>

        ) : stats ? (
          /**
           * SUCCESS STATE - Real Data
           * 
           * SAFE TO ACCESS:
           * stats.openCorrectiveActions, stats.openFindings, etc.
           */
          <>
            {/**
             * My Tasks Card
             * 
             * Shows number of tasks assigned to current user
             */}
            <StatCard
              title="My Tasks"
              value={myTasks}
              icon={CheckSquare}
              subtitle="Across all modules"
            />

            {/**
             * Open Findings Card
             * 
             * Shows number of findings requiring action
             */}
            <StatCard
              title="Open Findings"
              value={stats.openFindings}
              icon={AlertTriangle}
              subtitle="Requiring action"
            />

            {/**
             * My Audits Card
             * 
             * Shows number of active audits user is involved in
             * Trend: Number of audits this quarter (with up arrow)
             * 
             * TREND OBJECT:
             * - value: Number to show
             * - isPositive: true = up arrow (green), false = down arrow (red)
             * - label: Context text
             */}
            <StatCard
              title="My Audits"
              value={stats.myAudits}
              icon={Search}
              trend={{
                value: stats.myAuditsThisQuarter,
                isPositive: true,
                label: 'this quarter'
              }}
            />
          </>
        ) : null}
        {/**
         * The final : null handles edge case where:
         * - Not loading
         * - No error
         * - But no data yet
         */}
      </div>

      {/**
       * ========================================================================
       * CHARTS ROW - ROW 2
       * ========================================================================
       * 
       * Two cards side by side:
       * 1. Document Status Pie Chart (left)
       * 2. Achievement Progress (right)
       * 
       * RESPONSIVE:
       * - Mobile: Stacked (1 column)
       * - Desktop: Side by side (2 columns)
       */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/**
         * DOCUMENT STATUS CHART
         */}
        <div className="bg-white rounded-xl shadow-card border border-gray-100 p-6">
          {/* Card Title */}
          <h3 className="font-heading text-xl font-semibold text-gray-900 mb-4">
            My Document Status
          </h3>

          {/**
           * Same three-state pattern:
           * Loading → Error → Data
           * 
           * WHY h-64?
           * - Fixed height (256px)
           * - Prevents layout shift when data loads
           * - Chart needs consistent space
           */}
          {documentStatsLoading ? (
            // Check loading first
            <div className="h-64 flex items-center justify-center">
              <Spinner size="lg" />
            </div>

          ) : documentStatsError ? (
            // Check error second
            <ErrorMessage message={documentStatsError} />

          ) : documentStats ? (
            /** Show data third
             * DocumentStatusChart Component
             * 
             * Displyas pie chart with 4 colored slices
             */
            <DocumentStatusChart data={documentStats} />
          ) : null}
        </div>

        {/**
         * ACHIEVEMENT SUMMARY
         * 
         * SHOWS:
         * - Latest 3 unlocked achievements
         * - 3 achievements close to completion (progress bars)
         */}
        <div className="bg-white rounded-xl shadow-card border border-gray-100 p-6">
          <h3 className="font-heading text-xl font-semibold text-gray-900 mb-4">
            Achievement Progress
          </h3>

         {/**
         * Same three-state pattern:
         * Loading → Error → Data
         * ACHIEVEMENT DATA STRUCTURE:
         */}
     
        {achievementsLoading ? (
          // Check loading first
          <div className="h-48 flex items-center justify-center">
            <Spinner size="lg" />
          </div>

        ) : achievementsError ? (
          // Check error second
          <ErrorMessage message={achievementsError} />

        ) : achievements ? (
          /** Show data third
           * Achievements Summary Component
           * We send the whole achievements array, the component does the filtering
           * and defines the max amount of visible items
           */
          <AchievementSummary achievements={achievements} />
        ) : null}

        </div>
      </div>

      {/**
       * ========================================================================
       * UPCOMING AUDITS - ROW 3
       * ========================================================================
       * 
       * Full-width card showing next 5 upcoming audits
       */}
      <div className="bg-white rounded-xl shadow-card border border-gray-100 p-6">
        <h3 className="font-heading text-xl font-semibold text-gray-900 mb-4">
          Upcoming Audit Schedule
        </h3>

        {/**
         * Same three-state pattern:
         * Loading → Error → Data
         * AUDIT DATA STRUCTURE:
         */}

        {auditsLoading ? (
          // Check loading first
          <div className="h-48 flex items-center justify-center">
            <Spinner size="lg" />
          </div>

        ) : auditsError ? (
          // Check error second
          <ErrorMessage message={auditsError} />

        ) : upcomingAudits ? (
          /** Show data third
           * UpcomingAudits Component
           * 
           * DISPLAYS:
           * - List of audit cards
           * - "View All Audits" link at bottom
           * 
           * IF EMPTY:
           * - Shows empty state with calendar icon
           * - Message: "No upcoming audits scheduled"
           */
          <UpcomingAudits audits={upcomingAudits} />
        ) : null}
      </div>
    </div>
  );
}