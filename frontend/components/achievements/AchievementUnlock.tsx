'use client';

/**
 * =============================================================================
 * ACHIEVEMENT UNLOCK MODAL
 * =============================================================================
 * 
 * Celebratory modal that appears when a user earns one or more achievements.
 * 
 * FEATURES:
 * - Centered modal with dimmed backdrop
 * - Scale and fade animation on mount
 * - Confetti burst when modal opens
 * - Prev/next arrows when multiple achievements earned at once
 * - Auto-dismisses after 10 seconds
 * - Manual dismiss via OK button or clicking backdrop
 * 
 * ARCHITECTURE: Two components (Outer and Inner)
 * 
 * Using a KEY prop.
 * When the key changes, React fully unmounts and remounts the child.
 * Remounting = fresh useState(0) + fresh useRef(false) automatically.
 * No effect-based reset needed at all.
 * 
 *   Outer component: reads context, passes key to Inner
 *   Inner component: all logic lives here, resets naturally on remount
 * 
 * FLOW:
 * 1. User completes an action then API returns newlyEarned achievements
 * 2. Component calls notify(achievements) and context stores newlyEarned
 * 3. Outer component sees newlyEarned.length > 0 → renders Inner with new key
 * 4. Inner mounts fresh → animation plays and timer starts
 * 5. User clicks OK or timer expires → clearNewlyEarned() → outer returns null
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import * as Icons from 'lucide-react';
import { LucideIcon, Trophy, ChevronLeft, ChevronRight, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';
import { useAchievementNotifier } from '@/lib/contexts/AchievementContext';
import { NewlyEarnedAchievement } from '@/lib/types';

// ============================================
// CONSTANTS
// ============================================

/**
 * How long modal stays before auto-dismissing.
 * Must match the CSS animation duration in timer bar below.
 */
const AUTO_DISMISS_MS = 10000;

// ============================================
// CONFETTI HELPER
// ============================================

/**
 * Fires two confetti bursts from slightly different angles
 * to create a natural spread effect across the modal. * 
 * Colors match the purple accent palette for brand consistency.
 * origin.y = 0.4 fires from upper-center (where the badge sits).
 */
const fireConfetti = () => {
  const config = {
    particleCount: 80,
    spread: 70,
    origin: { x: 0.5, y: 0.4 },
    colors: [
      '#A855F7', // accent-500
      '#9333EA', // accent-600
      '#C084FC', // accent-400
      '#E9D5FF', // accent-200
      '#F3E8FF', // accent-100
    ]
  };

  confetti({ ...config, angle: 60 });   // Left burst
  confetti({ ...config, angle: 120 });  // Right burst
};

// ============================================
// INNER COMPONENT
// ============================================

/**
 * AchievementUnlockInner
 * 
 * Contains ALL the modal logic and UI.
 * Receives achievements as props and a close callback.
 * 
 * This component is REMOUNTED (not updated) when a new
 * achievement batch arrives. Remounting gives
 * us fresh state (currentIndex = 0, confettiFired = false) for free,
 * without any effect-based reset that would trigger React warnings.
 * 
 * The parent (AchievementUnlock) controls this via the key prop.
 */
interface AchievementUnlockInnerProps {
  newlyEarned: NewlyEarnedAchievement[];
  clearNewlyEarned: () => void;
}

function AchievementUnlockInner({
  newlyEarned,
  clearNewlyEarned
}: AchievementUnlockInnerProps) {

  /**
   * Which achievement is currently displayed.
   * Starts at 0 on every fresh mount, no reset needed.
   */
  const [currentIndex, setCurrentIndex] = useState(0);

  /**
   * Controls the scale and fade CSS transition.
   * Starts false (hidden) then flips to true (visible) via requestAnimationFrame.
   * Starts fresh on every mount, no reset needed.
   */
  const [mounted, setMounted] = useState(false);

  /**
   * Tracks the auto-dismiss setTimeout ID.
   * Stored in ref so we can cancel it on manual dismiss or navigation.
   */
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Prevents confetti from firing more than once per modal session.
   * Even if this effect somehow re-runs, confetti won't double-fire.
   * Starts false on every fresh mount, no reset needed.
   */
  const confettiFiredRef = useRef(false);

  // Shortcut to the achievement currently on screen
  const current: NewlyEarnedAchievement | undefined = newlyEarned[currentIndex];

  // ============================================
  // CLOSE HANDLER
  // ============================================

  /**
   * Handles all close scenarios:
   * - Auto-dismiss timer fires
   * - User clicks OK button
   * - User clicks X button
   * - User clicks backdrop
   * - User presses Escape
   * 
   * FLOW:
   * 1. Cancel auto-dismiss timer (prevent double-close)
   * 2. Set mounted=false and triggers fade-out CSS transition
   * 3. Wait 300ms for fade-out to finish
   * 4. Call clearNewlyEarned(), context empties, outer returns 'null' finally 'unmounted'
   * 
   * WHY useCallback?
   * handleClose is used as a dependency in two useEffects below.
   * Without useCallback it would be recreated every render, causing
   * those effects to re-run unnecessarily.
   */
  const handleClose = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Trigger fade-out animation
    setMounted(false);

    // Clear context after animation completes
    setTimeout(clearNewlyEarned, 300);
  }, [clearNewlyEarned]);

  // ============================================
  // MOUNT: ANIMATION
  // ============================================

  /**
   * Runs once on mount (deps are stable: handleClose via useCallback).
   * Three things happen when this modal first appears:
   * 
   * 1. Scale animation: requestAnimationFrame delays setMounted(true)
   *    by one frame so React renders the initial scale-75/opacity-0 state
   *    first, then transitions to scale-100/opacity-100. Without this
   *    delay, the component starts already visible with no animation.
   * 
   * 2. Confetti: fires 200ms after mount so the modal is fully visible
   *    before the particles appear. Firing at 0ms would overlap with
   *    the scale animation looking cluttered.
   * 
   * 3. Auto-dismiss: starts countdown from the moment modal appears.
   * 
   * NOTE: setMounted(true) is inside a requestAnimationFrame callback,
   * this is NOT the same as calling setState synchronously in the effect
   * body. It's scheduling an update for the next browser frame, which
   * is the correct pattern and produces no warnings.
   */
  useEffect(() => {
    // 1. Trigger scale-in animation on next frame
    const frame = requestAnimationFrame(() => setMounted(true));

    // 2. Fire confetti once (ref prevents double-fire)
    if (!confettiFiredRef.current) {
      confettiFiredRef.current = true;
      setTimeout(fireConfetti, 200);
    }

    // 3. Start auto-dismiss countdown
    timerRef.current = setTimeout(handleClose, AUTO_DISMISS_MS);

    // Cleanup: cancel both if component unmounts before they fire
    return () => {
      cancelAnimationFrame(frame);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [handleClose]);

  // ============================================
  // KEYBOARD NAVIGATION
  // ============================================

  /**
   * Arrow keys navigate between achievements.
   * Escape closes the modal.
   * 
   * Uses functional update form for setCurrentIndex (prev => ...)
   * so we don't need currentIndex in the dependency array.
   * Without functional form, currentIndex would be a dep → effect
   * re-runs on every navigation → event listener added/removed constantly.
   * 
   * Math.min/max clamp the index within valid bounds:
   * - ArrowRight: can't go past last achievement
   * - ArrowLeft: can't go before first achievement
   */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setCurrentIndex(prev => Math.min(prev + 1, newlyEarned.length - 1));
      }
      if (e.key === 'ArrowLeft') {
        setCurrentIndex(prev => Math.max(prev - 1, 0));
      }
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [newlyEarned.length, handleClose]);

  // ============================================
  // ARROW BUTTON NAVIGATION
  // ============================================

  /**
   * Navigate to next achievement.
   * Resets auto-dismiss timer so user gets full 10s on each achievement.
   */
  const goNext = () => {
    if (currentIndex >= newlyEarned.length - 1) return;
    setCurrentIndex(prev => prev + 1);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(handleClose, AUTO_DISMISS_MS);
  };

  /**
   * Navigate to previous achievement.
   * Resets auto-dismiss timer so user gets full 10s on each achievement.
   */
  const goPrev = () => {
    if (currentIndex <= 0) return;
    setCurrentIndex(prev => prev - 1);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(handleClose, AUTO_DISMISS_MS);
  };

  // Safety guard (shouldn't happen but TypeScript needs it)
  if (!current) return null;

  /**
   * Resolve Lucide icon from the string name stored in DB.
   * Falls back to Trophy if the icon name doesn't match any Lucide icon.
   */
  const Icon = (Icons[current.icon as keyof typeof Icons] as LucideIcon) ?? Trophy;

  // ============================================
  // RENDER
  // ============================================

  return (
    /**
     * BACKDROP
     * 
     * Full-screen fixed overlay that:
     * - Dims the background with semi-transparent black
     * - Blurs content behind it (backdrop-blur-sm)
     * - Closes modal when clicked (clicking outside the card)
     * 
     * z-[60] puts it above AchievementProgress cards (z-50)
     * so progress bars hide behind the backdrop.
     * 
     * Opacity transitions with mounted state for smooth fade in/out.
     */
    <div
      className={cn(
        'fixed inset-0 z-[60] flex items-center justify-center p-4',
        'bg-black/50 backdrop-blur-sm',
        'transition-opacity duration-300',
        mounted ? 'opacity-100' : 'opacity-0'
      )}
      onClick={handleClose}
    >
      {/**
       * MODAL CARD
       * 
       * stopPropagation prevents clicks inside the card from
       * bubbling up to the backdrop and closing the modal.
       * 
       * Scale animation:
       * - mounted=false: scale-75 opacity-0 (starting state)
       * - mounted=true:  scale-100 opacity-100 (final state)
       * CSS transition handles the smooth interpolation between them.
       */}
      <div
        className={cn(
          'relative w-full max-w-lg bg-white rounded-2xl shadow-2xl',
          'border border-accent-100 overflow-hidden',
          'transition-all duration-300 ease-out',
          mounted ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
        )}
        onClick={e => e.stopPropagation()}
      >

        {/* X Button - top-right corner */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1 text-white/70 hover:text-white transition-colors z-10 cursor-pointer"
        >
          <X className="h-8 w-8" />
        </button>

        {/* ============================================
            PURPLE HEADER
            Achievement icon and title on purple gradient
            ============================================ */}
        <div className="bg-gradient-to-br from-accent-500 to-accent-700 px-6 pt-8 pb-6 text-center">

          {/* Badge icon in frosted circle */}
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white/20 rounded-full mb-4 ring-4 ring-white/30">
            <Icon className="h-12 w-12 text-white" />
          </div>

          {/* Label above achievement name */}
          <p className="text-accent-200 text-md font-semibold uppercase tracking-widest mb-1">
            Achievement Unlocked!
          </p>

          {/* Achievement name */}
          <h2 className="text-white text-3xl font-bold">
            {current.name}
          </h2>
        </div>

        {/* ============================================
            WHITE CONTENT SECTION
            Description, points, navigation and OK button
            ============================================ */}
        <div className="px-6 py-5 text-center">

          {/* What the user did to earn this */}
          <p className="text-gray-800 text-lg mb-4">
            {current.description}
          </p>

          {/* Points pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent-50 rounded-full mb-6">
            <Trophy className="h-3.5 w-3.5 text-accent-600" />
            <span className="text-accent-700 text-lg font-semibold">
              +{current.points} points
            </span>
          </div>

          {/**
           * MULTI-ACHIEVEMENT NAVIGATION
           * 
           * Only rendered when more than one achievement was earned
           * in the same action (e.g. completing a 3rd audit earns
           * "Audit Champion" and "Audit Master" at the same time).
           * 
           * Arrows + dots pattern: same as image carousels.
           * Disabled state prevents going out of bounds.
           */}
          {newlyEarned.length > 1 && (
            <div className="flex items-center justify-center gap-3 mb-5">

              {/* Previous */}
              <button
                onClick={goPrev}
                disabled={currentIndex === 0}
                className={cn(
                  'p-1.5 rounded-full border transition-colors ',
                  currentIndex === 0
                    ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                    : 'border-accent-200 text-accent-600 hover:bg-accent-50 cursor-pointer'
                )}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Position dots - one per achievement */}
              <div className="flex gap-1.5">
                {newlyEarned.map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      'w-1.5 h-1.5 rounded-full transition-colors',
                      index === currentIndex
                        ? 'bg-accent-500'    // Active dot
                        : 'bg-accent-200'   // Inactive dot
                    )}
                  />
                ))}
              </div>

              {/* Next */}
              <button
                onClick={goNext}
                disabled={currentIndex === newlyEarned.length - 1}
                className={cn(
                  'p-1.5 rounded-full border transition-colors',
                  currentIndex === newlyEarned.length - 1
                    ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                    : 'border-accent-200 text-accent-600 hover:bg-accent-50 cursor-pointer'
                )}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/**
           * OK BUTTON
           * 
           * Shows position when multiple achievements:
           * "Awesome! (1/3)" → "Awesome! (2/3)" → "Awesome! (3/3)"
           * Just "Awesome!" for single achievement.
           */}
          <button
            onClick={handleClose}
            className={cn(
              'w-full py-2.5 rounded-lg font-semibold text-md',
              'bg-accent-600 hover:bg-accent-700 text-white',
              'transition-colors cursor-pointer'
            )}
          >
            {newlyEarned.length > 1
              ? `Awesome! (${currentIndex + 1}/${newlyEarned.length})`
              : 'Awesome!'
            }
          </button>
        </div>

        {/**
         * TIMER BAR
         * 
         * Visual countdown showing how long before auto-dismiss.
         * Shrinks from full width to 0 over AUTO_DISMISS_MS.
         * 
         * Uses the same 'timer-shrink' keyframe as AchievementProgress.
         * Duration here must match AUTO_DISMISS_MS exactly.
         */}
        <div className="h-1 bg-accent-100">
          <div
            className="h-full bg-accent-500"
            style={{ animation: 'timer-shrink 10000ms linear forwards' }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// OUTER COMPONENT (exported)
// ============================================

/**
 * AchievementUnlock (public export)
 * 
 * Thin wrapper that reads from context and manages remounting.
 * 
 * THE KEY TRICK:
 * key={newlyEarned.map(a => a.id).join('-')}
 * 
 * When a new batch arrives, the key changes:
 * - Old key: "5-7"     → React unmounts AchievementUnlockInner
 * - New key: "5-7-12"  → React mounts fresh AchievementUnlockInner
 * 
 * Fresh mount = useState(0) runs again = currentIndex is 0
 * Fresh mount = useRef(false) runs again = confettiFired is false
 * 
 * Zero setState-in-effect needed. Zero React warnings.
 * 
 * Called in layout.tsx alongside AchievementProgress.
 */
export default function AchievementUnlock() {
  const { newlyEarned, clearNewlyEarned } = useAchievementNotifier();

  // Nothing earned = nothing to show
  if (newlyEarned.length === 0) return null;

  return (
    <AchievementUnlockInner
      // Key changes when achievement batch changes → triggers fresh remount
      key={newlyEarned.map(a => a.id).join('-')}
      newlyEarned={newlyEarned}
      clearNewlyEarned={clearNewlyEarned}
    />
  );
}