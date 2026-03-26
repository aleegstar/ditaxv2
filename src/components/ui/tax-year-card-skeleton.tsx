import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function TaxYearCardSkeleton() {
  return (
    <div className="bg-gradient-to-br from-white/70 to-white/30 backdrop-blur-2xl backdrop-saturate-200 rounded-[2rem] p-7 md:p-8 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)] border border-white/60">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>

      {/* Year */}
      <Skeleton className="h-10 w-24 mb-3" />

      {/* Description */}
      <Skeleton className="h-4 w-48 mb-5" />

      {/* Progress Steps */}
      <div className="flex gap-1.5 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="flex-1 h-1.5 rounded-full" />
        ))}
      </div>

      {/* Button */}
      <Skeleton className="h-11 w-32 rounded-full" />
    </div>
  );
}
