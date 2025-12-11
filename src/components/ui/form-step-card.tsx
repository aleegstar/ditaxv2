
"use client";

import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { CheckCircle2, Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

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
interface FormStepCardProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  title: string;
  description: string;
  isComplete: boolean;
  icon: React.ReactNode;
  badge: React.ReactNode;
  gradient?: string;
}
const FormStepCard = React.forwardRef<HTMLDivElement, FormStepCardProps>(({
  className,
  title,
  description,
  isComplete,
  icon,
  badge,
  gradient = "from-[#1a56f0] to-[#1a56f0]",
  ...props
}, ref) => {
  const isMobile = useIsMobile();
  
  return <motion.div ref={ref} initial="hidden" animate="visible" variants={fadeInVariants} transition={{
    duration: CARD_ANIMATION_DURATION
  }} style={{
    perspective: PERSPECTIVE
  }} className={cn("touch-none cursor-pointer select-none", className)} {...props}>
      <motion.div 
        className={cn("relative w-full max-w-md mx-auto overflow-hidden rounded-xl p-6 shadow-lg text-white", 
        isMobile ? "h-40" : "h-56")} 
        initial={{
          opacity: 0,
          y: 50
        }} 
        animate={{
          opacity: 1,
          y: 0
        }} 
        transition={{
          duration: CARD_ANIMATION_DURATION
        }} 
        style={{
          backgroundImage: "url('https://ditax.ch/wp-content/uploads/2025/05/Sanfte-Farbverlauftextur-in-Blau-Orange.png')",
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}>
        {/* Header mit zentriertem Icon und Titel jeweils auf eigener Zeile */}
        <div className="flex flex-col items-center justify-center mb-4">
          <div className="bg-white rounded-full p-2 w-10 h-10 flex items-center justify-center mb-2">
            {icon}
          </div>
          <span className="font-bold text-center text-base">{title}</span>
        </div>
        
        {/* Status badge */}
        <div className="flex justify-center">
          {badge}
        </div>
      </motion.div>
    </motion.div>;
});
FormStepCard.displayName = "FormStepCard";
export { FormStepCard };
