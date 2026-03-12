"use client";

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const AppAlertDialog = AlertDialogPrimitive.Root;
const AppAlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AppAlertDialogPortal = AlertDialogPrimitive.Portal;

const AppAlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
));
AppAlertDialogOverlay.displayName = "AppAlertDialogOverlay";

interface AppAlertDialogContentProps
  extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content> {
  showCloseButton?: boolean;
  onClose?: () => void;
}

const AppAlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  AppAlertDialogContentProps
>(({ className, children, showCloseButton = true, onClose, ...props }, ref) => (
  <AppAlertDialogPortal>
    <AppAlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]",
        "w-[92vw] max-w-md rounded-2xl border border-border/40 bg-background",
        "p-6 pt-10",
        "shadow-[0_8px_40px_-12px_hsl(var(--foreground)/0.12)]",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
        "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
        className
      )}
      {...props}
    >
      {showCloseButton && (
        <AlertDialogPrimitive.Cancel
          className="absolute right-4 top-4 w-10 h-10 min-w-[44px] min-h-[44px] rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 touch-manipulation"
          onClick={onClose}
          aria-label="Schließen"
        >
          <X className="h-4 w-4" />
        </AlertDialogPrimitive.Cancel>
      )}
      {children}
    </AlertDialogPrimitive.Content>
  </AppAlertDialogPortal>
));
AppAlertDialogContent.displayName = "AppAlertDialogContent";

/* Icon container for centered icon pattern */
type IconVariant = "delete" | "warning" | "info" | "success" | "question";

interface AppAlertDialogIconProps {
  variant?: IconVariant;
  children: React.ReactNode;
  className?: string;
}

const iconVariantStyles: Record<IconVariant, string> = {
  delete: "bg-destructive/10",
  warning: "bg-orange-500/10",
  info: "bg-primary/10",
  success: "bg-[hsl(var(--success))]/10",
  question: "bg-primary/10",
};

const AppAlertDialogIcon: React.FC<AppAlertDialogIconProps> = ({
  variant = "info",
  children,
  className,
}) => (
  <div
    className={cn(
      "w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5",
      iconVariantStyles[variant],
      className
    )}
  >
    {children}
  </div>
);

const AppAlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col items-center text-center", className)}
    {...props}
  />
);
AppAlertDialogHeader.displayName = "AppAlertDialogHeader";

const AppAlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col gap-3 mt-6 w-full", className)}
    {...props}
  />
);
AppAlertDialogFooter.displayName = "AppAlertDialogFooter";

const AppAlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-foreground text-center mb-2", className)}
    {...props}
  />
));
AppAlertDialogTitle.displayName = "AppAlertDialogTitle";

const AppAlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground text-center", className)}
    {...props}
  />
));
AppAlertDialogDescription.displayName = "AppAlertDialogDescription";

const AppAlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action> & {
    variant?: "default" | "destructive";
  }
>(({ className, variant = "default", ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(
      "group w-full inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition-all active:scale-[0.97]",
      variant === "destructive"
        ? "bg-gradient-to-b from-destructive to-[hsl(var(--destructive)/0.85)] text-white shadow-[0_2px_8px_hsl(var(--destructive)/0.35),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_4px_16px_hsl(var(--destructive)/0.45),inset_0_1px_0_rgba(255,255,255,0.25)] hover:brightness-110"
        : "bg-gradient-to-b from-[hsl(222,100%,60%)] to-[hsl(222,100%,47%)] text-white shadow-[0_2px_8px_hsl(222,100%,56%,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_4px_16px_hsl(222,100%,56%,0.45),inset_0_1px_0_rgba(255,255,255,0.25)] hover:brightness-110",
      "disabled:opacity-50 disabled:pointer-events-none",
      className
    )}
    {...props}
  />
));
AppAlertDialogAction.displayName = "AppAlertDialogAction";

const AppAlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(
      "w-full inline-flex items-center justify-center rounded-full px-6 py-3.5 text-sm font-semibold transition-all active:scale-[0.97]",
      "bg-gradient-to-b from-card to-muted border border-border text-foreground",
      "shadow-[0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.5)]",
      "hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]",
      className
    )}
    {...props}
  />
));
AppAlertDialogCancel.displayName = "AppAlertDialogCancel";

export {
  AppAlertDialog,
  AppAlertDialogPortal,
  AppAlertDialogOverlay,
  AppAlertDialogTrigger,
  AppAlertDialogContent,
  AppAlertDialogIcon,
  AppAlertDialogHeader,
  AppAlertDialogFooter,
  AppAlertDialogTitle,
  AppAlertDialogDescription,
  AppAlertDialogAction,
  AppAlertDialogCancel,
};
