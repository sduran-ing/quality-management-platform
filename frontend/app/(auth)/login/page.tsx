'use client';

/**
 * =============================================================================
 * LOGIN PAGE
 * =============================================================================
 * 
 * Allows users to authenticate with email and password or the default demo account.
 * 
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';  // react-hook-form: Form state management
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';    // zod: Schema validation (type-safe)
import { loginUser,  } from '@/lib/api/auth';
import { useAuth } from '@/lib/contexts/AuthContext';  // Import useAuth to access and use context
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

/**
 * =============================================================================
 * FORM VALIDATION SCHEMA
 * =============================================================================
 * 
 * Defines the shape and validation rules for the login form.
 * 
 * USING ZOD:
 * - Type-safe validation
 * - Automatic TypeScript types
 * - Clear error messages
 */

const loginSchema = z.object({

    // Email field validation
    email: z.email({ message: 'Please enter a valid email address' }),

    // Password field validation
    password: z
        .string()
        .min(1, { message: 'Password is required' })    // Required (can't be empty)
        .min(6, { message: 'Password must be at least 6 characters' }),   // Minimum 6 characters
});

/**
 * TypeScript type inferred from schema
 * 
 * AUTOMATICALLY CREATES:
 * type LoginFormData = {
 *   email: string;
 *   password: string;
 * }
 */
type LoginFormData = z.infer<typeof loginSchema>;

/**
 * =============================================================================
 * LOGIN PAGE COMPONENT
 * =============================================================================
 */

export default function LoginPage() {
    // Next.js router for navigation
    const router = useRouter();

    const { login } = useAuth();  // Get login function from context

    /**
     * STATE: API error message
     * 
     * SEPARATED FROM FORM ERRORS:
     * - Form errors: Validation errors (wrong format)
     * - API errors: Backend errors (wrong password, user not found)
     * 
     */
    const [apiError, setApiError] = useState<string | null>(null);

    /**
     * STATE: Loading indicator
     * 
     * PREVENTS:
     * - Double-submit (clicking Login twice)
     * - User clicking while request is being processed
     * 
     */
    const [isLoading, setIsLoading] = useState(false);

    /**
     * REACT HOOK FORM SETUP
     * 
     * HOW IT WORKS:
     * 1. User types in input
     * 2. react-hook-form tracks value
     * 3. On submit, Zod validates
     * 4. If valid → call onSubmit
     * 5. If invalid → show errors
     */
    const {
        register,   // register: Connect input to form state
        handleSubmit,   // handleSubmit: Handle form submission
        formState: { errors }, // formState.errors: Validation error messages
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema), // resolver: Use Zod for validation
    });

    /**
     * FORM SUBMIT HANDLER
     * 
     * CALLED WHEN:
     * - User clicks "Login" button
     * - User presses Enter in form
     * - ONLY if form passes validation
     * 
     * @param data - Validated form data (email, password)
     */
    const onSubmit = async (data: LoginFormData) => {
        try {
            // Clear any previous errors
            setApiError(null);

            // Show loading state (button becomes disabled with spinner)
            setIsLoading(true);

            /**
             * CALL LOGIN API
             * 
             * Backend finds user by email, compares password hash
             * Generates JWT token and returns token + user data
             */
            const response = await loginUser({
                email: data.email,
                password: data.password,
            });

            // Update auth context with user data and token
            login(response);  // Update context

            /**
             * REDIRECT TO DASHBOARD
             * 
             * router.push:
             * - Client-side navigation (fast)
             * - No full page reload
             * - Preserves React state
             */            
            router.push('/');

        } catch (error: any) {
            /**
             * ERROR HANDLING
             * ERROR OBJECT STRUCTURE (from apiClient interceptor):
             * {
             *   message: "Invalid credentials",
             *   status: 401,
             *   data: { success: false, message: "..." }
             * }
             * 
             * Console output for debugging
             */
            console.error('Login error:', error);

            // Show user-friendly error message
            setApiError(
                error.message || 'An error occurred during login. Please try again.'
            );

        } finally {
            /**
             * Even if there's an error, we need to stop loading state
             * Otherwise button stays disabled
             */
            setIsLoading(false);
        }


    };

    /**
   * DEMO LOGIN HANDLER
   * 
   * One-click login with demo credentials.
   * No need to type email/password.
   */
    const handleDemoLogin = async () => {
        try {
            setApiError(null);
            setIsLoading(true);

            // Login with demo credentials
            const response = await loginUser({
                email: 'demo@qms-platform.com',
                password: 'Demo123!',
            });

            // Update auth context with user data and token
            login(response);  // Update context

            router.push('/');

        } catch (error: any) {
            console.error('Demo login error:', error);
            setApiError(
                'Demo login failed. Please try again or use manual login.'
            );
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                {/**
         * =====================================================================
         * HEADER - Logo and Title
         * =====================================================================
         */}
                <div className="text-center">
                    {/* Logo */}
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center mb-4">
                        <span className="text-white font-heading font-bold text-2xl">Q</span>
                    </div>

                    {/* Title */}
                    <h2 className="font-heading text-3xl font-bold text-gray-900">
                        Quality Management System
                    </h2>
                </div>

                {/**
         * ===================================================================
         * DEMO LOGIN SECTION
         * ===================================================================
         */}
                <div className="bg-gradient-to-r from-primary-50 to-secondary-50 border-2 border-primary-200 rounded-xl p-6">
                    <div className="text-center mb-4">
                        <p className="font-body text-sm text-gray-700">
                            Explore the platform instantly with one click
                        </p>
                    </div>

                    <Button
                        onClick={handleDemoLogin}
                        variant="primary"
                        size="lg"
                        className="w-full"
                        isLoading={isLoading}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Launching...' : 'Launch Demo'}
                    </Button>

                    <div className="mt-3 text-center">
                        <p className="font-body text-sm text-gray-700">
                            Role: Quality Manager + Shared Demo Environment
                        </p>
                    </div>
                </div>

                {/**
         * ===================================================================
         * DIVIDER
         * ===================================================================
         */}
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-gray-50 text-gray-500 font-body">
                            Or sign in with your account
                        </span>
                    </div>
                </div>

                {/**
         * =====================================================================
         * LOGIN FORM
         * =====================================================================
         * 
         * handleSubmit WRAPPER:
         * - Prevents default form submission (no page reload)
         * - Validates form with Zod schema
         * - Calls onSubmit only if valid
         * - Shows validation errors if invalid
         */}
                <form
                    className="mt-8 space-y-6"
                    onSubmit={handleSubmit(onSubmit)}
                >

                    {/**
           * API ERROR DISPLAY
           * Backend returned error (wrong password, etc.)
           * 
           */}
                    {apiError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="font-body text-sm text-red-700">{apiError}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        {/**
             * EMAIL INPUT
             * 
             * REGISTER FUNCTION:
             * - Connects input to react-hook-form
             * - Tracks value changes
             * - Provides validation props
             * 
             * SPREAD OPERATOR {...register('email')}:
             * Adds these props to input:
             * - name="email"
             * - onChange={...}
             * - onBlur={...}
             * - ref={...}
             * 
             * ERROR DISPLAY:
             * - errors.email?.message shows Zod validation error
             * - "Invalid email address" or "Email is required"
             */}
                        <Input
                            label="Email address"
                            type="email"
                            autoComplete="email"
                            error={errors.email?.message}
                            {...register('email')}
                        />

                        {/**
             * PASSWORD INPUT
             * 
             * AUTOCOMPLETE="current-password":
             * - Tells browser this is for logging in
             * - Browser can autofill saved password
             */}
                        <Input
                            label="Password"
                            type="password"
                            autoComplete="current-password"
                            error={errors.password?.message}
                            {...register('password')}
                        />
                    </div>

                    {/**
           * SUBMIT BUTTON
           * Calls handleSubmit
           */}
                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full"  // Full Width - Looks better on mobile
                        isLoading={isLoading}   // Shows spinner and disables button (prevents double-submit)           
                    >
                        {isLoading ? 'Signing in...' : 'Sign in'}
                    </Button>

                    {/* Register Link */}
                    <div className="text-center">
                        <p className="font-body text-sm text-gray-600">
                            Don't have an account?{' '}
                            <Link
                                href="/register"
                                className="font-medium text-primary-600 hover:text-primary-700"
                            >
                                Create demo account
                            </Link>
                        </p>
                    </div>

                    {/**
                     * FORGOT PASSWORD LINK
                     * 
                     * TODO: Implement password reset flow
                     * For now, just a placeholder
                     */}
                    <div className="text-center">
                        <Link
                            href="/forgot-password"
                            className="font-body text-sm text-primary-600 hover:text-primary-700"
                        >
                            Forgot your password?
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}