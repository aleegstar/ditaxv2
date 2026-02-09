import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const liquidButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-200 outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-white text-slate-900 shadow-liquid hover:shadow-liquid-lg hover:-translate-y-0.5 active:scale-[0.98] active:shadow-liquid-sm",
        secondary: "bg-white/80 backdrop-blur-sm text-slate-700 border border-white/50 shadow-glass-sm hover:bg-white hover:shadow-glass active:scale-[0.98]",
        ghost: "bg-transparent text-slate-600 hover:bg-white/50 hover:text-slate-900 active:scale-[0.98]",
        outline: "bg-transparent border border-slate-200/80 text-slate-700 hover:bg-white/50 hover:border-slate-300 active:scale-[0.98]",
        blue: "bg-gradient-to-b from-blue-500 to-blue-600 text-white border-t border-blue-400 shadow-blue hover:shadow-blue-lg hover:-translate-y-0.5 active:scale-[0.98]"
      },
      size: {
        default: "h-12 px-6 py-3 text-[15px] rounded-full",
        sm: "h-10 px-4 py-2 text-sm rounded-full",
        lg: "h-14 px-8 py-4 text-base rounded-full",
        xl: "h-16 px-10 py-5 text-lg rounded-full",
        icon: "h-12 w-12 rounded-full"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "default"
    }
  }
);

export interface LiquidButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof liquidButtonVariants> {
  asChild?: boolean;
}

const LiquidButton = React.forwardRef<HTMLButtonElement, LiquidButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(liquidButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
LiquidButton.displayName = "LiquidButton";

// Split toggle button component
interface SplitOption {
  label: string;
  value: string;
}

interface LiquidSplitButtonProps {
  options: [SplitOption, SplitOption];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

const LiquidSplitButton = React.forwardRef<HTMLDivElement, LiquidSplitButtonProps>(
  ({ options, value, onChange, className, disabled }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex rounded-full bg-white/80 backdrop-blur-sm p-1 shadow-glass-sm border border-white/50",
          disabled && "opacity-50 pointer-events-none",
          className
        )}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200",
              value === option.value
                ? "bg-white text-slate-900 shadow-liquid"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }
);
LiquidSplitButton.displayName = "LiquidSplitButton";

export { LiquidButton, LiquidSplitButton, liquidButtonVariants };
