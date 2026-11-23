import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { REVIEW_RATING_MAX } from '@luvngift/shared';

interface StarsProps {
  /** 0–5, may be fractional (an average); rounded to the nearest half star. */
  value: number;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * A read-only star row. The visual stars are hidden from screen readers and
 * the value is given once in words, so "4.5 out of 5" is read, not ten icons.
 */
export function Stars({ value, className, size = 'sm' }: StarsProps) {
  const rounded = Math.round(value * 2) / 2;
  const icon = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      <span className="sr-only">{`${value} out of ${REVIEW_RATING_MAX} stars`}</span>
      {Array.from({ length: REVIEW_RATING_MAX }).map((_, i) => {
        const fill = rounded - i; // ≥1 full, 0.5 half, ≤0 empty
        return (
          <span key={i} aria-hidden="true" className={cn('relative inline-block', icon)}>
            <Star className={cn(icon, 'absolute inset-0 text-muted-foreground/30')} />
            {fill > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: fill >= 1 ? '100%' : '50%' }}>
                <Star className={cn(icon, 'text-yellow-500 fill-yellow-500')} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
