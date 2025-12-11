
import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  indicatorClassName?: string;
  segments?: number;
  variant?: 'continuous' | 'segmented';
}

const Progress = React.forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, ProgressProps>(({
  className,
  indicatorClassName,
  value,
  segments,
  variant = 'continuous',
  ...props
}, ref) => {
  // Segmented progress bar
  if (variant === 'segmented' && segments) {
    const currentSegment = Math.ceil((value || 0) / (100 / segments));
    
    return (
      <div className={cn("flex gap-2 w-full", className)} ref={ref}>
        {Array.from({ length: segments }).map((_, index) => (
          <div
            key={index}
            className="h-1.5 flex-1 rounded-full transition-all duration-300"
            style={{
              backgroundColor: index < currentSegment ? '#1d64ff' : '#e5e7eb'
            }}
          />
        ))}
      </div>
    );
  }

  // Continuous progress bar (default)
  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-1 w-full overflow-hidden rounded-full",
        className
      )}
      style={{ backgroundColor: '#00000005' }}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 transition-all",
          indicatorClassName
        )}
        style={{ 
          transform: `translateX(-${100 - (value || 0)}%)`,
          backgroundColor: '#1D64FF'
        }}
      />
    </ProgressPrimitive.Root>
  );
});

Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
