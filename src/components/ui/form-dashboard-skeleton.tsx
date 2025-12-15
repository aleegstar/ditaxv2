import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function FormDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#020408] flex flex-col text-zinc-100 antialiased">
      {/* Mobile Container */}
      <div className="overflow-hidden min-h-screen md:max-w-2xl w-full max-w-[430px] mx-auto relative">
        {/* Header Skeleton */}
        <header className="flex z-20 p-8 relative items-center justify-between">
          <Skeleton className="w-10 h-10 rounded-full bg-zinc-800" />
          <Skeleton className="w-10 h-10 rounded-full bg-zinc-800" />
        </header>

        {/* Greeting Skeleton */}
        <div className="px-8 mb-8 flex justify-between items-center relative z-20">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 bg-zinc-800" />
            <Skeleton className="h-6 w-40 bg-zinc-800" />
          </div>
          <Skeleton className="w-10 h-10 rounded-full bg-zinc-800" />
        </div>

        {/* Main Content Stream */}
        <div className="flex flex-col md:px-8 px-4 relative items-center">
          {/* Card 1: Angaben Skeleton */}
          <div 
            className="w-full rounded-[1.5rem] p-6 bg-gradient-to-br from-[#18181b] to-[#050505]"
            style={{
              boxShadow: '0 25px 50px -12px rgba(0,0,0,1)',
              border: '1px solid rgba(255,255,255,0.05)'
            }}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-2">
                <Skeleton className="h-3 w-14 bg-zinc-800" />
                <Skeleton className="h-6 w-20 bg-zinc-800" />
                <Skeleton className="h-3 w-24 bg-zinc-800" />
              </div>
              <Skeleton className="w-14 h-14 rounded-full bg-zinc-800" />
            </div>
            {/* Grid Options Skeleton */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-xl p-4 h-28 bg-white/[0.05] flex flex-col justify-between">
                  <Skeleton className="w-5 h-5 rounded bg-zinc-800" />
                  <Skeleton className="h-3 w-16 bg-zinc-800" />
                </div>
              ))}
            </div>
          </div>

          {/* Beam Connection Skeleton */}
          <div className="w-full h-24 flex justify-center items-center">
            <div className="w-[2px] h-full bg-zinc-800/30" />
          </div>

          {/* Card 2: Unterlagen Skeleton */}
          <div 
            className="w-full rounded-[1.5rem] p-6 bg-gradient-to-br from-[#18181b] to-[#050505] opacity-50"
            style={{
              boxShadow: '0 25px 50px -12px rgba(0,0,0,1)',
              border: '1px solid rgba(255,255,255,0.05)'
            }}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="space-y-2">
                <Skeleton className="h-3 w-14 bg-zinc-800" />
                <Skeleton className="h-6 w-24 bg-zinc-800" />
                <Skeleton className="h-3 w-48 bg-zinc-800" />
              </div>
              <Skeleton className="w-8 h-8 rounded-full bg-zinc-800" />
            </div>
          </div>

          {/* Beam Connection Skeleton */}
          <div className="w-full h-24 flex justify-center items-center">
            <div className="w-[2px] h-full bg-zinc-800/30" />
          </div>

          {/* Card 3: Einreichen Skeleton */}
          <div 
            className="w-full rounded-[1.5rem] p-6 bg-gradient-to-br from-[#18181b] to-[#050505] opacity-50"
            style={{
              boxShadow: '0 25px 50px -12px rgba(0,0,0,1)',
              border: '1px solid rgba(255,255,255,0.05)'
            }}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="space-y-2">
                <Skeleton className="h-3 w-14 bg-zinc-800" />
                <Skeleton className="h-6 w-24 bg-zinc-800" />
                <Skeleton className="h-3 w-48 bg-zinc-800" />
              </div>
              <Skeleton className="w-8 h-8 rounded-full bg-zinc-800" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
