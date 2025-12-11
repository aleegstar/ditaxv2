import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function TaxYearCardSkeleton() {
  return (
    <div className="w-full max-w-[320px] mx-auto">
      <div 
        className="relative overflow-hidden rounded-[24px] p-6 shadow-[0_8px_32px_rgba(79,125,243,0.3)] animate-pulse" 
        style={{
          background: 'linear-gradient(to bottom right, #e2e8f0, #cbd5e1)'
        }}
      >
        {/* Three Dots Menu Skeleton - Top Right */}
        <div className="absolute top-4 right-4">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>

        {/* Top Content - Horizontal Layout */}
        <div className="flex items-center gap-4 mb-6">
          {/* Progress Circle Skeleton */}
          <div className="flex-shrink-0 relative">
            <Skeleton className="size-16 rounded-full" />
          </div>

          {/* Text Content Skeleton */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Year Skeleton */}
            <Skeleton className="h-5 w-16" />
            {/* Status Skeleton */}
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}