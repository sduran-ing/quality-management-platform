'use client';

import { useEffect, useState } from 'react';
import * as Icons from 'lucide-react';
import { LucideIcon, X, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAchievementNotifier } from '@/lib/contexts/AchievementContext';
import { AchievementProgress as AchievementProgressType } from '@/lib/types';

// ============================================
// NOTIFICATION CARD
// ============================================

interface NotificationCardProps {
  notification: AchievementProgressType & { notificationId: string };
  onDismiss: (id: string) => void;
}

/**
 * Individual floating card.
 * Handles its own slide-in animation on mount.
 * Timer bar shrinks over 15 seconds via CSS animation.
 */
function NotificationCard({ notification, onDismiss }: NotificationCardProps) {

  // Controls slide-in: starts false (off-screen) → true (visible) after mount
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // requestAnimationFrame ensures the initial state renders first,
    // then we flip to true so the CSS transition actually plays
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  /**
   * Dynamic Lucide icon from stored icon name string.
   * e.g. icon = 'ClipboardCheck' → Icons.ClipboardCheck
   * Falls back to Trophy if icon name doesn't match any Lucide icon
   */
  const Icon = (Icons[notification.icon as keyof typeof Icons] as LucideIcon) ?? Trophy;

  return (
    <div
      className={cn(
        // Sizing and style of the achievements card
        'w-xl bg-white rounded-xl shadow-lg',
        'border border-accent-100 overflow-hidden',
        // Slide-in from right + fade in
        'transition-all duration-300 ease-out',
        mounted
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0'
      )}
    >
      {/* Card Body */}
      <div className="p-4">
        <div className="flex items-start gap-3">

          {/* Icon Badge */}
          <div className="p-2 bg-accent-100 rounded-lg flex-shrink-0">
            <Icon className="h-4 w-4 text-accent-600" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">

            {/* Header: name + close button */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-base font-semibold text-gray-900 truncate">
                {notification.name}
              </p>
              <button
                onClick={() => onDismiss(notification.notificationId)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Progress counts */}
            <p className="text-sm text-gray-600">
              {notification.current} / {notification.target} · {notification.points} pts
            </p>

            {/* Achievement Progress Bar */}
            <div className="mt-2 h-1.5 bg-accent-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${notification.percentage}%` }}
              />
            </div>

            <p className="text-sm text-accent-600 font-medium mt-1">
              {notification.percentage}% complete
            </p>
          </div>
        </div>
      </div>

      {/**
       * Timer Bar: shrinks from full width to 0 over 15 seconds.
       * CSS animation defined in globals.css (timer-shrink keyframe).
       * Gives user a visual countdown before auto-dismiss.
       */}
      <div className="h-0.5 bg-accent-100">
        <div
          className="h-full bg-accent-500"
          style={{ animation: 'timer-shrink 15000ms linear forwards' }}
        />
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * Renders floating notification stack at bottom-right.
 * Placed in layout.tsx so it's always available.
 * Reads from AchievementContext - no props needed.
 */
export default function AchievementProgress() {
  const { visible, dismiss } = useAchievementNotifier();

  if (visible.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {visible.map(notification => (
        <NotificationCard
          key={notification.notificationId}
          notification={notification}
          onDismiss={dismiss}
        />
      ))}
    </div>
  );
}