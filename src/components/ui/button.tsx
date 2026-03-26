
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-base font-semibold tracking-tight transition-all duration-200 outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-b from-[hsl(222,100%,60%)] to-[hsl(222,100%,47%)] text-white shadow-[0_4px_16px_-4px_hsl(222,100%,50%/0.4),inset_0_1px_0_hsl(0,0%,100%/0.2)] hover:shadow-[0_6px_24px_-4px_hsl(222,100%,50%/0.5)] hover:brightness-[1.04] active:scale-[0.97] active:brightness-95",
        destructive:
          "bg-gradient-to-b from-destructive to-[hsl(var(--destructive)/0.85)] text-white shadow-[0_1px_3px_0_rgba(0,0,0,0.08),0_2px_8px_-2px_hsl(var(--destructive)/0.25),inset_0_1px_0_0_rgba(255,255,255,0.16)] hover:shadow-[0_2px_6px_0_rgba(0,0,0,0.1),0_4px_12px_-2px_hsl(var(--destructive)/0.3),inset_0_1px_0_0_rgba(255,255,255,0.2)] hover:brightness-[1.04] active:scale-[0.97] active:brightness-95",
        outline:
          "bg-background border border-border text-foreground shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] hover:bg-muted/50 active:scale-[0.97]",
        secondary:
          "bg-muted/50 border border-border/60 text-foreground shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] hover:bg-muted active:scale-[0.97]",
        ghost: "hover:bg-accent hover:text-accent-foreground active:scale-[0.97]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 px-4 text-sm",
        lg: "h-13 px-7 py-3",
        icon: "h-10 w-10 min-w-[44px] min-h-[44px] rounded-full p-0",
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
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? <span className="opacity-70">{children}</span> : children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
