
import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ModernUploadDialog = DialogPrimitive.Root

const ModernUploadDialogTrigger = DialogPrimitive.Trigger

const ModernUploadDialogPortal = DialogPrimitive.Portal

const ModernUploadDialogClose = DialogPrimitive.Close

const ModernUploadDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
    {...props}
  />
))
ModernUploadDialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const ModernUploadDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  return (
    <ModernUploadDialogPortal>
      <ModernUploadDialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]",
          "w-[90vw] max-w-lg rounded-3xl border-0",
          "p-8 text-foreground",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
          "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
          className
        )}
        style={{
          backgroundColor: 'rgb(244, 244, 244)',
          boxShadow: 'rgba(0, 0, 0, 0.15) 0px 0px 22px -5px'
        }}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-6 top-6 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
          <X className="h-5 w-5" style={{ color: 'rgb(26, 32, 44)' }} />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </ModernUploadDialogPortal>
  )
})
ModernUploadDialogContent.displayName = DialogPrimitive.Content.displayName

const ModernUploadDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
ModernUploadDialogHeader.displayName = "ModernUploadDialogHeader"

const ModernUploadDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6",
      className
    )}
    {...props}
  />
)
ModernUploadDialogFooter.displayName = "ModernUploadDialogFooter"

const ModernUploadDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-xl lg:text-2xl font-semibold", className)}
    style={{ color: 'rgb(26, 32, 44)' }}
    {...props}
  />
))
ModernUploadDialogTitle.displayName = DialogPrimitive.Title.displayName

const ModernUploadDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-base", className)}
    style={{ color: 'rgb(26, 32, 44)', opacity: 0.7 }}
    {...props}
  />
))
ModernUploadDialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  ModernUploadDialog,
  ModernUploadDialogPortal,
  ModernUploadDialogOverlay,
  ModernUploadDialogClose,
  ModernUploadDialogTrigger,
  ModernUploadDialogContent,
  ModernUploadDialogHeader,
  ModernUploadDialogFooter,
  ModernUploadDialogTitle,
  ModernUploadDialogDescription,
}
