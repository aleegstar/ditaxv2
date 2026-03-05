import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronLeft, ShieldCheck } from 'lucide-react';
import { isAndroidEnvironment } from '@/utils/platform';
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
        {/* Header - unified design */}
        <header className="sticky top-0 z-30 bg-white shrink-0">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between relative">
            {/* Back Button */}
            {onBack ? (
              <button onClick={onBack} className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-full bg-muted/50 border border-border/40 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0">
                <ChevronLeft className="w-[18px] h-[18px]" strokeWidth={1.5} />
              </button>
            ) : (
              <div className="w-10 h-10" />
            )}

            {/* Centered Title */}
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 absolute left-1/2 -translate-x-1/2">
              {title}
            </h1>

            {/* Right placeholder */}
            <div className="w-10 h-10" />
          </div>
        </header>

        {/* Main Content / List */}
        <Container {...containerProps} className={cn("z-10 flex-1 flex flex-col px-4 pb-32 relative overflow-y-auto pt-6 no-scrollbar space-y-3", className)}>
          {children}
        </Container>

        {/* Footer Action */}
        {showFooter && <div className="absolute bottom-0 w-full z-20 p-6 bg-white">
            <button type="submit" onClick={onSubmit} className="w-full relative overflow-hidden rounded-xl bg-[#1D64FF] p-[1px] shadow-[0_0_20px_-5px_rgba(29,100,255,0.3)] active:scale-[0.99] transition-all duration-200 group">
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative py-4 flex items-center justify-center gap-2 bg-[#1D64FF] rounded-xl w-full">
                <span className="text-white font-semibold text-lg tracking-tight">{submitLabel}</span>
              </div>
            </button>

            <div className="mt-4 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-emerald-500" strokeWidth={1.5} />
              <p className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">
                Verschlüsselt & Sicher
              </p>
            </div>
          </div>}
      </div>
    </div>;
};