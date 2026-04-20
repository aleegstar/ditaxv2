
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
      
      {/* Calm sage & stone base gradient inspired by natural minimalism */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, #F4F1EA 0%, #F1EFE7 25%, #EEEDE5 50%, #EAEBE3 75%, #E6E8DE 100%)'
        }}
      />
      
      {/* Soft sage radial glow at top – simulates ambient natural light */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 90% 45% at 50% 0%, rgba(195,205,180,0.30) 0%, transparent 55%)'
        }}
      />
      
      {/* Very subtle earthy depth at bottom */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, transparent 80%, rgba(80,90,70,0.025) 100%)'
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
