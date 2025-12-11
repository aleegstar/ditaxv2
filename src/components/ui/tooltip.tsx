import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

// Export TooltipProvider as a proper React functional component
const TooltipProvider = ({ children, ...props }: TooltipPrimitive.TooltipProviderProps) => {
  // For mobile, we'll handle delays manually in the InfoToggle component
  return <TooltipPrimitive.Provider {...props}>{children}</TooltipPrimitive.Provider>
}

const Tooltip = TooltipPrimitive.Root

// Improve TooltipTrigger for mobile devices with larger touch targets
const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  const isMobile = useIsMobile();
  
  return (
    <TooltipPrimitive.Trigger
      ref={ref}
      className={cn(
        "cursor-pointer", 
        isMobile ? "min-h-10 min-w-10" : "", // Larger touch target for mobile
        className
      )}
      {...props}
    />
  )
})
TooltipTrigger.displayName = TooltipPrimitive.Trigger.displayName

// Improve TooltipContent with mobile-friendly styling and centered text
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => {
  const isMobile = useIsMobile()
  
  // Larger font size and padding for mobile devices
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "z-[999] overflow-hidden rounded-md border bg-popover px-3 py-1.5 shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          isMobile ? "text-base px-4 py-2.5" : "text-sm",
          "text-center", // Add text-center class for centered text
          className
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  )
})
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
