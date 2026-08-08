'use client';

/**
 * =============================================================================
 * AUTH CONTEXT
 * =============================================================================
 * 
 * Manages authentication state globally across the application.
 * 
 * PROVIDES:
 * - Current user data (from JWT token)
 * - Loading state (while verifying token)
 * - Authentication status (logged in or not)
 * - Login/logout functions
 * 
 * USAGE:
 * Wrap app in <AuthProvider>
 * Use useAuth() hook in any component
 */

import {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode
} from 'react';
import { getCurrentUser, logoutUser, User, AuthResponse } from '@/lib/api/auth';

/**
 * =============================================================================
 * TYPE DEFINITIONS
 * =============================================================================
 */

/**
 * Auth Context Value
 * 
 * This is what components get when they use useAuth()
 */
interface AuthContextType {
    /**
     * Current logged-in user
     * - null if not logged in
     * - User object if logged in
     */
    user: User | null;

    /**
     * Loading state
     * - true while checking token on app load
     * - true while logging in/out
     * - false when ready
     * 
     * USE FOR:
     * - Show spinner during initial load
     * - Prevent rendering before auth check
     */
    isLoading: boolean;

    /**
     * Authentication status
     * - true if user is logged in
     * - false if not logged in
     */
    isAuthenticated: boolean;

    /**
     * Login function
     * 
     * Call after successful login to update context.
     * Stores user data in state.
     * 
     * @param authData - Response from login/register API
     */
    login: (authData: AuthResponse) => void;

    /**
     * Logout function
     * 
     * Clears user state and redirects to login.
     */
    logout: () => void;
}

/**
 * =============================================================================
 * CREATE CONTEXT
 * =============================================================================
 * 
 * createContext creates a "container" for shared data.
 * Components can "subscribe" to this container.
 * 
 * Initial value is undefined (we'll provide real value in Provider)
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);
/**
 * // AuthContext becomes an object like this:
{
  Provider: ProviderComponent,  // For providing value
  Consumer: ConsumerComponent,  
  displayName: string,          
}
 */

/**
 * =============================================================================
 * AUTH PROVIDER COMPONENT
 * =============================================================================
 * 
 * This component wraps the app and provides auth state to all children.
 * Stores user in state
 * Children can now access user via useAuth()
 */

// Props for AuthProvider
interface AuthProviderProps {
    // Child components to wrap
    children: ReactNode;
}

// The parameter is an object with children property, is the same as:
// export function AuthProvider({ children }: { children: ReactNode })
export function AuthProvider({ children }: AuthProviderProps) {
    // =========================================================================
    // STATE
    // =========================================================================

    /**
     * User state
     * 
     * STATES:
     * - null: Not logged in (or not checked yet)
     * - User object means: Logged in
     */
    const [user, setUser] = useState<User | null>(null);

    /**
     * Loading state
     * 
     * STATES:
     * - true: Checking token / logging in / logging out
     * - false: Ready (auth check complete)
     */
    const [isLoading, setIsLoading] = useState(true);

    /**
     * Computed authentication status
     * 
     * boolean for easy checking:
     * if user is different from null, it means it is authenticated
     */
    const isAuthenticated = user !== null;

    // =========================================================================
    // INITIAL AUTH CHECK
    // =========================================================================

    /**
     * On component mount, check if user is logged in
     * 
     * RUNS ONCE when app loads (empty dependency array [])
     * 
     * FLOW:
     * 
     * 2. If no token → set loading false, done
     * 3. If token exists → fetch user from backend
     * 4. If fetch succeeds → store user
     * 5. If fetch fails → remove invalid token
     * 6. Set loading false
     */
    useEffect(() => {
        const checkAuth = async () => {
            try {
                // 1. Check if token exists in localStorage
                const token = localStorage.getItem('auth_token');

                if (!token) {
                    // 2. If no token then set loading false
                    setIsLoading(false);
                    return;
                }

                /**
                 * 3. Token exists then verify it's valid
                 * 
                 * Call /auth/me endpoint to get current user.
                 * This validates the token server-side.
                 * 
                 */
                const response = await getCurrentUser();

                // Token valid, store user
                setUser(response.user);

            } catch (error) {
                /**
                 * Token invalid or expired
                 * 
                 * When that happens, clear token and treat as logged out
                 */
                console.error('Auth check failed:', error);
                localStorage.removeItem('auth_token');
                setUser(null);

            } finally {
                // Always stop loading (success or failure)
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []); // Empty array = run once on mount

    // =========================================================================
    // AUTH FUNCTIONS
    // =========================================================================

    /**
     * LOGIN FUNCTION
     * 
     * Called after successful login/register
     * Updates context with user data
     * Handles token storage
     * 
     * CALLED FROM:
     * - Login page (after loginUser())
     * - Register page (after registerUser())
     * 
     * WHY NEEDED:
     * - Login page already has user data from API response
     * - Instead of fetching again, just update context
     * - Faster, no extra API call
     * 
     * @param authData - Response from login/register API
     */
    const login = (authData: AuthResponse) => {


        /**
         * SAVE TOKEN TO LOCALSTORAGE
         * 
         * LOCALSTORAGE:
         * - Persists across page refreshes
         * - Survives browser close/reopen
         * - Accessible to apiClient interceptor
         * 
         * SECURITY NOTE:
         * - Vulnerable to XSS attacks
         * - Don't store sensitive data beyond token
         */
        localStorage.setItem('auth_token', authData.token);

        // Store user in context state
        setUser(authData.user);

    };

    /**
     * LOGOUT FUNCTION
     * 
     * Clears auth state and redirects to login.
     */
    const logout = () => {
        // 1. Clear user state
        setUser(null);

        // 2. Call auth API logout, it removes token and redirects
        logoutUser();
    };

    // =========================================================================
    // PROVIDE CONTEXT VALUE
    // =========================================================================

    /**
     * Context value object
     * 
     * This object is available to all components via useAuth()
     */
    const value: AuthContextType = {
        user,
        isLoading,
        isAuthenticated,
        login,
        logout,
    };

    /**
     * Render Provider with value
     * 
     * AuthContext.Provider makes 'value' available to all children.
     * Any child component can access it with useContext(AuthContext).
     */
    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * =============================================================================
 * CUSTOM HOOK: useAuth
 * =============================================================================
 * 
 * Hook to access auth context.
 * Use this instead of useContext(AuthContext).
 * 
 * BENEFITS:
 * - Shorter: useAuth() vs useContext(AuthContext)
 * - Type-safe: Returns AuthContextType (never undefined)
 * - Error checking: Throws if used outside provider
 * 
 * USAGE:
 * const { user, isAuthenticated, logout } = useAuth();
 */
export function useAuth(): AuthContextType {
    // Get context value
    const context = useContext(AuthContext);

    /**
     * Error if hook used outside provider
     * 
     * PREVENTS:
     * Using useAuth() in a component that's not wrapped in <AuthProvider>
     */
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
}