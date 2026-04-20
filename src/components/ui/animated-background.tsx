
"use client";

import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { GooeyFilter } from "./liquid-toggle";

interface AnimatedBackgroundProps {
  children: React.ReactNode;
  className?: string;
  showBackgroundImage?: boolean;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  children,
  className = ""
}) => {
  const isMobile = useIsMobile();

  return (
    <div className={`relative min-h-screen ${className}`}>
      <GooeyFilter />
      
      {/* Global solid warm cream background */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: '#F3EFEA'
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
