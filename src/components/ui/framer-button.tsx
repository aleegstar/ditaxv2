
"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FramerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "desktop" | "mobile" | "outline";
  href?: string;
  asChild?: boolean;
}

const FramerButton = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, FramerButtonProps>(({
  children,
  variant = "desktop",
  href,
  className,
  asChild = false,
  ...props
}, ref) => {
  const isOutline = variant === "outline";
  
  // Base styles
  const baseStyles = cn(
    "inline-flex items-center justify-center rounded-full",
    "font-poppins font-medium transition-all duration-500",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    // Variant-specific sizing and colors
    isOutline 
      ? "h-[48px] w-full text-sm text-zinc-200 border border-white/10" 
      : variant === "desktop" 
        ? "h-[41px] w-[131px] text-sm text-black border border-white/40" 
        : "h-[38px] w-[120px] text-xs text-black border border-white/40",
    className
  );

  // Animation variants for hover effect
  const buttonVariants = isOutline ? {
    initial: {
      background: "rgba(255, 255, 255, 0.03)",
    },
    hover: {
      background: "rgba(255, 255, 255, 0.07)",
    }
  } : {
    initial: {
      background: "radial-gradient(59% 170% at 1.2% 50%, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 37%, rgb(208, 208, 208) 100%)",
      boxShadow: "-12px 0px 21px -3px rgba(255, 89, 0, 0.7), -7px 0px 10px -5px rgb(255, 56, 132)"
    },
    hover: {
      background: "radial-gradient(59% 170% at 98.8% 50%, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 37%, rgb(208, 208, 208) 100%)",
      boxShadow: "12px 0px 21px -3px rgba(255, 89, 0, 0.7), 7px 0px 10px -5px rgb(255, 56, 132)"
    }
  };

  const transitionConfig = {
    duration: 0.5
  };

  // If href is provided, render as anchor
  if (href) {
    // Filter out conflicting props for anchor
    const {
      onDrag,
      onDragStart,
      onDragEnd,
      onAnimationStart,
      onAnimationEnd,
      onAnimationIteration,
      disabled,
      form,
      formAction,
      formEncType,
      formMethod,
      formNoValidate,
      formTarget,
      name,
      type,
      value,
      ...safeAnchorProps
    } = props;

    return (
      <motion.a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={baseStyles}
        variants={buttonVariants}
        initial="initial"
        whileHover="hover"
        transition={transitionConfig}
        {...safeAnchorProps as any}
      >
        <span className="relative z-10">
          {children}
        </span>
      </motion.a>
    );
  }

  // Default button rendering
  const {
    onDrag,
    onDragStart,
    onDragEnd,
    onAnimationStart,
    onAnimationEnd,
    onAnimationIteration,
    ...buttonProps
  } = props;

  return (
    <motion.button
      ref={ref as React.Ref<HTMLButtonElement>}
      className={baseStyles}
      variants={buttonVariants}
      initial="initial"
      whileHover="hover"
      transition={transitionConfig}
      {...buttonProps}
    >
    <span className={cn("relative z-10", isOutline ? "text-zinc-200" : "text-black")}>
        {children}
      </span>
    </motion.button>
  );
});

FramerButton.displayName = "FramerButton";

export { FramerButton };
export type { FramerButtonProps };
