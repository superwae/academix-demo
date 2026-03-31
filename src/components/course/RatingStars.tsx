import { Star } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useState } from 'react';

interface RatingStarsProps {
  value: number;
  onChange?: (rating: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function RatingStars({ value, onChange, disabled, size = 'sm' }: RatingStarsProps) {
  const [hover, setHover] = useState(0);
  const display = hover || value;
  const dim = size === 'md' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <div className="flex gap-0.5 items-center" role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          className={cn(
            'p-0.5 rounded transition-transform',
            !disabled && 'cursor-pointer hover:scale-110',
            disabled && 'opacity-60 cursor-default',
          )}
          onMouseEnter={() => !disabled && setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => !disabled && onChange?.(n)}
        >
          <Star
            className={cn(
              dim,
              n <= display ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/35',
            )}
          />
        </button>
      ))}
    </div>
  );
}
