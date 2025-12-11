
"use client";
import React from "react";
import { motion } from "framer-motion";

interface NewButtonProps {
  children: React.ReactNode;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const NewButton: React.FC<NewButtonProps> = ({ 
  children, 
  className = "", 
  type = "button",
  disabled = false,
  onClick
}) => {
  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`
        group relative inline-flex items-center justify-center
        rounded-full border border-transparent
        bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500
        px-8 py-3 text-base font-medium text-white
        shadow-lg transition-all duration-300 ease-out
        hover:shadow-xl hover:shadow-pink-500/25
        focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
      
      {/* Animated background gradient */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-600 via-red-600 to-yellow-600 opacity-0"
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      />
      
      {/* Shine effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </motion.button>
  );
};
