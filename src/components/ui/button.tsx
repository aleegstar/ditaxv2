
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-[15px] font-semibold tracking-tight transition-all duration-200 outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // PRIMARY — premium navy gradient (Stripe/Mercury-style fintech)
        default:
          "text-white border border-white/[0.08] " +
          "bg-[linear-gradient(180deg,#1E3A5F_0%,#0F1B3D_100%)] " +
          "shadow-[0_8px_24px_rgba(15,27,61,0.22),inset_0_1px_0_rgba(255,255,255,0.14)] " +
          "hover:bg-[linear-gradient(180deg,#264a78_0%,#142348_100%)] " +
          "hover:shadow-[0_12px_28px_rgba(15,27,61,0.28),inset_0_1px_0_rgba(255,255,255,0.16)] " +
          "active:scale-[0.985] active:shadow-[0_4px_14px_rgba(15,27,61,0.22),inset_0_1px_0_rgba(255,255,255,0.10)]",
        destructive:
          "text-white border border-white/[0.08] " +
          "bg-[linear-gradient(180deg,hsl(var(--destructive))_0%,hsl(var(--destructive)/0.82)_100%)] " +
          "shadow-[0_8px_24px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.16)] " +
          "hover:brightness-[1.05] active:scale-[0.985]",
        outline:
          "bg-white text-foreground border border-[rgba(20,20,20,0.08)] " +
          "shadow-[0_1px_2px_rgba(0,0,0,0.02)] " +
          "hover:bg-foreground/[0.025] hover:border-[rgba(20,20,20,0.12)] active:scale-[0.985]",
        secondary:
          "bg-foreground/[0.04] text-foreground border border-[rgba(20,20,20,0.06)] " +
          "hover:bg-foreground/[0.06] active:scale-[0.985]",
        ghost: "text-foreground hover:bg-foreground/[0.04] active:scale-[0.985]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-5",
        sm: "h-9 px-4 text-[13px] rounded-xl",
        lg: "h-13 px-7 text-[15px]",
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
