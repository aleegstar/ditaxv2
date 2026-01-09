import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function FormDashboardSkeleton() {
  return (
    <div className="text-slate-900 antialiased min-h-screen p-6 md:p-12 bg-white">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between mb-6 pt-4">
        <Skeleton className="w-10 h-10 rounded-full bg-gray-200" />
        <Skeleton className="h-5 w-40 bg-gray-200" />
        <Skeleton className="h-10 w-10 rounded-full bg-gray-200" />
      </div>

      {/* Desktop Header */}
      <header className="hidden md:flex max-w-4xl mx-auto items-center justify-between mb-8 pt-8">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full bg-gray-200" />
          <Skeleton className="h-6 w-48 bg-gray-200" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full bg-gray-200" />
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto space-y-6 pb-24">
        {/* Step 1: Persönliche Angaben */}
        <section className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-gray-200 overflow-hidden">
          {/* Step Header */}
          <div className="p-6 flex items-center gap-4 border-b border-slate-100">
            <Skeleton className="h-10 w-10 rounded-full bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40 bg-gray-200" />
              <Skeleton className="h-4 w-64 bg-gray-200" />
            </div>
            <div className="w-32 hidden md:block space-y-1">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-16 bg-gray-200" />
                <Skeleton className="h-3 w-8 bg-gray-200" />
              </div>
              <Skeleton className="h-2 w-full rounded-full bg-gray-200" />
            </div>
          </div>

          {/* Action Grid */}
          <div className="p-6 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div 
                  key={i} 
                  className="flex items-center gap-4 p-4 bg-white border border-slate-200/60 rounded-2xl"
                >
                  <Skeleton className="h-12 w-12 shrink-0 rounded-xl bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-28 bg-gray-200" />
                    <Skeleton className="h-4 w-20 bg-gray-200" />
                  </div>
                  <Skeleton className="w-5 h-5 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Step 2: Belege & Unterlagen */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full bg-gray-200 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-36 bg-gray-200" />
            <Skeleton className="h-4 w-32 bg-gray-200" />
          </div>
          <Skeleton className="w-5 h-5 rounded bg-gray-200" />
        </div>

        {/* Step 3: Prüfung & Versand */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full bg-gray-200 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-36 bg-gray-200" />
            <Skeleton className="h-4 w-24 bg-gray-200" />
          </div>
          <Skeleton className="w-5 h-5 rounded bg-gray-200" />
        </div>
      </main>
    </div>
  );
}
