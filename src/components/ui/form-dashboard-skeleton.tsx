import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function FormDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased">
      {/* Mobile Container */}
      <div className="overflow-hidden min-h-screen md:max-w-2xl w-full max-w-[430px] mx-auto relative p-6 md:p-12">
        {/* Mobile Header: Back + Tour Button */}
        <div className="md:hidden flex justify-between mb-4 pt-4">
          <Skeleton className="w-10 h-10 rounded-lg bg-slate-200" />
          <Skeleton className="w-32 h-10 rounded-full bg-slate-200" />
        </div>

        {/* Mobile: Title + Avatar */}
        <div className="md:hidden flex justify-between items-center mb-6">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 bg-slate-200" />
            <Skeleton className="h-4 w-36 bg-slate-200" />
          </div>
          <Skeleton className="w-10 h-10 rounded-full bg-slate-200" />
        </div>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto space-y-6">
          {/* Card 1: Persönliche Angaben */}
          <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-2">
                <Skeleton className="h-3 w-16 rounded bg-slate-200" />
                <Skeleton className="h-6 w-48 bg-slate-200" />
                <Skeleton className="h-4 w-24 bg-slate-200" />
              </div>
              <Skeleton className="w-14 h-14 rounded-full bg-slate-200" />
            </div>
            {/* Grid Options Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-xl p-4 h-24 bg-slate-100 flex flex-col justify-between">
                  <Skeleton className="w-8 h-8 rounded-lg bg-slate-200" />
                  <Skeleton className="h-3 w-20 bg-slate-200" />
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Belege & Unterlagen */}
          <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-slate-200 opacity-60">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <Skeleton className="h-3 w-16 bg-slate-200" />
                <Skeleton className="h-6 w-40 bg-slate-200" />
                <Skeleton className="h-4 w-64 bg-slate-200" />
              </div>
              <Skeleton className="w-12 h-12 rounded-full bg-slate-200" />
            </div>
          </div>

          {/* Card 3: Prüfung & Versand */}
          <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-slate-200 opacity-40">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <Skeleton className="h-3 w-16 bg-slate-200" />
                <Skeleton className="h-6 w-40 bg-slate-200" />
                <Skeleton className="h-4 w-56 bg-slate-200" />
              </div>
              <Skeleton className="w-12 h-12 rounded-full bg-slate-200" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
