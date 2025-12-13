/**
 * Responsive breakpoint utilities
 */

export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
} as const;

export type ScreenSize = 'mobile' | 'tablet' | 'desktop';

/**
 * Get the current screen size based on window width
 */
export function getScreenSize(): ScreenSize {
  if (typeof window === 'undefined') return 'desktop';
  
  const width = window.innerWidth;
  if (width < BREAKPOINTS.mobile) return 'mobile';
  if (width < BREAKPOINTS.tablet) return 'tablet';
  return 'desktop';
}

/**
 * Check if current viewport is mobile
 */
export function isMobile(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < BREAKPOINTS.mobile;
}

/**
 * Check if current viewport is tablet
 */
export function isTablet(): boolean {
  return typeof window !== 'undefined' && 
    window.innerWidth >= BREAKPOINTS.mobile && 
    window.innerWidth < BREAKPOINTS.tablet;
}

/**
 * Check if current viewport is desktop
 */
export function isDesktop(): boolean {
  return typeof window !== 'undefined' && window.innerWidth >= BREAKPOINTS.tablet;
}

/**
 * Responsive value selector
 * Returns the appropriate value based on current screen size
 */
export function responsiveValue<T>(values: {
  mobile?: T;
  tablet?: T;
  desktop: T;
}): T {
  const screenSize = getScreenSize();
  
  if (screenSize === 'mobile' && values.mobile !== undefined) {
    return values.mobile;
  }
  
  if (screenSize === 'tablet' && values.tablet !== undefined) {
    return values.tablet;
  }
  
  return values.desktop;
}
