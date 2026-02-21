import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  variant?: "card" | "table" | "list" | "player-card" | "stats";
  count?: number;
  className?: string;
}

export function LoadingSkeleton({ variant = "card", count = 1, className }: LoadingSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  switch (variant) {
    case "player-card":
      return (
        <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4", className)}>
          {items.map((i) => (
            <div key={i} className="p-4 rounded-xl glass space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ))}
        </div>
      );

    case "table":
      return (
        <div className={cn("space-y-2", className)}>
          <Skeleton className="h-10 w-full" />
          {items.map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      );

    case "list":
      return (
        <div className={cn("space-y-3", className)}>
          {items.map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      );

    case "stats":
      return (
        <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
          {items.map((i) => (
            <div key={i} className="p-4 rounded-xl glass space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      );

    case "card":
    default:
      return (
        <div className={cn("space-y-4", className)}>
          {items.map((i) => (
            <div key={i} className="p-6 rounded-xl glass space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-8 w-20" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          ))}
        </div>
      );
  }
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="space-y-2 min-w-[600px]">
        {/* Header */}
        <div className="flex gap-4 p-3 bg-muted/50 rounded-lg">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex gap-4 p-3">
            {Array.from({ length: cols }).map((_, colIdx) => (
              <Skeleton key={colIdx} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 rounded-xl glass space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
}
