'use client';  // This makes it a Client Component (can use hooks and state)

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home,
  CheckSquare,
  FileText,
  FilePlus,
  Clock,
  List,
  Archive,
  FileType,
  Search,
  Calendar,
  ListChecks,
  AlertTriangle,
  Users,
  Building2,
  GitBranch,
  Trophy,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Define the structure for a navigation item
interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;  // Lucide icon component
  href?: string;  // Direct link (for items without children)
  badge?: number;  // Optional count badge
  children?: NavigationItem[];  // Submenu items
}

interface SidebarProps {
  /**
   * Whether the sidebar is open on mobile
   * On desktop (≥768px) this prop is ignored, sidebar is always visible
   * Controlled by layout.tsx which owns the open/close state
   */
  isOpen: boolean;

  /**
   * Called when the user closes the sidebar on mobile:
   * - Clicking the X button inside the sidebar
   * Layout.tsx also closes it on route change and backdrop click
   */
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  // Track which menu sections are open/closed
  // Object where keys are item IDs and values are true/false
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    documents: false,
    audits: false,
    organization: false,
  });

  // Get current path to highlight active link
  const pathname = usePathname();

  // Toggle a menu section open/closed
  const toggleMenu = (id: string) => {
    setOpenMenus(prev => ({
      ...prev,  // Keep other menu states
      [id]: !prev[id]  // Toggle this specific menu
    }));
  };

  // Navigation structure - defines entire sidebar
  const navigation: NavigationItem[] = [
    // {
    //   id: 'my-tasks',
    //   label: 'My Tasks',
    //   icon: CheckSquare,
    //   href: '/tasks',
    //   badge: 12,  // Dummy data
    // },
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      href: '/',
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: FileText,
      children: [
        {
          id: 'create-document',
          label: 'Create Document',
          icon: FilePlus,
          href: '/documents/create',
        },
        {
          id: 'pending-documents',
          label: 'Pending Documents',
          icon: Clock,
          href: '/documents/pending'
        },
        {
          id: 'master-list',
          label: 'Master Document List',
          icon: List,
          href: '/documents',
        },
        {
          id: 'obsolete-list',
          label: 'Obsolete Document List',
          icon: Archive,
          href: '/documents/obsolete',
        }
      ],
    },
    {
      id: 'audits',
      label: 'Audits',
      icon: Search,
      children: [
        {
          id: 'schedule-audit',
          label: 'Schedule Audit',
          icon: Calendar,
          href: '/audits/create',
        },
        {
          id: 'audits-list',
          label: 'Audits List',
          icon: ListChecks,
          href: '/audits',
        }
      ],
    },
    // // FUTURE MODULES
    // {
    //   id: 'organization',
    //   label: 'Organization',
    //   icon: Building2,
    //   children: [
    //     {
    //       id: 'users',
    //       label: 'Users',
    //       icon: Users,
    //       href: '/organization/users',
    //     },
    //     {
    //       id: 'departments',
    //       label: 'Departments',
    //       icon: Building2,
    //       href: '/organization/departments',
    //     },
    //     {
    //       id: 'processes',
    //       label: 'Processes',
    //       icon: GitBranch,
    //       href: '/organization/processes',
    //     },
    //   ],
    // },
    {
      id: 'achievements',
      label: 'Achievements',
      icon: Trophy,
      href: '/achievements',
    },
  ];

  /**
   * Recursively collects all leaf hrefs from the navigation tree.
   * 
   * Used to detect whether the current path has an explicit nav entry.
   * If it does, ONLY that exact item should be active, no prefix matching.
   * 
   * Example result:
   * ['/', '/documents/create', '/documents/pending', '/documents', ...]
   */
  const getAllLeafHrefs = (items: NavigationItem[]): string[] => {
    return items.flatMap(item =>
      item.children
        ? getAllLeafHrefs(item.children)  // Recurse into children
        : item.href ? [item.href] : []    // Collect leaf hrefs only
    );
  };

  /**
   * Determines if a nav item should be highlighted.
   * 
   * TWO CASES:
   * 
   * 1. Exact match → always active
   *    pathname='/documents/create', href='/documents/create' = true
   * 
   * 2. Current path has an explicit nav entry (sibling route)
   *    this item is NOT active even if it's a prefix match
   *    pathname='/documents/create' (exists in nav), href='/documents' = false
   */
  const isActive = (href?: string) => {
    if (!href) return false;

    // Root path: exact match only
    if (href === '/') return pathname === '/';

    // Case 1: Exact match — always active
    if (pathname === href) return true;

    // Case 2: Check if current path has an explicit nav entry
    const allLeafHrefs = getAllLeafHrefs(navigation);
    const currentPathHasNavEntry = allLeafHrefs.includes(pathname);

    // Case 2: Another nav item owns this exact path, not active
    if (currentPathHasNavEntry) return false;

    return false;
  };

  // Render a single navigation item (with or without children)
  const renderNavItem = (item: NavigationItem, isChild = false) => {
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openMenus[item.id];
    const active = isActive(item.href);

    // If item has children (is a parent menu)
    if (hasChildren) {
      return (
        <div key={item.id}>
          {/* Parent menu button (toggles open/closed) */}
          <button
            onClick={() => toggleMenu(item.id)}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2 rounded-lg',
              'font-body text-sm font-medium transition-colors',
              'hover:bg-primary-50 hover:text-primary-700',
              'text-white'
            )}
          >
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </div>
            
            {/* Arrow icon (points down when open, right when closed) */}
            {isOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {/* Submenu items (only shown when open) */}
          {isOpen && (
            <div className="ml-8 mt-1 space-y-1">
              {item.children?.map(child => renderNavItem(child, true))}
            </div>
          )}
        </div>
      );
    }

    // If item is a direct link (no children)
    return (
      <Link
        key={item.id}
        href={item.href || '#'}
        className={cn(
          'flex items-center justify-between px-3 py-2 rounded-lg',
          'font-body text-sm font-medium transition-colors',
          'hover:bg-primary-50 hover:text-primary-700',
          active 
            ? 'bg-white text-primary-700'  // Active link styling
            : 'text-white',
          isChild && 'text-sm'  // Slightly smaller text for submenu items
        )}
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5" />
          <span>{item.label}</span>
        </div>

        {/* Badge (if item has a count) */}
        {item.badge !== undefined && item.badge > 0 && (
          <span className="px-2 py-0.5 text-xs font-medium bg-primary-600 text-white rounded-full">
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    /**
     * SIDEBAR CONTAINER
     *
     * MOBILE (< 768px):
     * - position: fixed → out of flex flow, overlays content
     * - Full height (inset-y-0), anchored to left edge
     * - z-30: above backdrop (z-20) and page content
     * - Slides in/out via translate-x:
     *     isOpen=false → -translate-x-full (hidden off-screen left)
     *     isOpen=true  →  translate-x-0    (visible)
     * - transition-transform: animates the slide smoothly
     *
     * DESKTOP (≥ 768px):
     * - md:relative: back in the flex flow (takes up its 256px)
     * - md:translate-x-0: always visible, ignores isOpen prop
     * - md:z-auto: no special stacking needed
     */
    <aside
      className={cn(
        // Base styles (both breakpoints)
        'w-64 h-screen bg-primary-600 flex flex-col',

        // Mobile: fixed overlay with slide animation
        'fixed inset-y-0 left-0 z-30',
        'transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full',

        // Desktop: back in normal flow, always visible
        'md:relative md:translate-x-0 md:z-auto'
      )}
    >
      {/* LOGO SECTION */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center">
            <span className="text-white font-heading font-bold text-lg">Q</span>
          </div>
          <span className="font-heading font-semibold text-lg text-gray-900">
            QMS Platform
          </span>
        </div>

        {/**
         * CLOSE BUTTON — mobile only
         *
         * Gives the user a clear way to dismiss the sidebar
         * without having to tap the backdrop.
         * Hidden on desktop (md:hidden) where sidebar is always open.
         */}
        <button
          onClick={onClose}
          className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          aria-label="Close navigation menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* NAVIGATION ITEMS */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {navigation.map(item => renderNavItem(item))}
        </div>
      </nav>

      {/* FOOTER */}
      <div className="h-16 border-t border-gray-200 px-6 flex items-center">
        <span className="text-xs text-white font-body">Version 1.0.0</span>
      </div>
    </aside>
  );
}