'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { REVIEW_RATING_MAX } from '@luvngift/shared';

const WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

interface StarInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

/**
 * Choosing a rating. A radio group underneath, so it works with the keyboard
 * (arrow keys move between stars) and is announced as "4 stars, Very good".
 */
export function StarInput({ value, onChange, disabled }: StarInputProps) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="space-y-1">
      <div role="radiogroup" aria-label="Your rating" className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {Array.from({ length: REVIEW_RATING_MAX }, (_, i) => i + 1).map((n) => (
          <label key={n} className={cn('cursor-pointer', disabled && 'cursor-not-allowed opacity-60')} onMouseEnter={() => setHover(n)}>
            <input
              type="radio"
              name="rating"
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              disabled={disabled}
              className="peer sr-only"
              aria-label={`${n} star${n > 1 ? 's' : ''}, ${WORDS[n]}`}
            />
            <Star
              aria-hidden="true"
              className={cn(
                'h-8 w-8 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring rounded-sm',
                n <= shown ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/40',
              )}
            />
          </label>
        ))}
      </div>
      <p className="text-sm text-muted-foreground h-5" aria-live="polite">{WORDS[shown]}</p>
    </div>
  );
}
