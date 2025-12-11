
"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FramerButtonDarkProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "desktop" | "mobile" | "form";
  href?: string;
  asChild?: boolean;
}

const FramerButtonDark = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, FramerButtonDarkProps>(({
  children,
  variant = "desktop",
  href,
  className,
  asChild = false,
  ...props
}, ref) => {
  // Base styles for dark button
  const baseStyles = cn(
    "inline-flex items-center justify-center rounded-full border-0",
    "font-medium text-white transition-all duration-500",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    // Variant-specific sizing
    variant === "desktop" ? "h-[41px] w-[131px] text-sm" : 
    variant === "mobile" ? "h-[38px] w-[120px] text-xs" : 
    "h-12 px-8 text-sm",
    className
  );

  // Dark animation variants for hover effect
  const buttonVariants = {
    initial: {
      background: "radial-gradient(59% 170% at 1.2% 50%, rgb(17, 17, 17) 0%, rgb(17, 17, 17) 37%, rgb(0, 0, 0) 100%)",
      boxShadow: "-12px 0px 21px -3px rgba(255, 89, 0, 0.3), -7px 0px 10px -5px rgba(255, 56, 132, 0.3)"
    },
    hover: {
      background: "radial-gradient(59% 170% at 98.8% 50%, rgb(17, 17, 17) 0%, rgb(17, 17, 17) 37%, rgb(0, 0, 0) 100%)",
      boxShadow: "12px 0px 21px -3px rgba(255, 89, 0, 0.3), 7px 0px 10px -5px rgba(255, 56, 132, 0.3)"
    }
  };

  const transitionConfig = {
    duration: 0.5
  };

  // If href is provided, render as anchor
  if (href) {
    // Filter out all conflicting props for anchor
    const {
      onDrag,
      onDragStart,
      onDragEnd,
      onAnimationStart,
      onAnimationEnd,
      onAnimationIteration,
      // Button-specific props
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
      // Remove all event handlers to avoid type conflicts
      onCopy,
      onCut,
      onPaste,
      onCompositionEnd,
      onCompositionStart,
      onCompositionUpdate,
      onFocus,
      onBlur,
      onFocusCapture,
      onBlurCapture,
      onChange,
      onBeforeInput,
      onInput,
      onReset,
      onSubmit,
      onInvalid,
      onLoad,
      onError,
      onKeyDown,
      onKeyPress,
      onKeyUp,
      onAbort,
      onCanPlay,
      onCanPlayThrough,
      onDurationChange,
      onEmptied,
      onEncrypted,
      onEnded,
      onLoadedData,
      onLoadedMetadata,
      onLoadStart,
      onPause,
      onPlay,
      onPlaying,
      onProgress,
      onRateChange,
      onSeeked,
      onSeeking,
      onStalled,
      onSuspend,
      onTimeUpdate,
      onVolumeChange,
      onWaiting,
      onAuxClick,
      onClick,
      onContextMenu,
      onDoubleClick,
      onMouseDown,
      onMouseEnter,
      onMouseLeave,
      onMouseMove,
      onMouseOut,
      onMouseOver,
      onMouseUp,
      onSelect,
      onTouchCancel,
      onTouchEnd,
      onTouchMove,
      onTouchStart,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onPointerEnter,
      onPointerLeave,
      onPointerOver,
      onPointerOut,
      onGotPointerCapture,
      onLostPointerCapture,
      onScroll,
      onWheel,
      onAnimationEndCapture,
      onAnimationStartCapture,
      onAnimationIterationCapture,
      onTransitionEnd,
      onTransitionEndCapture,
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

  // Default button rendering - filter out conflicting motion props
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
      <span className="relative z-10 text-white">
        {children}
      </span>
    </motion.button>
  );
});

FramerButtonDark.displayName = "FramerButtonDark";

export { FramerButtonDark };
export type { FramerButtonDarkProps };
