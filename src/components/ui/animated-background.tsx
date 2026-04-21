
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
      
      {/* Light blue base */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ background: '#EAEFF5' }}
      />

      {/* Soft white/blue blur glows */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-white/40 rounded-full blur-[100px]" />
        <div className="absolute bottom-[20%] right-[-10%] w-[60%] h-[60%] bg-[#dce5f2]/60 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] left-[30%] w-[40%] h-[40%] bg-white/30 rounded-full blur-[80px]" />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
