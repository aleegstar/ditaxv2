import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function UserTaxReturnsSkeleton() {
  return (
    <div className="min-h-screen bg-[#020408] text-zinc-100 antialiased">
      {/* Mobile Container */}
      <div className="overflow-hidden min-h-screen md:max-w-2xl w-full max-w-[430px] mx-auto relative">
        {/* Background Ambient Glow */}
        <div 
          className="absolute top-0 left-0 w-full h-[500px] z-0 pointer-events-none opacity-90" 
          style={{
            background: 'radial-gradient(circle at 50% 60%, rgba(29, 100, 255, 0.22) 0%, rgba(29, 100, 255, 0.05) 50%, transparent 90%)',
            filter: 'blur(60px)'
          }} 
        />

        {/* Header Skeleton */}
        <header className="flex z-20 pt-8 px-8 pb-8 relative items-center justify-between">
          <Skeleton className="h-8 w-24 bg-zinc-800" />
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full bg-zinc-800" />
            <Skeleton className="w-10 h-10 rounded-full bg-zinc-800" />
            <Skeleton className="w-10 h-10 rounded-full bg-zinc-800" />
          </div>
        </header>

        {/* Greeting Skeleton */}
        <div className="px-8 mb-10 flex items-center relative z-20">
          <div className="flex items-center gap-4">
            <Skeleton className="w-14 h-14 rounded-full bg-zinc-800" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-28 bg-zinc-800" />
              <Skeleton className="h-6 w-36 bg-zinc-800" />
            </div>
          </div>
        </div>

        {/* Cards Skeleton */}
        <div className="relative px-4 flex flex-col gap-5 md:px-8 z-20 pb-24">
          {/* Tax Year Card Skeleton */}
          <div 
            className="w-full rounded-[1.5rem] p-6 bg-gradient-to-b from-[#18181b] to-[#050505]"
            style={{
              boxShadow: '0 25px 50px -12px rgba(0,0,0,1)',
              border: '1px solid rgba(255,255,255,0.05)'
            }}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-3">
                <Skeleton className="h-5 w-16 rounded-full bg-zinc-800" />
                <Skeleton className="h-10 w-20 bg-zinc-800" />
              </div>
              <Skeleton className="w-14 h-14 rounded-full bg-zinc-800" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-12 bg-zinc-800" />
                <Skeleton className="h-4 w-24 bg-zinc-800" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-10 bg-zinc-800" />
                <Skeleton className="h-4 w-28 bg-zinc-800" />
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
              <Skeleton className="h-3 w-32 bg-zinc-800" />
              <Skeleton className="w-8 h-8 rounded-full bg-zinc-800" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
