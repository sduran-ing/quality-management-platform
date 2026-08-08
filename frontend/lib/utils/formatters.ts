/**
 * Formatting utilities for dates, text, and other data
 */

/**
 * Formats a date to readable string
 * 
 * @param date - Date object or ISO string
 * @returns Formatted date like "Jan 21, 2026"
 * 
 * @example
 * formatDate(new Date()) // "Jan 27, 2026"
 * formatDate('2026-01-27') // "Jan 27, 2026"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

/**
 * Formats a date to relative time
 * 
 * @param date - Date object or ISO string
 * @returns Relative time like "2 hours ago" or "3 days ago"
 * 
 * @example
 * formatRelativeTime(new Date(Date.now() - 3600000)) // "1 hour ago"
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  // Calculate difference in seconds
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  
  // Less than a minute
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  // Less than an hour
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  
  // Less than a day
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  
  // Less than a week
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }
  
  // Older - just show the date
  return formatDate(d);
}

/**
 * Truncates text to a maximum length and adds ellipsis
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 * 
 * @example
 * truncate('This is a very long text', 10) // "This is a..."
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Capitalizes the first letter of a string
 * 
 * @param text - Text to capitalize
 * @returns Text with first letter capitalized
 * 
 * @example
 * capitalize('hello world') // "Hello world"
 */
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Gets initials from a full name
 * 
 * @param name - Full name
 * @returns Initials (e.g., "Diana Duran" → "DD")
 * 
 * @example
 * getInitials('Diana Duran') // "DD"
 * getInitials('John Paul Smith') // "JP" (max 2 letters)
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);  // Max 2 letters
}

/**
 * Formats a number as currency
 * 
 * @param amount - Number to format
 * @param currency - Currency code (default: USD)
 * @returns Formatted currency string
 * 
 * @example
 * formatCurrency(1234.56) // "$1,234.56"
 * formatCurrency(1234.56, 'EUR') // "€1,234.56"
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Formats a number with thousand separators
 * 
 * @param num - Number to format
 * @returns Formatted number string
 * 
 * @example
 * formatNumber(1234567) // "1,234,567"
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Format role for display
 * 
 * @param snake_case - Words with this format: process_owner
 * @returns Formatted word
 * 
 * @example
 * formatSnakeCase('process_owner') // "Process Owner"
 * formatSnakeCase('pending_approval') // "Pending Approval"
 */
export function formatSnakeCase(snake_case?: string): string {
  if (!snake_case) return '';

  return snake_case
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
}

/**
 * Format user's full name
 * 
 * @param user - User object with firstName and lastName
 * @returns Formatted full name or "-" if null
 * 
 * @example
 * formatUserName({ firstName: "John", lastName: "Doe" }) // "John Doe"
 * formatUserName(null) // "-"
 */
export function formatUserName(user: { firstName: string; lastName: string } | null | undefined): string {
  if (!user) return '-';
  return `${user.firstName} ${user.lastName}`;
}

// export function formatUserName(user: { first_name: string; last_name: string } | null | undefined): string {
//   if (!user) return '-';
//   return `${user.first_name} ${user.last_name}`;
// }

/**
 * Format bytes number to a readable format
 * 
 * @param bytes - Number of bytes
 * @returns Formatted bytes number B, KB, MB
 * 
 * @example
 * formatFileSize(1024) // "1 KB"
 */
export function formatFileSize(bytes: number): string  {
    if (!bytes || isNaN(bytes)) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };