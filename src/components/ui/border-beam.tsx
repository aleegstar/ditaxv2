import { cn } from "@/lib/utils"

interface BorderBeamProps {
  className?: string
  size?: number
  duration?: number
  borderWidth?: number
  anchor?: number
  colorFrom?: string
  colorTo?: string
  delay?: number
  side?: "top" | "bottom" | "left" | "right"
}

export const BorderBeam = ({
  className,
  size = 200,
  duration = 15,
  anchor = 90,
  borderWidth = 1.5,
  colorFrom = "#ffaa40",
  colorTo = "#9c40ff",
  delay = 0,
  side,
}: BorderBeamProps) => {
  return (
    <div
      style={
        {
          "--size": size,
          "--duration": duration,
          "--anchor": anchor,
          "--border-width": borderWidth,
          "--color-from": colorFrom,
          "--color-to": colorTo,
          "--delay": `-${delay}s`,
          ...(side === "bottom"
            ? { "--clip": "inset(50% 0 0 0)" }
            : side === "top"
            ? { "--clip": "inset(0 0 50% 0)" }
            : side === "left"
            ? { "--clip": "inset(0 50% 0 0)" }
            : side === "right"
            ? { "--clip": "inset(0 0 0 50%)" }
            : {}),
        } as React.CSSProperties
      }
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit] [border:calc(var(--border-width)*1px)_solid_transparent]",

        // mask styles
        "![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)]",

        // pseudo styles with enhanced glow
        "after:absolute after:aspect-square after:w-[calc(var(--size)*1px)] after:animate-border-beam after:[animation-delay:var(--delay)] after:[background:linear-gradient(to_left,var(--color-from),var(--color-to),transparent)] after:[offset-anchor:calc(var(--anchor)*1%)_50%] after:[offset-path:rect(0_auto_auto_0_round_calc(var(--size)*1px))]",
        
        // Enhanced glow effect with stronger visibility
        "after:[filter:blur(3px)_drop-shadow(0_0_10px_var(--color-from))_drop-shadow(0_0_25px_var(--color-from))_drop-shadow(0_0_50px_var(--color-to))]",
        
        side ? "after:[clip-path:var(--clip)]" : undefined,
        className,
      )}
    />
  )
}