import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface PinInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
}

export function PinInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
}: PinInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (error) {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 600);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, '').slice(0, length);
    onChange(input);

    if (input.length === length) {
      onComplete?.(input);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && value.length === 0) {
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pastedData.length > 0) {
      e.preventDefault();
      onChange(pastedData);
      if (pastedData.length === length) {
        onComplete?.(pastedData);
      }
    }
  };

  const pins = Array.from({ length }, (_, i) => value[i] || '');

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        disabled={disabled}
        maxLength={length}
        className="sr-only"
        autoFocus
      />

      <div className={cn(
        'flex gap-3 justify-center transition-all duration-300',
        isShaking && 'animate-shake'
      )}>
        {pins.map((pin, index) => (
          <button
            key={index}
            type="button"
            onClick={() => inputRef.current?.focus()}
            disabled={disabled}
            className={cn(
              'w-12 h-12 rounded-full border-2 flex items-center justify-center text-xl font-semibold transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              value.length > index
                ? 'border-gray-400 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-900 text-gray-400 dark:text-gray-600',
              error && 'border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-950/30',
              index === value.length && !error && 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {pin ? '•' : ''}
          </button>
        ))}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.6s ease-in-out;
        }
      `}</style>
    </div>
  );
}
