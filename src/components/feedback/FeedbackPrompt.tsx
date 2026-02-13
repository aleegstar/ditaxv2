import React, { useState } from 'react';
import { Star, Bug, Lightbulb, Heart, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useI18n } from '@/contexts/I18nContext';
import { Checkbox } from '@/components/ui/checkbox';

interface FeedbackPromptProps {
  isOpen: boolean;
  onDismiss: () => void;
}

const categories = [
  { value: 'bug', icon: Bug },
  { value: 'feature', icon: Lightbulb },
  { value: 'praise', icon: Heart },
] as const;

export const FeedbackPrompt: React.FC<FeedbackPromptProps> = ({
  isOpen,
  onDismiss,
}) => {
  const { t } = useI18n();
  const [rating, setRating] = useState<number>(0);
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [contactConsent, setContactConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoryLabels: Record<string, string> = {
    bug: t.feedbackPage.categoryBug,
    feature: t.feedbackPage.categoryFeature,
    praise: t.feedbackPage.categoryPraise,
  };

  const handleSubmit = async () => {
    if (!rating) {
      toast({
        title: t.feedbackPage.ratingRequired,
        description: t.feedbackPage.ratingRequiredDescription,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: t.feedbackPage.notLoggedIn, description: t.feedbackPage.notLoggedInDescription, variant: 'destructive' });
        return;
      }

      const { error } = await supabase
        .from('user_feedback')
        .insert({
          user_id: user.id,
          user_email: user.email,
          rating,
          feature_request: comment.trim() || null,
          feedback_category: selectedCategory,
          contact_consent: contactConsent,
        } as any);

      if (error) throw error;

      toast({ title: t.feedbackPage.successToast, description: t.feedbackPage.successToastDescription });
      onDismiss();
    } catch (error) {
      console.error('Feedback submission error:', error);
      toast({ title: t.feedbackPage.error, description: t.feedbackPage.errorDescription, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[101] animate-in fade-in duration-200"
        onClick={onDismiss}
      />

      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-[calc(100%-2rem)] max-w-[420px] animate-in zoom-in-95 fade-in duration-300">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 pt-8 pb-6 space-y-6">
            {/* Header */}
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground tracking-tight">
                {t.feedbackPage.promptTitle}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t.feedbackPage.promptSubtitle}
              </p>
            </div>

            {/* Star Rating */}
            <div className="space-y-2">
              <div className="flex justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform duration-150 hover:scale-110 active:scale-95"
                  >
                    <Star
                      className={cn(
                        'w-8 h-8 transition-colors duration-150',
                        (hoveredStar || rating) >= star
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-300'
                      )}
                    />
                  </button>
                ))}
              </div>
              <div className="flex justify-between px-1">
                <span className="text-xs text-muted-foreground">{t.feedbackPage.ratingLabelLeft}</span>
                <span className="text-xs text-muted-foreground">{t.feedbackPage.ratingLabelRight}</span>
              </div>
            </div>

            {/* Quick Tags */}
            <div className="flex gap-2 justify-center">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = selectedCategory === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setSelectedCategory(isActive ? null : cat.value)}
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200',
                      isActive
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'bg-white border-border text-muted-foreground hover:bg-muted hover:border-slate-300'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {categoryLabels[cat.value]}
                  </button>
                );
              })}
            </div>

            {/* Textarea */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {t.feedbackPage.improvementLabel}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t.feedbackPage.improvementPlaceholder}
                maxLength={1000}
                className="w-full min-h-[80px] rounded-xl border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-colors"
              />
            </div>

            {/* Contact Consent */}
            <div className="flex items-start gap-2.5">
              <Checkbox
                id="contact-consent-prompt"
                checked={contactConsent}
                onCheckedChange={(checked) => setContactConsent(checked === true)}
                className="mt-0.5"
              />
              <label htmlFor="contact-consent-prompt" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                {t.feedbackPage.contactConsent}
              </label>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onDismiss}
                className="flex-1 h-11 rounded-xl border border-border text-muted-foreground font-medium text-sm hover:bg-muted active:scale-[0.98] transition-all duration-200"
              >
                {t.feedbackPage.laterButton}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !rating}
                className="flex-1 h-11 rounded-xl bg-gradient-to-b from-primary to-blue-600 text-primary-foreground font-semibold text-sm shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  t.feedbackPage.sendButton
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
