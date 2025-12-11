import React from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";

interface CircularProgressSkeletonProps {
  className?: string;
}

export function CircularProgressSkeleton({ className }: CircularProgressSkeletonProps) {
  const isMobile = useIsMobile();
  
  return (
    <div className={cn(
      isMobile ? "relative size-32" : "relative size-40",
      className
    )}>
      {/* Circular skeleton */}
      <Skeleton className="size-full rounded-full animate-pulse" />
      
      {/* Center content skeleton */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Skeleton className="h-6 w-8" />
      </div>
    </div>
  );
}