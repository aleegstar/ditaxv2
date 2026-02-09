import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface LiquidBackgroundProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "subtle" | "vibrant";
  animated?: boolean;
}

export const LiquidBackground = ({
  className,
  variant = "default",
  animated = true,
  children,
  ...props
}: LiquidBackgroundProps) => {
  const variantStyles = {
    default: "bg-liquid-gradient",
    subtle: "bg-gradient-to-b from-slate-50 via-blue-50/30 to-violet-50/20",
    vibrant: "bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100"
  };

  return (
    <div
      className={cn(
        "fixed inset-0 min-h-screen w-full overflow-hidden",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {/* Animated gradient orbs for depth */}
      {animated && (
        <>
          <div 
            className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full opacity-30 blur-3xl pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)",
              animation: "float-slow 20s ease-in-out infinite"
            }}
          />
          <div 
            className="absolute bottom-[-10%] left-[-15%] w-[50%] h-[50%] rounded-full opacity-25 blur-3xl pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)",
              animation: "float-slow 25s ease-in-out infinite reverse"
            }}
          />
          <div 
            className="absolute top-[30%] left-[50%] w-[30%] h-[30%] rounded-full opacity-20 blur-2xl pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)",
              animation: "float-slow 18s ease-in-out infinite"
            }}
          />
        </>
      )}
      
      {/* Content layer */}
      <div className="relative z-10 min-h-screen w-full">
        {children}
      </div>
    </div>
  );
};
