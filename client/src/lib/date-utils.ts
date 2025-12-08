/**
 * Date formatting utilities
 * Centralized date formatting for consistent display
 */

/**
 * Format date as "MMM D" (e.g., "Jan 15")
 * @param date - Date to format
 * @returns Formatted string
 */
export function formatDueDate(date: Date | string): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format date as full date string (e.g., "Jan 15, 2025")
 * @param date - Date to format
 * @returns Formatted string
 */
export function formatFullDate(date: Date | string): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format date as month name only (e.g., "January")
 * @param date - Date to format
 * @returns Formatted string
 */
export function formatMonthName(date: Date | string): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { month: 'long' });
  } catch {
    return 'Invalid date';
  }
}
