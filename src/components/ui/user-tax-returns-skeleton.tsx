import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import ditaxLogoFull from "@/assets/ditax-logo.svg";

export function UserTaxReturnsSkeleton() {
  return (
    <div className="antialiased min-h-screen pb-28 text-foreground relative overflow-hidden">
      {/* Main Container */}
      <main className="relative z-10 min-h-screen max-w-3xl mx-auto pt-6 px-4 md:px-8">
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

          {/* Add Year Card Skeleton */}
          <div className="bg-gradient-to-br from-white/70 to-white/30 backdrop-blur-2xl backdrop-saturate-200 rounded-[2rem] p-7 md:p-8 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)] border border-white/60 flex items-center justify-center h-32">
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
        </div>
      </main>

      {/* Bottom Navigation Skeleton */}
      <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center items-center gap-3 pointer-events-none">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-[22px] px-2.5 py-2 backdrop-blur-2xl border shadow-[0_-8px_30px_rgba(0,0,0,0.15),0_8px_30px_rgba(0,0,0,0.25)]" style={{ background: 'rgba(15,23,42,0.78)', borderColor: 'rgba(255,255,255,0.1)' }}>
          <Skeleton className="w-10 h-10 rounded-full bg-white/[0.08]" />
          <Skeleton className="w-10 h-10 rounded-full bg-white/[0.08]" />
          <Skeleton className="w-10 h-10 rounded-full bg-white/[0.08]" />
        </div>
        <Skeleton className="w-12 h-12 rounded-full bg-primary/30" />
      </div>
    </div>
  );
}
