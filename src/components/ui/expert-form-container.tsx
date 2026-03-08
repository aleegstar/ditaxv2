import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ShieldCheck } from 'lucide-react';
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
  return <div className="min-h-screen bg-white text-slate-800 antialiased flex justify-center selection:bg-[#1D64FF]/30">
      {/* Mobile Container */}
      <div className="h-screen md:max-w-4xl bg-white w-full max-w-[500px] mr-auto ml-auto relative flex flex-col overflow-hidden shadow-none">
        {/* Header - unified SubpageHeader */}
        <SubpageHeader title={title} onBack={onBack} />

        {/* Main Content / List */}
        <Container {...containerProps} className={cn("z-10 flex-1 flex flex-col px-4 pb-32 relative overflow-y-auto pt-6 no-scrollbar space-y-3", className)}>
          {children}
        </Container>

        {/* Footer Action */}
        {showFooter && <div className="absolute bottom-0 w-full z-20 p-6 bg-white">
            <Button type="submit" onClick={onSubmit} size="lg" className="w-full">
              {submitLabel}
            </Button>

            <div className="mt-4 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-emerald-500" strokeWidth={1.5} />
              <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">
                Verschlüsselt & Sicher
              </p>
            </div>
          </div>}
      </div>
    </div>;
};