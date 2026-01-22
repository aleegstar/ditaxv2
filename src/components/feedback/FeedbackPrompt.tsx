import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import {
  UnifiedAlertDialog,
  UnifiedAlertDialogContent,
  UnifiedAlertDialogHeader,
  UnifiedAlertDialogTitle,
  UnifiedAlertDialogDescription,
  UnifiedAlertDialogFooter,
  UnifiedAlertDialogAction,
  UnifiedAlertDialogCancel,
  UnifiedAlertDialogIcon,
} from '@/components/ui/unified-alert-dialog';

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
    // Navigate to feedback page with pre-selected rating if available
    if (selectedRating) {
      navigate(`/feedback?rating=${selectedRating}`);
    } else {
      navigate('/feedback');
    }
  };

  const handleDismiss = () => {
    onDismiss();
  };

  return (
    <UnifiedAlertDialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <UnifiedAlertDialogContent onClose={handleDismiss}>
        <UnifiedAlertDialogHeader>
          <UnifiedAlertDialogIcon variant="warning">
            <Star className="w-8 h-8 text-amber-500 fill-amber-500" />
          </UnifiedAlertDialogIcon>
          <UnifiedAlertDialogTitle>
            Gefällt dir Ditax?
          </UnifiedAlertDialogTitle>
          <UnifiedAlertDialogDescription>
            Dein Feedback hilft uns, Ditax zu verbessern.
          </UnifiedAlertDialogDescription>
        </UnifiedAlertDialogHeader>

        {/* Emoji Rating */}
        <div className="flex justify-center gap-2 py-4">
          {emojis.map((item) => (
            <button
              key={item.value}
              onClick={() => setSelectedRating(item.value)}
              className={`
                w-12 h-12 rounded-xl text-2xl transition-all duration-200
                flex items-center justify-center
                ${selectedRating === item.value 
                  ? 'bg-primary/10 ring-2 ring-primary scale-110' 
                  : 'bg-muted hover:bg-muted/80 hover:scale-105'
                }
              `}
              title={item.label}
            >
              {item.emoji}
            </button>
          ))}
        </div>

        <UnifiedAlertDialogFooter>
          <UnifiedAlertDialogAction onClick={handleFeedback} variant="primary">
            Feedback geben
          </UnifiedAlertDialogAction>
          <UnifiedAlertDialogCancel onClick={handleDismiss}>
            Später
          </UnifiedAlertDialogCancel>
        </UnifiedAlertDialogFooter>
      </UnifiedAlertDialogContent>
    </UnifiedAlertDialog>
  );
};
