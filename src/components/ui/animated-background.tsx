
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
      
      {/* Warm rose-tinted base gradient inspired by iOS onboarding */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, #F5EFED 0%, #F3F0EE 25%, #F1F0F0 50%, #EEEDF0 75%, #EBEBEE 100%)'
        }}
      />
      
      {/* Soft warm radial glow at top – simulates ambient rose light */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 90% 45% at 50% 0%, rgba(235,210,205,0.35) 0%, transparent 55%)'
        }}
      />
      
      {/* Very subtle depth at bottom */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, transparent 80%, rgba(0,0,0,0.015) 100%)'
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
