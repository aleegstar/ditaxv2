"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const AppDialog = DialogPrimitive.Root;
const AppDialogTrigger = DialogPrimitive.Trigger;
const AppDialogPortal = DialogPrimitive.Portal;
const AppDialogClose = DialogPrimitive.Close;

const AppDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
AppDialogOverlay.displayName = "AppDialogOverlay";

type DialogSize = "sm" | "default" | "lg" | "xl";

const sizeClasses: Record<DialogSize, string> = {
  sm: "max-w-sm",
  default: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-4xl",
};

interface AppDialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  size?: DialogSize;
  hideCloseButton?: boolean;
}

const AppDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  AppDialogContentProps
>(({ className, children, size = "default", hideCloseButton = false, ...props }, ref) => (
  <AppDialogPortal>
    <AppDialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]",
        "w-[92vw] rounded-2xl border border-border/40 bg-background p-6",
        "shadow-[0_8px_40px_-12px_hsl(var(--foreground)/0.12)]",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
        "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
      {!hideCloseButton && (
        <DialogPrimitive.Close
          className="absolute right-4 top-4 w-10 h-10 min-w-[44px] min-h-[44px] rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Schließen"
        >
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </AppDialogPortal>
));
AppDialogContent.displayName = "AppDialogContent";

const AppDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left mb-5", className)}
    {...props}
  />
);
AppDialogHeader.displayName = "AppDialogHeader";

const AppDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3 mt-6",
      className
    )}
    {...props}
  />
);
AppDialogFooter.displayName = "AppDialogFooter";

const AppDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold tracking-tight text-foreground",
      className
    )}
    {...props}
  />
));
AppDialogTitle.displayName = "AppDialogTitle";

const AppDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
AppDialogDescription.displayName = "AppDialogDescription";

export {
  AppDialog,
  AppDialogPortal,
  AppDialogOverlay,
  AppDialogTrigger,
  AppDialogClose,
  AppDialogContent,
  AppDialogHeader,
  AppDialogFooter,
  AppDialogTitle,
  AppDialogDescription,
};
