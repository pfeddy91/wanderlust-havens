/**
 * Utility functions for formatting text and data
 */

/**
 * Format country name to title case
 * @param name - The country name to format
 * @returns Formatted country name in title case
 */
export const formatCountryName = (name: string): string => {
  if (!name) return '';
  
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Format currency amount
 * @param amount - The amount to format
 * @param currency - The currency code (default: 'GBP')
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, currency: string = 'GBP'): string => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format duration in days to readable text
 * @param days - Number of days
 * @returns Formatted duration string
 */
export const formatDuration = (days: number): string => {
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  
  const weeks = Math.floor(days / 7);
  const remainingDays = days % 7;
  
  if (weeks === 1 && remainingDays === 0) return '1 week';
  if (weeks > 1 && remainingDays === 0) return `${weeks} weeks`;
  if (weeks === 1) return `1 week ${remainingDays} day${remainingDays > 1 ? 's' : ''}`;
  
  return `${weeks} weeks ${remainingDays} day${remainingDays > 1 ? 's' : ''}`;
};

/**
 * Truncate text to specified length with ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

/**
 * Format date to readable string
 * @param date - Date to format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export const formatDate = (
  date: Date | string, 
  options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-GB', options).format(dateObj);
}; 