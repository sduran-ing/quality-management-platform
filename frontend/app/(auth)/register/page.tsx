'use client';

/**
 * =============================================================================
 * REGISTER PAGE - DEMO ACCOUNT CREATION
 * =============================================================================
 * 
 * Creates a new demo user in the shared QMS Demo Company.
 * 
 * - No company name field (all users join demo company)
 * - All users get "process_owner" role
 * - Shared environment (users can see each other's work)
 * 
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { registerUser } from '@/lib/api/auth';
import { useAuth } from '@/lib/contexts/AuthContext';  // Import useAuth to access and use context
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

/**
 * =============================================================================
 * FORM VALIDATION SCHEMA
 * =============================================================================
 */

const registerSchema = z.object({
    // First Name
    firstName: z
        .string()
        .min(1, { message: 'First name is required' })  // Required
        .min(2, { message: 'First name must be at least 2 characters' })  // Minimum 2 characters
        .regex(/^[a-zA-Z\s]+$/, { message: 'First name can only contain letters' }),  // Only letters and spaces

    // Last Name
    lastName: z
        .string()
        .min(1, { message: 'Last name is required' })  // Required
        .min(2, { message: 'Last name must be at least 2 characters' })  // Minimum 2 characters
        .regex(/^[a-zA-Z\s]+$/, { message: 'Last name can only contain letters' }),  // Only letters and spaces

    // Email field validation
    email: z.email({ message: 'Please enter a valid email address' }),

    /**
     * Password
     *
     * - Minimum 6 characters
     * - Must contain at least one uppercase letter
     * - Must contain at least one number
     * - Must contain at least one special character
     */
    password: z
        .string()
        .min(6, { message: 'Password must be at least 6 characters' })
        .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
        .regex(/[0-9]/, { message: 'Password must contain at least one number' })
        .regex(/[^A-Za-z0-9]/, { message: 'Password must contain at least one special character' }),

    /**
     * Confirm Password
     * 
     * MUST MATCH: password field
     * 
     * Zod's .refine() Method is for custom logic: "password === confirmPassword"
     */
    confirmPassword: z
        .string()
        .min(1, { message: 'Please confirm your password' }),

}).refine((data) => data.password === data.confirmPassword, {
    /**
     * CUSTOM VALIDATION: Password Match
     * 
     * This runs AFTER all field validations pass.
     * Checks if password and confirmPassword match.
     * 
     * If they don't match:
     * - Error shows on confirmPassword field
     * - User sees "Passwords do not match"
     */
    message: 'Passwords do not match',
    path: ['confirmPassword'], // Show error on confirmPassword field
});

// TypeScript type inferred from schema
type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * =============================================================================
 * REGISTER PAGE COMPONENT
 * =============================================================================
 */

export default function RegisterPage() {
    const router = useRouter();

    const { login } = useAuth();  // Get login function from context

    // API error state (backend errors)
    const [apiError, setApiError] = useState<string | null>(null);

    // Loading state (disable form during submission)
    const [isLoading, setIsLoading] = useState(false);

    /**
     * React Hook Form setup
     */
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
    });

    // Form submission handler
    const onSubmit = async (data: RegisterFormData) => {
        try {
            // Clear previous errors
            setApiError(null);
            setIsLoading(true);

            /**
             * Call register API
             * Backend automatically assigns to "QMS Demo Company"
             * and sets role to "process_owner"
             */
            const response = await registerUser({
                email: data.email,
                password: data.password,
                firstName: data.firstName,
                lastName: data.lastName,
            });

            // Update auth context with user data and token
            login(response);  // Update context

            // Redirect to dashboard
            router.push('/');

        } catch (error: any) {
            console.error('Registration error:', error);

            // In case of any error, set the error to show it to the user
            setApiError(
                error.message || 'An error occurred during registration. Please try again.'
            );

        } finally {
            // Always stop loading
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                {/**
         * =====================================================================
         * HEADER
         * =====================================================================
         */}
                <div className="text-center">
                    {/* Logo */}
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center mb-4">
                        <span className="text-white font-heading font-bold text-2xl">Q</span>
                    </div>

                    {/* Title */}
                    <h2 className="font-heading text-3xl font-bold text-gray-900">
                        Create Demo Account
                    </h2>
                    <p className="mt-2 font-body text-base text-gray-600">
                        Already have an account?{' '}
                        <Link
                            href="/login"
                            className="font-medium text-primary-600 hover:text-primary-700"
                        >
                            Sign in
                        </Link>
                    </p>
                </div>

                {/**
         * =====================================================================
         * DEMO ENVIRONMENT DISCLAIMER
         * =====================================================================
         * 
         * IMPORTANT: Let users know this is a shared demo
         * - Transparency about shared data
         * - Sets expectations
         * - Encourages appropriate use
         */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                            <span className="text-2xl">ℹ️</span>
                        </div>
                        <div>
                            <h3 className="font-heading text-base font-semibold text-blue-900 mb-1">
                                Demo Environment
                            </h3>
                            <p className="font-body text-base text-blue-800 leading-relaxed">
                                You'll join the <strong>QMS Demo Company</strong> as a <strong>Quality Manager</strong>.
                                This is a shared environment where all demo users can view and interact with the same data.
                                Perfect for exploring features!
                            </p>
                        </div>
                    </div>
                </div>

                {/**
         * =====================================================================
         * REGISTRATION FORM
         * =====================================================================
         */}
                <form
                    className="space-y-6"
                    onSubmit={handleSubmit(onSubmit)}

                >
                    {/**
           * API ERROR DISPLAY
           * 
           * Shows backend errors:
           * - Email already registered
           * - Server errors
           */}
                    {apiError && (
                        <div
                            className="bg-red-50 border border-red-200 rounded-lg p-4"
                            role="alert"
                        >
                            <p className="font-body text-sm text-red-700">{apiError}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        {/**
             * FIRST NAME INPUT
             */}
                        <Input
                            label="First Name"
                            type="text"
                            autoComplete="given-name"                            
                            error={errors.firstName?.message}
                            disabled={isLoading}
                            {...register('firstName')}
                        />

                        {/**
             * LAST NAME INPUT
             */}
                        <Input
                            label="Last Name"
                            type="text"
                            autoComplete="family-name"
                            error={errors.lastName?.message}
                            disabled={isLoading}
                            {...register('lastName')}
                        />

                        {/**
             * EMAIL INPUT
             */}
                        <Input
                            label="Email Address"
                            type="email"
                            autoComplete="email"
                            placeholder="@example.com"
                            error={errors.email?.message}
                            disabled={isLoading}
                            {...register('email')}
                        />

                        {/**
             * PASSWORD INPUT
             * 
             * autocomplete="new-password":
             * - Tells browser this is for creating new password
             * - Different from "current-password" (for login)
             * - Browser can suggest strong passwords
             */}
                        <Input
                            label="Password"
                            type="password"
                            autoComplete="new-password"
                            error={errors.password?.message}
                            disabled={isLoading}
                            {...register('password')}
                        />

                        {/**
             * CONFIRM PASSWORD INPUT
             */}
                        <Input
                            label="Confirm Password"
                            type="password"
                            autoComplete="new-password"
                            placeholder="Re-enter your password"
                            error={errors.confirmPassword?.message}
                            disabled={isLoading}
                            {...register('confirmPassword')}
                        />
                    </div>

                    {/**
           * PASSWORD REQUIREMENTS HINT
           * 
           * HELPS USER CREATE VALID PASSWORD:
           * - Shows requirements upfront
           * - Reduces validation errors
           * - Better UX
           */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <p className="font-body text-xs text-gray-600 font-medium mb-1">
                            Password Requirements:
                        </p>
                        <ul className="font-body text-xs text-gray-600 space-y-0.5 list-disc list-inside">
                            <li>At least 6 characters long</li>
                            <li>One uppercase letter (A-Z)</li>
                            <li>One number (0-9)</li>
                            <li>One special character (!@#$%^&*)</li>
                        </ul>
                    </div>

                    {/**
           * SUBMIT BUTTON
           */}
                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full"
                        isLoading={isLoading}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Creating Account...' : 'Create Demo Account'}
                    </Button>

                    {/**
           * BACK TO LOGIN LINK
           */}
                    <div className="text-center">
                        <Link
                            href="/login"
                            className="font-body text-sm text-gray-600 hover:text-gray-900"
                        >
                            Back to login
                        </Link>
                    </div>
                </form>

                {/**
         * =====================================================================
         * FOOTER - QUICK DEMO OPTION
         * =====================================================================
         */}
                <div className="border-t border-gray-200 pt-6">
                    <div className="text-center">
                        <p className="font-body text-sm text-gray-600 mb-3">
                            Want to skip registration?
                        </p>
                        <Link href="/login">
                            <Button
                                type="button"
                                variant="secondary"
                                size="md"
                                className="w-full"
                            >
                                Try Demo Login Instead
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}