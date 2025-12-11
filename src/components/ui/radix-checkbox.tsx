
import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { InfoToggle } from './info-toggle';

type CheckboxProps = React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & {
  explanation?: string;
};

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, explanation, ...props }, ref) => {
  return (
    <div className={cn(
      "relative flex items-center transition-all duration-200",
      props.checked ? "drop-shadow-[0_5px_20px_rgba(82,152,228,0.8)]" : ""
    )}>
      <CheckboxPrimitive.Root
        ref={ref}
        className={cn(
          'peer h-6 w-6 shrink-0 rounded-sm border border-neutral-300 bg-white disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          className,
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator asChild>
          <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="3.5"
            stroke="currentColor"
            className="h-4 w-4 m-auto text-white"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={
              props.checked 
                ? { pathLength: 1, opacity: 1, transition: { duration: 0.2 } } 
                : { pathLength: 0, opacity: 0, transition: { duration: 0.2 } }
            }
          >
            <motion.path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </motion.svg>
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      
      {explanation && (
        <InfoToggle explanation={explanation} className="ml-2" />
      )}
    </div>
  );
});

Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox, type CheckboxProps };
