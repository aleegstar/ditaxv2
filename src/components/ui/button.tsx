
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-semibold transition-all duration-200 outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-b from-[hsl(217,90%,62%)] to-[hsl(217,90%,52%)] text-white tracking-widest uppercase shadow-[0_4px_14px_0_rgba(29,100,255,0.39)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(29,100,255,0.5)]",
        destructive:
          "bg-gradient-to-b from-red-500 to-red-600 text-white border-t border-red-400 shadow-[0_4px_14px_0_rgba(220,38,38,0.39)] hover:shadow-[0_6px_20px_rgba(220,38,38,0.23)] hover:-translate-y-0.5",
        outline:
          "bg-white/45 backdrop-blur-[20px] border border-white/40 text-slate-700 shadow-sm hover:bg-white/60 hover:-translate-y-0.5",
        secondary:
          "bg-white border border-border text-foreground shadow-sm hover:bg-slate-50 hover:-translate-y-0.5",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-14 px-8 py-4",
        sm: "h-10 px-4 text-xs",
        lg: "h-16 rounded-2xl px-10",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
