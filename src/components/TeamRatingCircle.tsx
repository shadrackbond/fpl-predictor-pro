import { cn } from '@/lib/utils';

interface TeamRatingCircleProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function TeamRatingCircle({ rating, size = 'lg', className }: TeamRatingCircleProps) {
  const sizeClasses = {
    sm: { outer: 'w-20 h-20', text: 'text-xl', label: 'text-xs' },
    md: { outer: 'w-32 h-32', text: 'text-3xl', label: 'text-sm' },
    lg: { outer: 'w-48 h-48', text: 'text-5xl', label: 'text-base' },
  };

  const strokeWidth = size === 'lg' ? 8 : size === 'md' ? 6 : 4;
  const radius = size === 'lg' ? 88 : size === 'md' ? 58 : 36;
  const circumference = 2 * Math.PI * radius;
  const progress = (rating / 100) * circumference;

  const getColor = () => {
    if (rating >= 80) return 'text-green-400';
    if (rating >= 60) return 'text-lime-400';
    if (rating >= 40) return 'text-yellow-400';
    if (rating >= 20) return 'text-orange-400';
    return 'text-red-400';
  };

  const getStrokeColor = () => {
    if (rating >= 80) return 'stroke-green-400';
    if (rating >= 60) return 'stroke-lime-400';
    if (rating >= 40) return 'stroke-yellow-400';
    if (rating >= 20) return 'stroke-orange-400';
    return 'stroke-red-400';
  };

  return (
    <div className={cn('relative flex items-center justify-center', sizeClasses[size].outer, className)}>
      <svg className="absolute -rotate-90 w-full h-full">
        <circle
          cx="50%"
          cy="50%"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx="50%"
          cy="50%"
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          className={cn('rating-circle transition-all duration-1000', getStrokeColor())}
          style={{
            filter: `drop-shadow(0 0 8px currentColor)`,
          }}
        />
      </svg>
      <div className="flex flex-col items-center z-10">
        <span className={cn('font-bold font-mono', sizeClasses[size].text, getColor())}>
          {rating}
        </span>
        <span className={cn('text-muted-foreground', sizeClasses[size].label)}>
          / 100
        </span>
      </div>
    </div>
  );
}
