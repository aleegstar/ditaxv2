
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
      
      {/* Warm peach/salmon base gradient – iOS onboarding style */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, #F2E0DA 0%, #F0DDD8 15%, #F0E4E0 30%, #F1ECEA 50%, #F0EFEF 70%, #EDEDF0 100%)'
        }}
      />
      
      {/* Warm radial glow at top center – peach/orange ambient light */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 100% 55% at 50% -5%, rgba(230,180,160,0.3) 0%, transparent 60%)'
        }}
      />
      
      {/* Very subtle cool depth at bottom */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, transparent 82%, rgba(0,0,0,0.015) 100%)'
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
