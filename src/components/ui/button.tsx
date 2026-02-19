
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-base font-semibold tracking-tight transition-all duration-200 outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-b from-[rgb(50,120,255)] to-[rgb(20,80,220)] text-white hover:scale-[1.02] active:scale-95",
        destructive:
          "bg-gradient-to-b from-red-500 to-red-600 text-white hover:scale-[1.02] active:scale-95",
        outline:
          "bg-white/45 backdrop-blur-[20px] border border-white/40 text-slate-700 hover:bg-white/60 hover:scale-[1.02] active:scale-95",
        secondary:
          "bg-white border border-border text-foreground hover:bg-slate-50 hover:scale-[1.02] active:scale-95",
        ghost: "hover:bg-accent hover:text-accent-foreground active:scale-95",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 pl-6 pr-4 py-2.5",
        sm: "h-10 px-4 text-sm",
        lg: "h-14 pl-8 pr-5 py-3",
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
