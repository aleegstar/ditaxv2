
import * as React from 'react';
import { HelpCircle, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from '@/hooks/use-mobile';

interface InfoToggleProps {
  explanation: string;
  className?: string;
}

export function InfoToggle({
  explanation,
  className
}: InfoToggleProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = React.useState(false);

  // For mobile devices, we'll use a click handler instead of relying on hover
  const handleToggleClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default to avoid any bubbling issues
    e.stopPropagation();
    if (isMobile) {
      // Explicitly toggle the state
      setIsOpen(prevState => !prevState);
    }
  };

  // Handle close button click
  const handleCloseClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(false);
  };

  return <TooltipProvider>
      <Tooltip delayDuration={300} open={isMobile ? isOpen : undefined} onOpenChange={isMobile ? undefined : setIsOpen} // Only use onOpenChange for desktop
    >
        <TooltipTrigger asChild>
          <button type="button" className={`inline-flex flex-shrink-0 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-0 rounded-full p-1 ${className}`} onClick={handleToggleClick} aria-label="Mehr Informationen">
            <HelpCircle size={18} />
          </button>
        </TooltipTrigger>
        <TooltipContent align="center" side="bottom" className="bg-white p-3 px-[12px] shadow-lg border border-gray-200 max-w-xs text-sm">
          <button onClick={handleCloseClick} className="absolute top-1 right-1 p-1 text-gray-400 hover:text-gray-600 rounded-full focus:outline-none" aria-label="Schließen">
            <X size={14} />
          </button>
          <p className="text-center pr-5 pl-1">{explanation}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>;
}
