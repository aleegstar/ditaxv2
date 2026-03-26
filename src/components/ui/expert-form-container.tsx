import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { isAndroidEnvironment } from '@/utils/platform';
import { Button } from '@/components/ui/button';
import { SubpageHeader } from '@/components/ui/subpage-header';
interface ExpertFormContainerProps {
  children: React.ReactNode;
  title: string;
  onBack?: () => void;
  onSubmit?: (e: React.FormEvent) => void;
  submitLabel?: string;
  showFooter?: boolean;
  className?: string;
}
export const ExpertFormContainer: React.FC<ExpertFormContainerProps> = ({
  children,
  title,
  onBack,
  onSubmit,
  submitLabel = 'Speichern',
  showFooter = true,
  className
}) => {
  const isAndroid = isAndroidEnvironment();
  const Container = isAndroid ? 'div' : motion.div;
  const containerProps = isAndroid ? {} : {
    initial: {
      opacity: 0
    },
    animate: {
      opacity: 1
    },
    transition: {
      duration: 0.3
    }
  };
  return <div className="min-h-screen text-foreground antialiased selection:bg-primary/30 bg-transparent">
      <div className="h-screen w-full relative flex flex-col overflow-hidden">
        {/* Header - unified SubpageHeader */}
        <SubpageHeader title={title} onBack={onBack} />

        {/* Main Content */}
        <Container {...containerProps} className={cn("z-10 flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 sm:px-6 pb-32 relative overflow-y-auto pt-6 no-scrollbar space-y-3", className)}>
          {children}
        </Container>

        {/* Footer Action */}
        {showFooter && <div className="absolute bottom-0 left-0 right-0 z-20">
            <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6">
              <button
                type="submit"
                onClick={onSubmit}
                className="group w-full flex items-center justify-center gap-3 rounded-full bg-gradient-to-b from-[hsl(222,100%,60%)] to-[hsl(222,100%,47%)] px-6 py-4 font-semibold text-base text-white transition-all shadow-[0_2px_8px_hsl(222,100%,56%,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_4px_16px_hsl(222,100%,56%,0.45),inset_0_1px_0_rgba(255,255,255,0.25)] hover:brightness-110 active:scale-[0.97]"
              >
                <span>{submitLabel}</span>
              </button>
            </div>
          </div>}
      </div>
    </div>;
};