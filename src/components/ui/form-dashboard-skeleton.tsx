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
        <section className="bg-gradient-to-b from-white to-slate-50/80 rounded-[2.5rem] ring-1 ring-slate-200/60 overflow-hidden shadow-[0_4px_14px_0_rgba(100,116,139,0.12),0_20px_40px_-12px_rgba(0,0,0,0.06)]">
          {/* Step Header */}
          <div className="p-6 flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full bg-slate-100 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40 bg-slate-100" />
              <Skeleton className="h-6 w-20 rounded-full bg-slate-100" />
            </div>
            <div className="w-32 hidden md:block space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-16 bg-slate-100" />
                <Skeleton className="h-3 w-8 bg-slate-100" />
              </div>
              <Skeleton className="h-2 w-full rounded-full bg-slate-100" />
            </div>
          </div>

          {/* Action Grid */}
          <div className="p-6 pt-0 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div 
                  key={i} 
                  className="flex items-center gap-4 p-4 bg-gradient-to-b from-white to-slate-50/50 ring-1 ring-slate-200/60 rounded-full shadow-[0_2px_8px_rgba(100,116,139,0.08)]"
                >
                  <Skeleton className="h-10 w-10 shrink-0 rounded-full bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-28 bg-slate-100" />
                    <Skeleton className="h-3 w-20 bg-slate-100" />
                  </div>
                  <Skeleton className="w-5 h-5 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Step 2: Belege & Unterlagen */}
        <div className="bg-gradient-to-b from-white to-slate-50/80 p-6 rounded-[2.5rem] ring-1 ring-slate-200/60 flex items-center gap-4 shadow-[0_4px_14px_0_rgba(100,116,139,0.12),0_20px_40px_-12px_rgba(0,0,0,0.06)] opacity-50">
          <Skeleton className="h-10 w-10 rounded-full bg-slate-100 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-36 bg-slate-100" />
            <Skeleton className="h-6 w-16 rounded-full bg-slate-100" />
          </div>
        </div>

        {/* Step 3: Prüfung & Versand */}
        <div className="bg-gradient-to-b from-white to-slate-50/80 p-6 rounded-[2.5rem] ring-1 ring-slate-200/60 flex items-center gap-4 shadow-[0_4px_14px_0_rgba(100,116,139,0.12),0_20px_40px_-12px_rgba(0,0,0,0.06)] opacity-50">
          <Skeleton className="h-10 w-10 rounded-full bg-slate-100 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-36 bg-slate-100" />
            <Skeleton className="h-6 w-16 rounded-full bg-slate-100" />
          </div>
        </div>
      </main>
    </div>
  );
}
