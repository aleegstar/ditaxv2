
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
      
      {/* Warm sand & linen base – calm natural tone */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, #F2EBDD 0%, #EDE5D3 50%, #E7DFCB 100%)'
        }}
      />
      
      {/* Soft warm sun glow from top-right */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 80% 0%, rgba(220,200,165,0.35) 0%, transparent 60%)'
        }}
      />
      
      {/* Subtle bottom warmth */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 90% 40% at 20% 100%, rgba(210,190,155,0.18) 0%, transparent 60%)'
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
