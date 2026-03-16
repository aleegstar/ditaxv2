import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft } from "lucide-react";

export function FormDashboardSkeleton() {
  return (
    <div className="antialiased min-h-screen">
      {/* Header - matches SubpageHeader */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <div className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-muted-foreground shrink-0 -ml-2 bg-muted/60 border border-border/50">
            <ChevronLeft className="w-[18px] h-[18px]" strokeWidth={1.5} />
          </div>
          <div className="flex-1 flex justify-center">
            <Skeleton className="h-5 w-44" />
          </div>
          <div className="w-10 h-10" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 space-y-4 pb-24 pt-4">
        {/* Step 1: Expanded Card */}
        <section className="bg-background rounded-2xl ring-1 ring-border/40 overflow-hidden shadow-sm">
          <div className="px-5 py-4 flex items-center gap-4 border-b border-border/30">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>

          <div className="px-4 pb-4 pt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 bg-muted/30 ring-1 ring-border/30 rounded-xl"
                >
                  <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                  <Skeleton className="h-4 w-28 flex-1" />
                  <Skeleton className="w-4 h-4 rounded" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Step 2 */}
        <div className="bg-muted/30 p-5 px-6 rounded-2xl ring-1 ring-border/30 flex items-center gap-4 opacity-50">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <Skeleton className="h-4 w-36" />
        </div>

        {/* Step 3 */}
        <div className="bg-muted/30 p-5 px-6 rounded-2xl ring-1 ring-border/30 flex items-center gap-4 opacity-50">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <Skeleton className="h-4 w-36" />
        </div>
      </main>
    </div>
  );
}
