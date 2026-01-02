import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Info, ChevronDown } from 'lucide-react';
import { YesNoQuestion as YesNoQuestionType } from '@/types/multiStepYesNo';
import { cn } from '@/lib/utils';
interface YesNoQuestionProps {
  question: YesNoQuestionType;
  answer?: boolean;
  onAnswer: (answer: boolean) => void;
  className?: string;
}
export const YesNoQuestion: React.FC<YesNoQuestionProps> = ({
  question,
  answer,
  onAnswer,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Function to truncate explanation text
  const truncateText = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength);
  };
  const shouldTruncate = question.explanation && question.explanation.length > 60;
  return <motion.div initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} exit={{
    opacity: 0,
    y: -20
  }} transition={{
    duration: 0.5,
    ease: [0.22, 1, 0.36, 1]
  }} className={cn("flex-1 flex flex-col items-center justify-center", className)}>
      {/* Question Text */}
      <h2 className="text-2xl font-semibold tracking-tight text-center mb-8 leading-snug px-4 text-slate-800">
        {question.text}
      </h2>

      {/* Info Box */}
      {question.explanation && <div onClick={() => shouldTruncate && setIsExpanded(!isExpanded)} className="w-full border border-white/[0.08] rounded-2xl p-5 flex gap-4  backdrop-blur-sm relative group cursor-pointer bg-slate-100">
          <div className="shrink-0 pt-0.5">
            <Info className="w-5 h-5 text-zinc-500 group-hover:text-[#1D64FF] transition-colors" />
          </div>
          <div className="space-y-1">
            <p className="text-sm leading-relaxed text-slate-800">
              {shouldTruncate && !isExpanded ? `${truncateText(question.explanation)}...` : question.explanation}
            </p>
            {shouldTruncate && <button className="text-sm font-medium text-[#1D64FF] hover:text-[#1D64FF]/80 transition-colors flex items-center gap-1">
                {isExpanded ? "weniger anzeigen" : "mehr anzeigen"}
                <ChevronDown className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-180")} />
              </button>}
          </div>
        </div>}

      {/* Action Buttons */}
      <div className="flex gap-4 w-full mt-8">
        {/* Yes Button */}
        <button onClick={() => onAnswer(true)} className={cn("group flex-1 relative overflow-hidden rounded-xl p-[1px] active:scale-[0.98] transition-all duration-200", answer === true ? "bg-[#1D64FF] shadow-[0_0_25px_-5px_rgba(29,100,255,0.6)]" : "bg-[#1D64FF] shadow-[0_0_20px_-5px_rgba(29,100,255,0.4)]")}>
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative h-12 flex items-center justify-center gap-2 bg-[#1D64FF] rounded-xl w-full">
            <Check className="w-4 h-4 text-white" strokeWidth={2} />
            <span className="text-white font-semibold">Ja</span>
          </div>
        </button>

        {/* No Button */}
        <button onClick={() => onAnswer(false)} className={cn("group flex-1 relative overflow-hidden rounded-xl p-[1px] active:scale-[0.98] transition-all duration-200", answer === false ? "bg-[#DC2626] shadow-[0_0_25px_-5px_rgba(220,38,38,0.6)]" : "bg-[#DC2626] shadow-[0_0_20px_-5px_rgba(220,38,38,0.4)]")}>
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative h-12 flex items-center justify-center gap-2 bg-[#DC2626] rounded-xl w-full">
            <X className="w-4 h-4 text-white" strokeWidth={2} />
            <span className="text-white font-semibold">Nein</span>
          </div>
        </button>
      </div>
    </motion.div>;
};