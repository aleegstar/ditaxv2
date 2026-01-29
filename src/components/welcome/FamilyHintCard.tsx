import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Users, ArrowRight, X } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

interface FamilyHintCardProps {
  onLater: () => void;
  onAddNow: () => void;
  isLoading?: boolean;
}

export const FamilyHintCard = ({ onLater, onAddNow, isLoading }: FamilyHintCardProps) => {
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full"
    >
      <div className="bg-white rounded-2xl p-6 w-full space-y-5 border border-slate-200 shadow-sm">
        {/* Icon & Title */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
            <Users className="w-6 h-6 text-[#1D64FF]" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="font-semibold text-slate-900 text-lg mb-1">
              {t.onboarding.familyHintTitle}
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              {t.onboarding.familyHintDescription}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            onClick={onLater}
            disabled={isLoading}
            variant="outline"
            className="flex-1 rounded-xl py-3 h-auto text-base font-medium border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            {t.onboarding.familyHintLater}
          </Button>
          <Button
            onClick={onAddNow}
            disabled={isLoading}
            className="flex-1 bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-xl py-3 h-auto text-base font-medium group"
          >
            <span>{t.onboarding.familyHintNow}</span>
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
