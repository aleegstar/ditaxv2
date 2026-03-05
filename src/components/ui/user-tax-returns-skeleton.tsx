import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import ditaxLogoFull from "@/assets/ditax-logo.svg";

export function UserTaxReturnsSkeleton() {
  return (
    <div className="antialiased min-h-screen pb-28 text-foreground bg-background">
      {/* Main Container */}
      <main className="min-h-screen sm:px-6 lg:px-8 max-w-7xl mx-auto pt-6 px-4 relative">
        {/* Header */}
        <header className="flex pb-8 items-center justify-between">
          <div className="flex items-center">
            <img src={ditaxLogoFull} alt="ditax" className="h-8" />
          </div>
          <Skeleton className="w-10 h-10 rounded-full" />
        </header>

        {/* Greeting Section */}
        <section className="pb-10">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
        </section>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          {/* Active Tax Year Card Skeleton */}
          <article className="relative flex flex-col p-3 bg-background rounded-[2.5rem] shadow-sm ring-1 ring-border/40">
            <div className="relative h-64 w-full rounded-[2rem] overflow-hidden bg-primary/10 flex items-center justify-center">
              <Skeleton className="h-12 w-24" />
              <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                <Skeleton className="w-2 h-2 rounded-full" />
                <Skeleton className="h-3 w-10" />
              </div>
            </div>

            <div className="flex flex-col pt-6 pr-2 pb-0 pl-2">
              <Skeleton className="h-7 w-40 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-3/4" />

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-4 h-4 rounded" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-4 h-4 rounded" />
                    <Skeleton className="h-4 w-4" />
                  </div>
                </div>
                <Skeleton className="h-10 w-24 rounded-full" />
              </div>
            </div>
          </article>

          {/* Completed Tax Year Card Skeleton */}
          <article className="relative flex flex-col p-3 bg-background rounded-[2.5rem] shadow-sm ring-1 ring-border/40">
            <div className="relative h-64 w-full rounded-[2rem] overflow-hidden bg-muted/50 flex items-center justify-center">
              <Skeleton className="h-20 w-28" />
              <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                <Skeleton className="w-3.5 h-3.5 rounded-full" />
                <Skeleton className="h-3 w-10" />
              </div>
            </div>

            <div className="px-2 pt-6 pb-0 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-2/3" />

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-4 h-4 rounded" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-10 w-24 rounded-full" />
              </div>
            </div>
          </article>

          {/* Add Year Card Skeleton */}
          <article className="flex flex-col items-center justify-center p-3 bg-background rounded-[2.5rem] shadow-sm ring-1 ring-border/40 h-[420px]">
            <Skeleton className="h-16 w-16 rounded-full" />
          </article>
        </div>
      </main>

      {/* Bottom Navigation Skeleton */}
      <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div className="pointer-events-auto flex items-center p-1.5 gap-2 bg-background/90 backdrop-blur-xl border border-border/40 rounded-full shadow-lg">
          <div className="flex items-center gap-3 pl-2.5 pr-5 py-2 rounded-full bg-muted/60">
            <Skeleton className="w-9 h-9 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-2 w-12" />
            </div>
          </div>

          <div className="w-px h-8 bg-border/40"></div>

          <Skeleton className="w-12 h-12 rounded-full" />
          <Skeleton className="w-12 h-12 rounded-full" />
        </div>
      </div>
    </div>
  );
}
