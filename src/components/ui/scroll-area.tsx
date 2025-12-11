
import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const ScrollArea = React.forwardRef<React.ElementRef<typeof ScrollAreaPrimitive.Root>, React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>>(({
  className,
  children,
  style,
  ...props
}, ref) => {
  const isMobile = useIsMobile();
  
  // Enhanced styles for over-scroll prevention
  const containerStyle: React.CSSProperties = {
    overscrollBehavior: 'contain',
    WebkitOverflowScrolling: 'touch' as any,
    ...style
  };
  
  // Für mobile Geräte verwenden wir CSS overflow anstelle der Scrollbar-Komponente
  return isMobile ? (
    <div 
      ref={ref as React.Ref<HTMLDivElement>} 
      className={cn("relative overflow-auto", className)}
      style={containerStyle}
      {...props}
    >
      <div className="w-full h-full" style={{ overscrollBehavior: 'contain' }}>
        {children}
      </div>
    </div>
  ) : (
    <ScrollAreaPrimitive.Root 
      ref={ref} 
      className={cn("relative overflow-hidden", className)} 
      style={containerStyle}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]" style={{ overscrollBehavior: 'contain' }}>
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
});

ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = React.forwardRef<React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>, React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>>(({
  className,
  orientation = "vertical",
  ...props
}, ref) => <ScrollAreaPrimitive.ScrollAreaScrollbar ref={ref} orientation={orientation} className={cn(
    "flex touch-none select-none transition-colors", 
    orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent p-[1px]", 
    orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent p-[1px]", 
    className
  )} {...props}>
    <ScrollAreaPrimitive.ScrollAreaThumb className={cn(
      "relative rounded-full bg-border", 
      orientation === "vertical" && "flex-1 w-full",
      orientation === "horizontal" && "flex-1 h-full"
    )} />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>);

ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
