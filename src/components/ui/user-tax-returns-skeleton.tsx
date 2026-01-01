import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function UserTaxReturnsSkeleton() {
  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">
      {/* Mobile Container */}
      <div className="overflow-hidden min-h-screen md:max-w-2xl w-full max-w-[430px] mx-auto relative">
        {/* Header Skeleton */}
        <header className="flex pt-6 px-4 pb-8 items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl bg-gray-200" />
            <Skeleton className="h-6 w-16 bg-gray-200" />
          </div>
          <Skeleton className="w-10 h-10 rounded-full bg-gray-200" />
        </header>

        {/* Greeting Skeleton */}
        <section className="px-4 pb-10 flex items-end justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 bg-gray-200" />
            <Skeleton className="h-10 w-36 bg-gray-200" />
          </div>
          <Skeleton className="w-12 h-12 rounded-full bg-gray-200" />
        </section>

        {/* Cards Skeleton */}
        <div className="grid grid-cols-1 gap-6 px-4 pb-24">
          {/* Active Tax Year Card Skeleton */}
          <div className="p-3 bg-white rounded-[2.5rem] ring-1 ring-gray-200/80 shadow-lg">
            <Skeleton className="h-64 w-full rounded-[2rem] bg-gray-200" />
            <div className="pt-6 px-2 space-y-3">
              <Skeleton className="h-6 w-40 bg-gray-200" />
              <Skeleton className="h-4 w-full bg-gray-200" />
              <div className="flex justify-between items-center mt-4">
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-12 bg-gray-200" />
                  <Skeleton className="h-4 w-8 bg-gray-200" />
                </div>
                <Skeleton className="h-10 w-24 rounded-full bg-gray-200" />
              </div>
            </div>
          </div>

          {/* Completed Tax Year Card Skeleton */}
          <div className="p-3 bg-white rounded-[2.5rem] ring-1 ring-gray-200/80 shadow-md">
            <div className="flex items-center gap-4 p-4">
              <Skeleton className="w-16 h-16 rounded-2xl bg-gray-200" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-24 bg-gray-200" />
                <Skeleton className="h-4 w-16 bg-gray-200" />
              </div>
              <Skeleton className="w-8 h-8 rounded-full bg-gray-200" />
            </div>
          </div>

          {/* Add New Year Card Skeleton */}
          <div className="p-6 bg-white rounded-[2.5rem] ring-1 ring-gray-200/80 shadow-sm flex items-center justify-center">
            <Skeleton className="h-12 w-12 rounded-full bg-gray-200" />
          </div>
        </div>

        {/* Bottom Navigation Skeleton */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-4">
          <div className="max-w-[430px] mx-auto flex justify-around">
            <Skeleton className="w-12 h-12 rounded-full bg-gray-200" />
            <Skeleton className="w-12 h-12 rounded-full bg-gray-200" />
            <Skeleton className="w-12 h-12 rounded-full bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
