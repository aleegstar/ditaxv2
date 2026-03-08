import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, Pencil, ArrowRight } from 'lucide-react';
import { FormSummaryItem } from '@/types/multiStepYesNo';
import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';
import { isAndroidEnvironment } from '@/utils/platform';
import { NativeErrorMonitor } from '@/utils/nativeErrorMonitor';
import { useI18n } from '@/contexts/I18nContext';

interface FormSummaryProps {
  title: string;
  summaryItems: FormSummaryItem[];
  onEdit: (questionId: string) => void;
  onConfirm: () => void;
  onBack: () => void;
}

export const FormSummary: React.FC<FormSummaryProps> = ({
  title,
  summaryItems,
  onEdit,
  onConfirm,
  onBack
}) => {
  const isAndroid = isAndroidEnvironment();
  const reduceMotion = Capacitor.getPlatform() === 'android' || isAndroid;
  const { t } = useI18n();

  React.useEffect(() => {
    NativeErrorMonitor.addBreadcrumb('system', 'FormSummary mounted', {
      title,
      itemCount: summaryItems.length,
      isAndroid
    });
  }, [title, summaryItems.length, isAndroid]);

  const yesAnswers = summaryItems.filter(item => item.answer === true);
  const noAnswers = summaryItems.filter(item => item.answer === false);

  const Wrapper = reduceMotion ? 'div' : motion.div;
  const wrapperProps = reduceMotion ? {} : {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
  };

  const ItemWrapper = reduceMotion ? 'div' : motion.div;

  return (
    <Wrapper {...wrapperProps} className="w-full space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] p-4 text-center">
          <div className="text-2xl font-bold text-primary">{yesAnswers.length}</div>
          <div className="text-xs text-muted-foreground font-medium mt-0.5">Zutreffend</div>
        </div>
        <div className="rounded-2xl border border-border/40 bg-muted/20 p-4 text-center">
          <div className="text-2xl font-bold text-muted-foreground">{noAnswers.length}</div>
          <div className="text-xs text-muted-foreground font-medium mt-0.5">Nicht zutreffend</div>
        </div>
      </div>

      {/* Yes Answers */}
      {yesAnswers.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground px-1 mb-3">Deine Angaben</h3>
          {yesAnswers.map((item, index) => (
            <ItemWrapper
              key={item.questionId}
              {...(reduceMotion ? {} : {
                initial: { opacity: 0, y: 8 },
                animate: { opacity: 1, y: 0 },
                transition: { delay: index * 0.05, duration: 0.25 }
              })}
              className="flex items-center gap-3 p-3.5 rounded-2xl border border-primary/15 bg-primary/[0.03] group"
            >
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 text-primary" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground leading-snug line-clamp-2">
                  {item.questionText}
                </span>
                {item.repeaterData && Array.isArray(item.repeaterData) && item.repeaterData.length > 0 && (
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    {item.repeaterTitle}: {item.repeaterData.length} Einträge
                  </span>
                )}
              </div>
              <button
                onClick={() => onEdit(item.questionId)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
                style={{ touchAction: 'manipulation' }}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </ItemWrapper>
          ))}
        </div>
      )}

      {/* No Answers */}
      {noAnswers.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground px-1 mb-3">Nicht zutreffend</h3>
          {noAnswers.map((item, index) => (
            <ItemWrapper
              key={item.questionId}
              {...(reduceMotion ? {} : {
                initial: { opacity: 0, y: 8 },
                animate: { opacity: 1, y: 0 },
                transition: { delay: (yesAnswers.length + index) * 0.05, duration: 0.25 }
              })}
              className="flex items-center gap-3 p-3.5 rounded-2xl border border-border/30 bg-muted/10 group"
            >
              <div className="w-8 h-8 rounded-xl bg-muted/40 flex items-center justify-center shrink-0">
                <X className="w-4 h-4 text-muted-foreground/50" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm text-muted-foreground leading-snug line-clamp-2">
                  {item.questionText}
                </span>
              </div>
              <button
                onClick={() => onEdit(item.questionId)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground/30 hover:text-foreground hover:bg-muted/40 transition-colors shrink-0"
                style={{ touchAction: 'manipulation' }}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </ItemWrapper>
          ))}
        </div>
      )}

      {/* Confirm Button */}
      <div className="pt-2 pb-4">
        <button
          onClick={onConfirm}
          className={cn(
            "w-full flex items-center justify-center py-4 px-6 rounded-2xl font-semibold text-base transition-all duration-200",
            "bg-primary text-white hover:opacity-90 active:scale-[0.98]"
          )}
          style={{ touchAction: 'manipulation' }}
        >
          Speichern
        </button>
      </div>
    </Wrapper>
  );
};
