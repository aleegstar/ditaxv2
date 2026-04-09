import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import ditaxLogoFull from "@/assets/ditax-logo.svg";

export function UserTaxReturnsSkeleton() {
  return (
    <div className="antialiased min-h-screen pb-28 text-foreground relative overflow-hidden">
      <main className="relative z-10 min-h-screen max-w-3xl mx-auto pt-6 px-6 md:px-8">
        {/* Header */}
        <header className="flex pb-8 items-center justify-between">
          <div className="flex items-center">
            <img src={ditaxLogoFull} alt="ditax" className="h-8" />
          </div>
          <Skeleton className="w-10 h-10 rounded-full" />
        </header>

        {/* Greeting Section */}
        <section className="pb-8">
          <div className="flex flex-col gap-1 mb-4">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-10 w-36" />
          </div>
          <Skeleton className="h-9 w-40 rounded-full mt-2" />
        </section>

        {/* Cards */}
        <div className="flex flex-col gap-5">
          {/* Active Tax Year Card Skeleton */}
          <div 
            className="rounded-[2rem] p-7 md:p-8 overflow-hidden relative"
            style={{
              background: '#ffffff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)',
              border: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>

            {/* Year */}
            <Skeleton className="h-10 w-24 mb-3" />

            {/* Description */}
            <Skeleton className="h-4 w-48 mb-5" />

            {/* Progress Steps */}
            <div className="flex gap-1.5 mb-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="flex-1 h-[3px] rounded-full" />
              ))}
            </div>

            {/* Button */}
            <Skeleton className="h-11 w-32 rounded-full" />
          </div>

          {/* Add Year Card Skeleton */}
          <div 
            className="rounded-[2rem] p-7 md:p-8 flex items-center justify-center h-32"
            style={{
              background: '#ffffff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)',
              border: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
        </div>
      </main>

      {/* Bottom Navigation Skeleton */}
      <div className="fixed inset-x-0 bottom-5 z-50 flex items-center justify-center px-6 pointer-events-none md:hidden">
        <div
          className="inline-flex items-center gap-2 rounded-[22px] px-1.5 py-1.5"
          style={{
            background: 'rgba(255, 255, 255, 0.78)',
            border: '1px solid rgba(255, 255, 255, 0.65)',
            boxShadow: '0 2px 20px rgba(0,0,0,0.06), 0 0.5px 1px rgba(0,0,0,0.04)',
            backdropFilter: 'blur(24px) saturate(180%)',
          }}
        >
          <Skeleton className="h-11 w-11 rounded-[16px] bg-black/5" />
          <Skeleton className="h-11 w-11 rounded-[16px] bg-black/5" />
          <Skeleton className="h-11 w-11 rounded-[16px] bg-black/5" />
          <Skeleton className="h-11 w-11 rounded-[16px] bg-black/5" />
        </div>
      </div>
    </div>
  );
}
