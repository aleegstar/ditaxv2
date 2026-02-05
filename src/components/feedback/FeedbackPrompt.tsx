import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedbackPromptProps {
  isOpen: boolean;
  onDismiss: () => void;
}

const emojis = [
  { value: 1, emoji: '😢', label: 'Sehr unzufrieden' },
  { value: 2, emoji: '😕', label: 'Unzufrieden' },
  { value: 3, emoji: '😐', label: 'Neutral' },
  { value: 4, emoji: '🙂', label: 'Zufrieden' },
  { value: 5, emoji: '😍', label: 'Sehr zufrieden' },
];

export const FeedbackPrompt: React.FC<FeedbackPromptProps> = ({
  isOpen,
  onDismiss,
}) => {
  const navigate = useNavigate();
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  const handleFeedback = () => {
    onDismiss();
    if (selectedRating) {
      navigate(`/feedback?rating=${selectedRating}`);
    } else {
      navigate('/feedback');
    }
  };

  const handleDismiss = () => {
    onDismiss();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Darker overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={handleDismiss}
      />
      
      {/* Modal */}
      <div className="fixed inset-x-4 bottom-8 sm:inset-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 z-50 sm:w-full sm:max-w-[360px] animate-in slide-in-from-bottom-4 fade-in duration-300">
        <div className="bg-white rounded-[28px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden">
          {/* Content with generous padding */}
          <div className="px-7 pt-10 pb-8">
            {/* Icon with gradient background */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-100 via-amber-200 to-orange-200 flex items-center justify-center shadow-lg shadow-amber-200/50">
                  <Star className="w-10 h-10 text-amber-500 fill-amber-400 drop-shadow-sm" />
                </div>
                {/* Subtle glow effect */}
                <div className="absolute inset-0 w-20 h-20 rounded-full bg-gradient-to-br from-amber-300/20 to-orange-300/20 blur-xl -z-10" />
              </div>
            </div>

            {/* Typography with improved hierarchy */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">
                Gefällt dir Ditax?
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Dein Feedback hilft uns, Ditax zu verbessern.
              </p>
            </div>

            {/* Emoji Rating with premium styling */}
            <div className="flex justify-center gap-3 mb-8">
              {emojis.map((item) => (
                <button
                  key={item.value}
                  onClick={() => setSelectedRating(item.value)}
                  className={cn(
                    "w-14 h-14 rounded-full text-2xl transition-all duration-200 flex items-center justify-center",
                    "shadow-sm hover:shadow-md active:scale-95",
                    selectedRating === item.value 
                      ? 'bg-gradient-to-br from-blue-50 to-blue-100 ring-2 ring-blue-400 scale-110 shadow-lg shadow-blue-200/50' 
                      : 'bg-slate-50 hover:bg-slate-100 hover:scale-105'
                  )}
                  title={item.label}
                  aria-label={item.label}
                >
                  {item.emoji}
                </button>
              ))}
            </div>

            {/* Actions with premium button styling */}
            <div className="space-y-3">
              {/* Primary Button - Gradient pill with floating effect */}
              <button
                onClick={handleFeedback}
                className="w-full h-12 rounded-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
              >
                Feedback geben
              </button>
              
              {/* Secondary Button - Subtle outline */}
              <button
                onClick={handleDismiss}
                className="w-full h-11 rounded-full border border-slate-200 text-slate-500 font-medium text-sm hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all duration-200"
              >
                Später
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};