
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
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
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.3 }
  };

  return (
    <div className="min-h-screen bg-[#020408] text-zinc-200 antialiased flex justify-center selection:bg-[#1D64FF]/30">
      {/* Mobile Container */}
      <div className="h-screen md:max-w-2xl bg-[#020408] w-full max-w-[500px] mr-auto ml-auto relative flex flex-col shadow-2xl overflow-hidden border-x border-white/[0.02]">
        {/* Background Ambient Glow */}
        <div 
          className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none opacity-100"
          style={{
            background: 'radial-gradient(circle at 50% 60%, rgba(29, 100, 255, 0.08) 0%, rgba(29, 100, 255, 0.01) 50%, transparent 70%)',
            filter: 'blur(90px)'
          }}
        />

        {/* Header */}
        <div className="flex shrink-0 z-20 border-white/[0.03] bg-[#020408]/80 w-full border-b pt-8 pr-6 pb-4 pl-6 relative backdrop-blur-md items-center justify-between">
          {/* Back Button */}
          {onBack && (
            <button 
              onClick={onBack}
              className="w-10 h-10 rounded-full border border-white/[0.08] bg-white/[0.02] flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/20 hover:bg-white/[0.06] transition-all duration-300 group shadow-lg"
            >
              <ArrowLeft className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
            </button>
          )}
          {!onBack && <div className="w-10 h-10" />}

          {/* Title */}
          <h1 className="font-medium text-lg tracking-tight text-white/90 leading-tight absolute left-1/2 -translate-x-1/2">
            {title}
          </h1>

          {/* Right placeholder */}
          <div className="w-10 h-10" />
        </div>

        {/* Main Content / List */}
        <Container
          {...containerProps}
          className={cn(
            "z-10 flex-1 flex flex-col px-4 pb-32 relative overflow-y-auto pt-6 no-scrollbar space-y-3",
            className
          )}
        >
          {children}
        </Container>

        {/* Footer Action */}
        {showFooter && (
          <div className="absolute bottom-0 w-full z-20 p-6 bg-gradient-to-t from-[#020408] via-[#020408] to-transparent">
            <button 
              type="submit"
              onClick={onSubmit}
              className="w-full relative overflow-hidden rounded-xl bg-[#1D64FF] p-[1px] shadow-[0_0_30px_-5px_rgba(29,100,255,0.4)] active:scale-[0.99] transition-all duration-200 group"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative py-4 flex items-center justify-center gap-2 bg-[#1D64FF] rounded-xl w-full">
                <span className="text-white font-semibold text-lg tracking-tight">{submitLabel}</span>
              </div>
            </button>

            <div className="mt-4 flex items-center justify-center gap-1.5 opacity-60">
              <ShieldCheck className="w-3 h-3 text-emerald-500" strokeWidth={1.5} />
              <p className="text-[10px] text-zinc-400 font-medium tracking-wide uppercase">
                Verschlüsselt & Sicher
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
