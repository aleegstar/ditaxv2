import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
  /** Delay in ms before showing the spinner (default: 2000 for fullScreen, 0 otherwise) */
  delay?: number;
}

export const LoadingSpinner = ({ 
  className, 
  size = "md",
  fullScreen = false,
  delay,
}: LoadingSpinnerProps) => {
  const effectiveDelay = delay ?? (fullScreen ? 2000 : 0);
  const [visible, setVisible] = useState(effectiveDelay === 0);

  useEffect(() => {
    if (effectiveDelay === 0) return;
    const timer = setTimeout(() => setVisible(true), effectiveDelay);
    return () => clearTimeout(timer);
  }, [effectiveDelay]);

  if (!visible) {
    if (fullScreen) {
      return <div className="min-h-screen w-full bg-transparent" />;
    }
    return null;
  }

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12"
  };

  const spinner = (
    <Loader2 
      className={cn(
        "animate-spin text-primary",
        sizeClasses[size],
        className
      )} 
    />
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-transparent">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      {spinner}
    </div>
  );
};
