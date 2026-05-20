import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Clock, FileText } from 'lucide-react';
import { YesNoQuestion as YesNoQuestionType } from '@/types/multiStepYesNo';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import yesNoHero from '@/assets/yesno-hero.webp';

const sectionLabels: Record<string, string> = {
  income: 'Einkommen',
  deductions: 'Abzüge',
  assets: 'Vermögen',
  contact: 'Kontakt',
};

interface DropdownQuestionProps {
  question: YesNoQuestionType;
  value?: number;
  onSubmit: (value: number) => void;
  section?: 'income' | 'deductions' | 'assets' | 'contact';
  className?: string;
}

export const DropdownQuestion: React.FC<DropdownQuestionProps> = ({
  question,
  value,
  onSubmit,
  section,
  className,
}) => {
  const opts = question.dropdownOptions ?? { min: 0, max: 10 };
  const [selected, setSelected] = useState<string>(
    value === undefined
      ? ''
      : value > opts.max
        ? 'more'
        : String(value)
  );
  const [moreVal, setMoreVal] = useState<string>(
    value !== undefined && value > opts.max ? String(value) : ''
  );
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (value === undefined) return;
    setSelected(value > opts.max ? 'more' : String(value));
    if (value > opts.max) setMoreVal(String(value));
  }, [value, opts.max]);

  const canSubmit =
    selected !== '' &&
    (selected !== 'more' || (parseInt(moreVal, 10) > opts.max));

  const handleSubmit = () => {
    if (!canSubmit) return;
    const n =
      selected === 'more'
        ? parseInt(moreVal, 10)
        : parseInt(selected, 10);
    if (Number.isFinite(n) && n >= 0) onSubmit(n);
  };

  const sectionLabel = section ? sectionLabels[section] : undefined;

  return (
    <div className={cn('flex-1 flex flex-col items-center', className)}>
      <div className="relative w-full max-w-xl mx-auto">
        <div className="relative w-full rounded-2xl bg-card overflow-hidden border border-border shadow-[0_1px_2px_rgba(15,27,61,0.04),0_4px_12px_rgba(15,27,61,0.04)] flex flex-col">
          <div className="relative w-full h-[150px] sm:h-[180px] shrink-0 overflow-hidden">
            <img
              src={yesNoHero}
              alt=""
              className="absolute inset-0 h-full w-full object-cover pointer-events-none select-none"
              aria-hidden="true"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent pointer-events-none" />
            {sectionLabel && (
              <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-white/95 backdrop-blur-sm shadow-sm">
                <FileText className="w-3 h-3 text-primary" strokeWidth={2.25} />
                <span className="text-[10.5px] font-semibold tracking-[0.12em] uppercase text-foreground">
                  {sectionLabel}
                </span>
              </div>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24 }}
            className="px-6 sm:px-8 pt-5 pb-4"
          >
            <h2 className="text-[22px] sm:text-[24px] text-foreground tracking-[-0.02em] font-semibold leading-[1.25] text-center">
              {question.text}
            </h2>

            {question.explanation && (
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  className="inline-flex items-center gap-1 text-[12.5px] font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  {expanded ? 'Weniger anzeigen' : 'Mehr erfahren'}
                </button>
                {expanded && (
                  <div className="rounded-xl bg-muted/60 border border-border px-4 py-3 text-left mt-3">
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                      {question.explanation}
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          <div className="px-6 sm:px-8 pb-2 space-y-3">
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="h-12 bg-card border">
                <SelectValue placeholder="Anzahl auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">{opts.zeroLabel ?? '0'}</SelectItem>
                {Array.from({ length: opts.max - opts.min }, (_, i) => opts.min + 1 + i).map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
                <SelectItem value="more">{opts.moreLabel ?? `Mehr als ${opts.max}`}</SelectItem>
              </SelectContent>
            </Select>
            {selected === 'more' && (
              <Input
                type="number"
                min={opts.max + 1}
                placeholder={`z. B. ${opts.max + 1}`}
                value={moreVal}
                onChange={(e) => setMoreVal(e.target.value)}
                className="h-12 bg-card border"
              />
            )}
          </div>

          <div className="px-6 sm:px-8 pb-6 pt-3">
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="w-full h-12 inline-flex items-center justify-center rounded-xl px-5 text-[15px] font-semibold text-white tracking-tight transition-all duration-150 border border-white/[0.08] bg-[linear-gradient(180deg,#1E3A5F_0%,#0F1B3D_100%)] shadow-[0_6px_18px_rgba(15,27,61,0.22),inset_0_1px_0_rgba(255,255,255,0.14)] hover:bg-[linear-gradient(180deg,#264a78_0%,#142348_100%)] active:scale-[0.985] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Weiter
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[11.5px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-primary/70" strokeWidth={1.75} />
            Ende-zu-Ende verschlüsselt
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary/70" strokeWidth={1.75} />
            Ca. 5 Min. pro Bereich
          </span>
        </div>
      </div>
    </div>
  );
};
