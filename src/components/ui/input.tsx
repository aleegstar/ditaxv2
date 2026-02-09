
import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.ComponentProps<"input"> {
  variant?: "default" | "transparent-white" | "glass"
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = "default", ...props }, ref) => {
    const baseStyles = "flex w-full text-sm transition-all disabled:cursor-not-allowed disabled:opacity-50"
    
    const variantStyles = {
      default: "h-9 rounded-lg border border-input bg-white px-3 py-2 text-foreground shadow-sm shadow-black/5 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20 placeholder:text-muted-foreground/70",
      "transparent-white": "h-12 rounded-full bg-white text-black border border-gray-300 px-4 py-3 focus:outline-none focus:border-gray-400 placeholder:text-gray-500 hover:border-gray-400 shadow-lg shadow-black/10",
      "glass": "h-14 rounded-2xl glass-input px-5 py-4 text-slate-900 placeholder:text-slate-400 focus:outline-none text-base"
    }
    
    const searchStyles = type === "search" ? "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none" : ""
    
    const fileStyles = type === "file" ? "p-0 pr-3 italic text-muted-foreground/70 file:me-3 file:h-full file:border-0 file:border-r file:border-solid file:border-input file:bg-transparent file:px-3 file:text-sm file:font-medium file:not-italic file:text-foreground" : ""

    return (
      <input
        type={type}
        className={cn(
          baseStyles,
          variantStyles[variant],
          searchStyles,
          fileStyles,
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
