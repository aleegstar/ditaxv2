import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function TaxYearCardSkeleton() {
  return (
    <div className="w-full max-w-[320px] mx-auto">
      <div className="relative overflow-hidden rounded-[2.5rem] p-6 bg-muted/60 ring-1 ring-border/30 animate-pulse">
        {/* Three Dots Menu Skeleton */}
        <div className="absolute top-4 right-4">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>

        {/* Top Content */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-shrink-0">
            <Skeleton className="size-16 rounded-full" />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}
