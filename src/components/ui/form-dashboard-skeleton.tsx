import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

export function FormDashboardSkeleton() {
  return (
    <div className="text-slate-900 antialiased min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between relative">
          <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300">
            <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
          </div>

          <Skeleton className="h-6 w-44 bg-slate-100" />

          <Skeleton className="w-10 h-10 rounded-full bg-slate-200" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6 pb-24 pt-2">
        {/* Step 1: Persönliche Angaben - Expanded Card */}
        <section className="bg-white rounded-[1.75rem] ring-1 ring-white/60 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          {/* Step Header */}
          <div className="px-6 py-5 flex items-center gap-4 border-b border-slate-100/80">
            <Skeleton className="h-10 w-10 rounded-full bg-slate-100 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20 bg-slate-100" />
              <Skeleton className="h-5 w-40 bg-slate-100" />
            </div>
          </div>

          {/* Action Grid */}
          <div className="px-5 pb-5 pt-4 bg-slate-50/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div 
                  key={i} 
                  className="flex items-center gap-3 p-3 bg-white ring-1 ring-slate-200 rounded-xl"
                >
                  <Skeleton className="h-8 w-8 shrink-0 rounded-full bg-slate-100" />
                  <Skeleton className="h-4 w-28 bg-slate-100 flex-1" />
                  <Skeleton className="w-4 h-4 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Step 2 */}
        <div className="bg-slate-50/40 p-5 px-6 rounded-[1.75rem] ring-1 ring-slate-100/60 flex items-center gap-4 opacity-50">
          <Skeleton className="h-10 w-10 rounded-full bg-slate-100 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-36 bg-slate-100" />
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-slate-50/40 p-5 px-6 rounded-[1.75rem] ring-1 ring-slate-100/60 flex items-center gap-4 opacity-50">
          <Skeleton className="h-10 w-10 rounded-full bg-slate-100 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-36 bg-slate-100" />
          </div>
        </div>
      </main>
    </div>
  );
}
