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
      <div className="fixed bottom-5 left-0 right-0 z-50 flex justify-center items-center gap-2 pointer-events-none px-8">
        <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full px-2 py-1.5" style={{ background: 'linear-gradient(135deg, rgba(15,20,40,0.88) 0%, rgba(20,30,60,0.85) 100%)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 12px 40px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
          <Skeleton className="w-10 h-10 rounded-full bg-white/[0.08]" />
          <Skeleton className="w-10 h-10 rounded-full bg-white/[0.08]" />
          <Skeleton className="w-10 h-10 rounded-full bg-white/[0.08]" />
        </div>
        <Skeleton className="w-[46px] h-[46px] rounded-full bg-primary/30" />
      </div>
    </div>
  );
}
