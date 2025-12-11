"use client";

import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
const PERSPECTIVE = 400;
const CARD_ANIMATION_DURATION = 0.5;
const INITIAL_DELAY = 0.2;
const springTransition = {
  type: "spring",
  stiffness: 100,
  damping: 30
};
const fadeInVariants = {
  hidden: {
    opacity: 0,
    y: 20
  },
  visible: {
    opacity: 1,
    y: 0
  }
};

// Create a separate interface without the React event handlers that conflict
interface CreditCardProps extends Omit<HTMLMotionProps<"div">, "onDrag" | "onDragStart" | "onDragEnd"> {
  cardNumber: string;
  cardHolder: string;
  expiryDate: string;
  variant?: "default" | "dark";
}
const CreditCard = React.forwardRef<HTMLDivElement, CreditCardProps>(({
  className,
  cardNumber,
  cardHolder,
  expiryDate,
  variant = "default",
  ...props
}, ref) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const getMaskedNumber = (number: string) => {
    const lastFour = number.slice(-4);
    return `**** **** **** ${lastFour}`;
  };
  const variants = {
    default: "bg-gradient-to-br from-lime-300 to-emerald-300 text-blue-900",
    dark: "bg-gradient-to-br from-slate-800 to-slate-900 text-white"
  };
  return <motion.div ref={ref} initial="hidden" animate="visible" variants={fadeInVariants} transition={{
    duration: CARD_ANIMATION_DURATION
  }} style={{
    perspective: PERSPECTIVE
  }} className={cn("relative touch-none rounded-xl overflow-hidden shadow-lg w-full h-52", variants[variant], className)} {...props}>
      
      
      {/* Card shine overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-white/30 pointer-events-none"></div>
    </motion.div>;
});
CreditCard.displayName = "CreditCard";
export { CreditCard };