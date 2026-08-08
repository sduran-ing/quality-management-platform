// Import font loaders from Next.js
// Next.js automatically optimizes these fonts
import { Poppins, Open_Sans } from 'next/font/google';
import './globals.css';

// For providing Auth context to the components
import { AuthProvider } from '@/lib/contexts/AuthContext';

import type { Metadata } from 'next';

// Configure Poppins for headings
// We load multiple weights so we can use font-semibold, font-bold, etc.
const poppins = Poppins({
  subsets: ['latin'],  // Character set (Latin = English, Spanish, French, etc.)
  weight: ['400', '500', '600', '700'],  // Regular, Medium, Semibold, Bold
  variable: '--font-poppins',  // CSS variable name
  display: 'swap',  // Show fallback font while loading (better performance)
});

// Configure Open Sans for body text
const openSans = Open_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],  // Regular, Medium, Semibold
  variable: '--font-open-sans',  // CSS variable name
  display: 'swap',
});

// Metadata for SEO (search engines, social media previews)
export const metadata = {
  title: 'Quality Management Platform',
  description: 'ISO 9001 Compliance and Audit Management System',
};

// Root layout wraps ALL pages in the application
// Think of this as the <html> and <body> wrapper
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;  // TypeScript: children can be any React element
}) {
  return (
    <html 
      lang="en" 
      // Apply both font variables to html element
      // This makes them available throughout the app
      className={`${poppins.variable} ${openSans.variable}`}
    >
      <body className="font-body antialiased bg-gray-50">
        {/**
         * AuthProvider wraps entire app
         * 
         * Now ALL components can use useAuth() to access:
         * - user data
         * - login/logout functions
         * - authentication status
         */}
        <AuthProvider>
          {children}  {/* Could be login page, dashboard layout, etc... all the app pages render here */}
        </AuthProvider>
      </body>
    </html>
  );
}