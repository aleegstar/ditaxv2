"use client";

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const UnifiedAlertDialog = AlertDialogPrimitive.Root;
const UnifiedAlertDialogTrigger = AlertDialogPrimitive.Trigger;
const UnifiedAlertDialogPortal = AlertDialogPrimitive.Portal;

const UnifiedAlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
));
UnifiedAlertDialogOverlay.displayName = "UnifiedAlertDialogOverlay";

interface UnifiedAlertDialogContentProps
  extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content> {
  showCloseButton?: boolean;
  onClose?: () => void;
}

const UnifiedAlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  UnifiedAlertDialogContentProps
>(({ className, children, showCloseButton = true, onClose, ...props }, ref) => {
  return (
    <UnifiedAlertDialogPortal>
      <UnifiedAlertDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]",
          "w-[90vw] max-w-md bg-white rounded-3xl",
          "p-6 pt-10",
          "shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]",
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
            className="absolute right-5 top-5 w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center shadow-sm hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 touch-manipulation"
            onClick={onClose}
          >
            <X className="w-5 h-5 text-slate-500" />
            <span className="sr-only">Close</span>
          </AlertDialogPrimitive.Cancel>
        )}
        {children}
      </AlertDialogPrimitive.Content>
    </UnifiedAlertDialogPortal>
  );
});
UnifiedAlertDialogContent.displayName = "UnifiedAlertDialogContent";

type IconVariant = "delete" | "warning" | "info" | "success" | "question";

interface UnifiedAlertDialogIconProps {
  variant?: IconVariant;
  children: React.ReactNode;
  className?: string;
}

const iconVariantStyles: Record<IconVariant, string> = {
  delete: "bg-red-50",
  warning: "bg-orange-50",
  info: "bg-blue-50",
  success: "bg-green-50",
  question: "bg-blue-50",
};

const UnifiedAlertDialogIcon: React.FC<UnifiedAlertDialogIconProps> = ({
  variant = "info",
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm",
        iconVariantStyles[variant],
        className
      )}
    >
      {children}
    </div>
  );
};

const UnifiedAlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col items-center text-center", className)}
    {...props}
  />
);
UnifiedAlertDialogHeader.displayName = "UnifiedAlertDialogHeader";

const UnifiedAlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col gap-3 mt-6 w-full", className)}
    {...props}
  />
);
UnifiedAlertDialogFooter.displayName = "UnifiedAlertDialogFooter";

const UnifiedAlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("text-xl font-semibold text-slate-900 text-center mb-2", className)}
    {...props}
  />
));
UnifiedAlertDialogTitle.displayName = "UnifiedAlertDialogTitle";

const UnifiedAlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-slate-500 text-center", className)}
    {...props}
  />
));
UnifiedAlertDialogDescription.displayName = "UnifiedAlertDialogDescription";

interface UnifiedAlertDialogActionProps
  extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action> {
  variant?: "default" | "destructive" | "secondary" | "primary";
}

const actionVariantStyles: Record<string, string> = {
  default: "bg-primary text-white hover:bg-primary/90 shadow-[0_0_20px_rgba(29,100,255,0.3)]",
  primary: "bg-primary text-white hover:bg-primary/90 shadow-[0_0_20px_rgba(29,100,255,0.3)]",
  destructive: "bg-red-500 text-white hover:bg-red-600",
  secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
};

const UnifiedAlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  UnifiedAlertDialogActionProps
>(({ className, variant = "default", ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(
      "w-full py-3 rounded-full font-medium transition-colors",
      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
      actionVariantStyles[variant],
      className
    )}
    {...props}
  />
));
UnifiedAlertDialogAction.displayName = "UnifiedAlertDialogAction";

const UnifiedAlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(
      "w-full py-4 rounded-full font-medium transition-colors",
      "bg-white text-slate-700 border border-slate-200",
      "hover:bg-slate-50",
      "focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
      className
    )}
    {...props}
  />
));
UnifiedAlertDialogCancel.displayName = "UnifiedAlertDialogCancel";

export {
  UnifiedAlertDialog,
  UnifiedAlertDialogPortal,
  UnifiedAlertDialogOverlay,
  UnifiedAlertDialogTrigger,
  UnifiedAlertDialogContent,
  UnifiedAlertDialogIcon,
  UnifiedAlertDialogHeader,
  UnifiedAlertDialogFooter,
  UnifiedAlertDialogTitle,
  UnifiedAlertDialogDescription,
  UnifiedAlertDialogAction,
  UnifiedAlertDialogCancel,
};
