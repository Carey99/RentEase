/**
 * Modern Theme Toggle Component
 * Instagram-inspired dark mode toggle with animated sun/moon icons
 */

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative flex items-center justify-center",
        "w-14 h-7 rounded-full transition-all duration-300 ease-in-out",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        isDark 
          ? "bg-gradient-to-r from-indigo-600 to-purple-600 focus:ring-purple-500" 
          : "bg-gradient-to-r from-amber-400 to-orange-400 focus:ring-orange-500"
      )}
      aria-label="Toggle theme"
    >
      {/* Sliding circle */}
      <div
        className={cn(
          "absolute w-5 h-5 rounded-full transition-all duration-300 ease-in-out",
          "flex items-center justify-center shadow-lg",
          isDark 
            ? "translate-x-3.5 bg-slate-900" 
            : "-translate-x-3.5 bg-white"
        )}
      >
        {/* Icon with fade animation */}
        <div className="relative w-full h-full flex items-center justify-center">
          <Sun 
            className={cn(
              "absolute w-3 h-3 text-amber-500 transition-all duration-300",
              isDark ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"
            )} 
          />
          <Moon 
            className={cn(
              "absolute w-3 h-3 text-indigo-300 transition-all duration-300",
              isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0"
            )} 
          />
        </div>
      </div>

      {/* Background icons (optional decoration) */}
      <div className="absolute inset-0 flex items-center justify-between px-2">
        <Sun 
          className={cn(
            "w-3 h-3 transition-all duration-300",
            isDark ? "opacity-30 text-white" : "opacity-0 text-amber-600"
          )} 
        />
        <Moon 
          className={cn(
            "w-3 h-3 transition-all duration-300",
            isDark ? "opacity-0 text-indigo-400" : "opacity-30 text-white"
          )} 
        />
      </div>
    </button>
  );
}
