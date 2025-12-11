
"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FramerButtonV4Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  variant?: "desktop" | "phone";
  label?: string;
  href?: string;
  className?: string;
}

const FramerButtonV4 = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, FramerButtonV4Props>(({
  children,
  variant = "desktop",
  label,
  href,
  className,
  ...props
}, ref) => {
  
  // Base styles with Poppins font
  const baseStyles = cn(
    "relative inline-flex items-center justify-center",
    "w-[125px] h-[42.8px]",
    "rounded-full",
    "font-poppins font-semibold text-sm text-white",
    "cursor-pointer",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    className
  );

  // Transition configuration
  const transitionConfig = {
    delay: 0,
    duration: 0.7,
    ease: [0.12, 0.23, 0.5, 1] as [number, number, number, number],
    type: "tween" as const
  };

  // Animation variants for outer container
  const outerVariants = {
    initial: {
      background: "radial-gradient(59% 170% at 1.2% 50%, #f5831f 0%, #f5831f 37%, rgba(107, 51, 5, 0.3) 100%)"
    },
    hover: {
      background: "radial-gradient(59% 170% at 98.8% 50%, #f5831f 0%, #f5831f 37%, rgba(107, 51, 5, 0.3) 100%)"
    }
  };

  // Animation variants for inner container
  const innerVariants = {
    initial: {
      background: "radial-gradient(59% 170% at 1.2% 50%, #6b3305 0%, #6b3305 37%, #000000 100%)"
    },
    hover: {
      background: "radial-gradient(59% 170% at 98.8% 50%, #6b3305 0%, #6b3305 37%, #000000 100%)"
    }
  };

  // Content to display
  const content = children || label || "GET STARTED";

  // Inner button content
  const buttonContent = (
    <motion.div
      className="absolute inset-[2px] rounded-full flex items-center justify-center"
      variants={innerVariants}
      initial="initial"
      whileHover="hover"
      transition={transitionConfig}
    >
      <span className="relative z-10 text-white">
        {content}
      </span>
    </motion.div>
  );

  // If href is provided, render as anchor
  if (href) {
    // Filter out button-specific props for anchor
    const {
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
      onSubmit,
      onReset,
      ...safeAnchorProps
    } = props;

    return (
      <motion.a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={baseStyles}
        variants={outerVariants}
        initial="initial"
        whileHover="hover"
        transition={transitionConfig}
        {...safeAnchorProps as any}
      >
        {buttonContent}
      </motion.a>
    );
  }

  // Default button rendering - filter out conflicting Framer Motion props
  const {
    onDrag,
    onDragStart,
    onDragEnd,
    onAnimationStart,
    onAnimationEnd,
    onAnimationIteration,
    ...safeButtonProps
  } = props;

  return (
    <motion.button
      ref={ref as React.Ref<HTMLButtonElement>}
      className={baseStyles}
      variants={outerVariants}
      initial="initial"
      whileHover="hover"
      transition={transitionConfig}
      {...safeButtonProps}
    >
      {buttonContent}
    </motion.button>
  );
});

FramerButtonV4.displayName = "FramerButtonV4";

export { FramerButtonV4 };
export type { FramerButtonV4Props };
