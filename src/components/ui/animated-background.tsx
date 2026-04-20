
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
      
      {/* Warm cream/sand base – matches calm wellness aesthetic */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, #F2EDE2 0%, #EDE6D6 50%, #E8E0CC 100%)'
        }}
      />
      
      {/* Soft warm sand glow from top-right */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 80% 0%, rgba(217, 201, 168, 0.35) 0%, transparent 60%)'
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
