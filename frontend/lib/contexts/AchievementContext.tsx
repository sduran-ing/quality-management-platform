'use client';

/**
 * =============================================================================
 * ACHIEVEMENT CONTEXT
 * =============================================================================
 * 
 * Manages floating achievement notifications globally across the dashboard.
 * 
 * PROVIDES:
 * - notify(): Called by any component after an action that returns achievements
 * - visible: List of notifications currently shown on screen (max 3)
 * - dismiss(): Removes a notification (manual or auto after 15 seconds)
 * 
 * USAGE:
 * Wrap dashboard layout in <AchievementProvider>
 * Use useAchievementNotifier() hook in any component that triggers actions
 * 
 * FLOW:
 * 1. User creates a document then backend returns { achievements: { progress, newlyEarned } }
 * 2. Component calls notify(achievements)
 * 3. Context shows up to 3 progress bars, queues the rest
 * 4. Each bar auto-dismisses after 15 seconds
 * 5. Queued bars slide in as visible ones dismiss
 */

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect
} from 'react';
import { AchievementsResult, AchievementProgress, NewlyEarnedAchievement } from '@/lib/types';

/**
 * =============================================================================
 * TYPE DEFINITIONS
 * =============================================================================
 */

/**
 * Extends AchievementProgress with a unique instance ID.
 * 
 * The same achievement could appear in two quick consecutive actions,
 * is not safe to use achievement.id
 * Without notificationId, React's key 
 * would collide and one card would be silently ignored.
 * 
 * notificationId = achievement.id + timestamp + random string
 * This guarantees each card in the list is truly unique
 */
interface AchievementNotification extends AchievementProgress {
  notificationId: string;
}

// Trigger notifications from an action response
interface AchievementContextType {
  /**
   * CALLED FROM:
   * - Any component that calls an action API (createDocument, completeAudit, etc.)
   * - Only call when response.achievements exists
   * 
   * EXAMPLE:
   * const response = await createDocument(payload);
   * if (response.achievements) notify(response.achievements);
   */
  notify: (achievements: AchievementsResult) => void;

  /**
   * Currently visible notifications (max 3 at a time).
   * 
   * USED BY:
   * - AchievementProgress component to render the floating cards
   */
  visible: AchievementNotification[];

  /**
   * Remove a notification by its instance ID.
   * 
   * CALLED BY:
   * - Auto-dismiss timer (after 15 seconds)
   * - User clicking the X button on a card
   * 
   * If queue has items, promotes the next one into the visible list
   */
  dismiss: (notificationId: string) => void;

  newlyEarned: NewlyEarnedAchievement[];       // Triggers unlock modal
  clearNewlyEarned: () => void;                // Called when modal closes
}

/**
 * =============================================================================
 * CONSTANTS
 * =============================================================================
 */

// Maximum cards shown at the same time
// Keeps the UI clean
const MAX_VISIBLE = 3;

/**
 * Each card stays visible before auto-dismissing
 * 15000ms = 15 seconds
 * Must match the CSS animation duration in globals.css (timer-shrink keyframe)
 */
const DISMISS_AFTER_MS = 15000;

/**
 * =============================================================================
 * CREATE CONTEXT
 * =============================================================================
 * 
 * createContext creates a container for shared notification state
 * Components can use this container via useAchievementNotifier()
 * 
 * Initial value is null, the real value is provided by AchievementProvider
 * The null check in useAchievementNotifier() catches usage outside the provider
 */
const AchievementContext = createContext<AchievementContextType | null>(null);

/**
 * =============================================================================
 * ACHIEVEMENT PROVIDER COMPONENT
 * =============================================================================
 * 
 * Wraps the dashboard layout and provides notification state to all children.
 * Handles the full queue lifecycle:
 * 
 * 1. notify() called
 * 2. Available slots? Yes, Show immediately + start timer
 *                     No, Add to queue
 * 
 * 3. Timer fires → dismiss() removes from visible
 * 4. Queue has items? Yes, Promote next item + start its timer
 *                     No, visible shrinks, nothing promoted
 */
export function AchievementProvider({ children }: { children: React.ReactNode }) {

  /**
   * =============================================================================
   * STATE
   * =============================================================================
   */

  /**
   * Currently visible notifications (what the user sees on screen).
   * 
   * STATES:
   * - []          Nothing showing (component returns null)
   * - [A]         One card visible
   * - [A, B, C]   Three cards (maximum)
   */
  const [visible, setVisible] = useState<AchievementNotification[]>([]);

  /**
 * Achievements just earned - triggers unlock modal when not empty.
 * Cleared when user dismisses the modal or it auto-dismisses.
 */
const [newlyEarned, setNewlyEarned] = useState<NewlyEarnedAchievement[]>([]);

  /**
   * =============================================================================
   * REFS
   * =============================================================================
   */

  /**
   * Queue of notifications waiting for a visible slot
   * 
   * REF INSTEAD OF STATE
   * We don't need to re-render when the queue changes
   * The queue is internal bookkeeping, only visible[] triggers renders
   * (state would cause unnecessary re-renders every time something is added to or removed from the queue)
   * 
   * Callbacks (notify, dismiss) need the latest queue without
   * stale closure issues. Refs always give you the current value.
   */
  const queueRef = useRef<AchievementNotification[]>([]);

  /**
   * Tracks active setTimeout IDs so we can cancel them when needed
   * 
   * Each notification has its own timer. We need to:
   * - Cancel a specific timer when user manually dismisses a card
   * - Cancel ALL timers when the provider unmounts (cleanup)
   * 
   * Map<notificationId, timeoutId> lets us find and cancel the right timer
   * 
   * WHY REF?
   * Same reason as queueRef, no re-render needed, always current value
   */
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  /**
   * Ref to hold the latest dismiss function.
   * 
   * Circular dependency problem: 
   * startTimer needs to call dismiss (via setTimeout callback)
   * dismiss needs to call startTimer (when promoting from queue)
   * 
   * If startTimer captured dismiss directly in its closure,
   * it would capture a stale version (the dismiss from first render).
   * 
   * Solution: startTimer calls dismissRef.current instead.
   * dismissRef is kept in sync with the latest dismiss via useEffect.
   * This breaks the circular dependency cleanly.
   */
  const dismissRef = useRef<(id: string) => void>(() => {});

  /**
   * =============================================================================
   * START TIMER
   * =============================================================================
   */

  /**
   * Starts the auto-dismiss timer for a notification.
   * 
   * Called when:
   * - A notification is first shown (in notify())
   * - A queued notification is promoted to visible (in dismiss())
   * 
   * WHY useCallback?
   * Prevents the function from being recreated on every render.
   * notify() and dismiss() depend on startTimer — if startTimer
   * changed every render, it would cascade and recreate them too.
   * 
   * No dependencies needed because startTimer only uses:
   * - timers ref (always current)
   * - dismissRef (always current)
   * - DISMISS_AFTER_MS (constant)
   */
  const startTimer = useCallback((notificationId: string) => {
    const timeoutId = setTimeout(
      () => dismissRef.current(notificationId), // Uses ref to get latest dismiss
      DISMISS_AFTER_MS
    );

    // Store the timer ID so we can cancel it later if needed
    timers.current.set(notificationId, timeoutId);
  }, []); // No deps - intentionally uses refs only

  /**
   * =============================================================================
   * DISMISS
   * =============================================================================
   */

  /**
   * Removes a notification from the visible list.
   * Promotes the next queued item if available.
   * 
   * CALLED FROM:
   * - Auto-dismiss timer (after 15 seconds)
   * - User clicking X button on a card
   * 
   * 1. Cancel the auto-dismiss timer for this card
   * 2. Remove card from visible list
   * 3. Calculate open slots after removal
   * 4. If slots available AND queue has items then promote next item
   * 5. Start timer for newly promoted item
   */
  const dismiss = useCallback((notificationId: string) => {

    // Step 1: Cancel the timer so it doesn't fire twice
    const timerId = timers.current.get(notificationId);
    if (timerId) {
      clearTimeout(timerId);
      timers.current.delete(notificationId);
    }

    setVisible(prev => {
      // Step 2: Remove the dismissed card
      const remaining = prev.filter(n => n.notificationId !== notificationId);

      /**
       * Steps 3-5: Promote from queue if there's room
       * 
       * Before dismiss: visible = [A, B, C] (full), queue = [D, E]
       * After dismiss:  remaining = [A, B]
       * openSlots = MAX_VISIBLE(3) - remaining.length(2) = 1
       * toPromote = queue.splice(0, 1) = [D]  → queue is now [E]
       * Start timer for D
       * Return [A, B, D] → visible shows 3 again
       */
      const openSlots = MAX_VISIBLE - remaining.length;

      if (openSlots > 0 && queueRef.current.length > 0) {
        // splice mutates the queue array directly (removes and returns items)
        const toPromote = queueRef.current.splice(0, openSlots);
        toPromote.forEach(item => startTimer(item.notificationId));
        return [...remaining, ...toPromote];
      }

      return remaining;
    });
  }, [startTimer]);

  /**
   * Keep dismissRef in sync with the latest dismiss function.
   * This runs after every render where dismiss changes.
   * Ensures startTimer's setTimeout always calls the current dismiss.
   */
  useEffect(() => {
    dismissRef.current = dismiss;
  }, [dismiss]);

  /**
   * =============================================================================
   * NOTIFY
   * =============================================================================
   */

  /**
   * Called by components after actions that return achievements.
   * 
   * CALLED FROM:
   * Any component that calls an action API and gets achievements back.
   * Example: createDocument, completeAudit, closeFinding, etc.
   * 
   * FLOW:
   * 1. Validate achievements has progress bars to show
   * 2. Add unique notificationId to each item
   * 3. Calculate available visible slots
   * 4. Show what fits immediately (start their timers)
   * 5. Queue the rest for later
   * 
   * EXAMPLE:
   * notify({ progress: [A, B, C, D], newlyEarned: [] })
   * visible = [X, Y]  → openSlots = 1
   * Shows [A], queues [B, C, D]
   * When X dismisses → promotes B, etc.
   */
  const notify = useCallback((achievements: AchievementsResult) => {

    // Store newly earned for unlock modal
    if (achievements?.newlyEarned?.length > 0) {
      setNewlyEarned(achievements.newlyEarned);
    }

    // Step 1: Nothing to show if no progress bars
    if (!achievements?.progress?.length) return;

    /**
     * Step 2: Add unique instance ID to each notification.
     * 
     * Format: {achievementId}-{timestamp}-{randomString}
     * Example: "5-1717430000000-x7k2p"
     * 
     * The random string handles the edge case where two notifications
     * are created in the same millisecond (timestamp alone not enough).
     */
    const newNotifications: AchievementNotification[] = achievements.progress.map(p => ({
      ...p,
      notificationId: `${p.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`
    }));

    setVisible(prev => {
      const openSlots = MAX_VISIBLE - prev.length;

      if (openSlots <= 0) {
        // Step 4 (no room): Queue everything for later
        queueRef.current.push(...newNotifications);
        return prev; // Visible unchanged
      }

      // Step 4 (room available): Show what fits, queue the rest
      const toShow = newNotifications.slice(0, openSlots);
      const toQueue = newNotifications.slice(openSlots);

      queueRef.current.push(...toQueue);
      toShow.forEach(item => startTimer(item.notificationId));

      return [...prev, ...toShow];
    });
  }, [startTimer]);


 /**
 * Called when unlock modal closes.
 * Clears the newlyEarned list so modal doesn't reappear.
 */
  const clearNewlyEarned = useCallback(() => {
    setNewlyEarned([]);
  }, []);

  /**
   * =============================================================================
   * CLEANUP
   * =============================================================================
   */

  /**
   * Clear all active timers when the provider unmounts.
   * 
   * WHY NEEDED:
   * If the user navigates away while notifications are showing,
   * the provider unmounts. Without cleanup, the setTimeout callbacks
   * would try to call setState on an unmounted component → memory leak warning.
   * 
   * The returned function runs on unmount (standard useEffect cleanup pattern).
   */
  useEffect(() => {
    return () => {
      timers.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  /**
   * =============================================================================
   * PROVIDE CONTEXT VALUE
   * =============================================================================
   * 
   * This object is available to all children via useAchievementNotifier()
   */
  const value: AchievementContextType = {
    notify,
    visible,
    dismiss,
    newlyEarned,
    clearNewlyEarned
  };

  return (
    <AchievementContext.Provider value={value}>
      {children}
    </AchievementContext.Provider>
  );
}

/**
 * =============================================================================
 * CUSTOM HOOK: useAchievementNotifier
 * =============================================================================
 * 
 * Hook to access the achievement notification context.
 * Use this instead of useContext(AchievementContext) directly.
 * 
 * BENEFITS:
 * - Shorter: useAchievementNotifier() vs useContext(AchievementContext)
 * - Type-safe: Returns AchievementContextType (never null)
 * - Error checking: Throws if used outside provider
 * 
 * TWO USAGE PATTERNS:
 * 
 * 1. In action components (trigger notifications):
 *    const { notify } = useAchievementNotifier();
 *    After API call: if (response.achievements) notify(response.achievements)
 * 
 * 2. In the floating UI component (read notifications):
 *    const { visible, dismiss } = useAchievementNotifier();
 *    Render visible[], call dismiss() on X click or timer
 */
export function useAchievementNotifier() {
  const context = useContext(AchievementContext);

  /**
   * Catches usage outside <AchievementProvider>.
   * 
   * PREVENTS:
   * Using useAchievementNotifier() in a component that isn't
   * wrapped in <AchievementProvider> in the tree above it
   * Without this check, context would silently be null and crash
   */
  if (!context) {
    throw new Error('useAchievementNotifier must be used inside AchievementProvider');
  }

  return context;
}