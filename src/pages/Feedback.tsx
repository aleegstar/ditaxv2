import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Check, Star, Bug, Lightbulb, Heart, Loader2 } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { Checkbox } from '@/components/ui/checkbox';

const categories = [
  { value: 'bug', icon: Bug },
  { value: 'feature', icon: Lightbulb },
  { value: 'praise', icon: Heart },
] as const;

const Feedback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useI18n();

  const [rating, setRating] = useState<number>(0);
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [contactConsent, setContactConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const categoryLabels: Record<string, string> = {
    bug: t.feedbackPage.categoryBug,
    feature: t.feedbackPage.categoryFeature,
    praise: t.feedbackPage.categoryPraise,
  };

  useEffect(() => {
    const preRating = searchParams.get('rating');
    if (preRating) {
      const parsed = parseInt(preRating, 10);
      if (parsed >= 1 && parsed <= 5) setRating(parsed);
    }
  }, [searchParams]);

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
        toast({
          title: t.feedbackPage.notLoggedIn,
          description: t.feedbackPage.notLoggedInDescription,
          variant: 'destructive',
        });
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

      setIsSubmitted(true);
      toast({
        title: t.feedbackPage.successToast,
        description: t.feedbackPage.successToastDescription,
      });
    } catch (error: any) {
      console.error('Feedback submission error:', error);
      toast({
        title: t.feedbackPage.error,
        description: t.feedbackPage.errorDescription,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen">
        <SubpageHeader title={t.feedbackPage.title} onBack={() => navigate(-1)} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground">
              {t.feedbackPage.thankYouTitle}
            </h2>
            <p className="text-muted-foreground max-w-md">
              {t.feedbackPage.thankYouMessage}
            </p>
            <Button onClick={() => navigate('/')} className="mt-4">
              {t.feedbackPage.backToHome}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SubpageHeader title={t.feedbackPage.title} onBack={() => navigate(-1)} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="space-y-8">
          {/* Star Rating */}
          <div className="space-y-3">
            <h2 className="text-lg font-medium text-foreground text-center">
              {t.feedbackPage.satisfactionQuestion}
            </h2>
            <div className="flex justify-center gap-2">
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
                      'w-9 h-9 sm:w-10 sm:h-10 transition-colors duration-150',
                      (hoveredStar || rating) >= star
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-300'
                    )}
                  />
                </button>
              ))}
            </div>
            <div className="flex justify-between px-2">
              <span className="text-xs text-muted-foreground">{t.feedbackPage.ratingLabelLeft}</span>
              <span className="text-xs text-muted-foreground">{t.feedbackPage.ratingLabelRight}</span>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Quick Tags */}
          <div className="space-y-3">
            <div className="flex gap-2 justify-center flex-wrap">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = selectedCategory === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setSelectedCategory(isActive ? null : cat.value)}
                    className={cn(
                      'flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-medium border transition-all duration-200',
                      isActive
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'bg-background border-border text-muted-foreground hover:bg-muted hover:border-slate-300'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {categoryLabels[cat.value]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Textarea */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              {t.feedbackPage.improvementLabel}
              <span className="text-muted-foreground font-normal ml-1">{t.feedbackPage.featureRequestOptional}</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t.feedbackPage.improvementPlaceholder}
              className="w-full min-h-[120px] rounded-xl border border-border bg-background px-3.5 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-colors"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/1000
            </p>
          </div>

          {/* Contact Consent */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="contact-consent"
              checked={contactConsent}
              onCheckedChange={(checked) => setContactConsent(checked === true)}
              className="mt-0.5"
            />
            <label htmlFor="contact-consent" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
              {t.feedbackPage.contactConsent}
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex-1 rounded-xl h-11"
            >
              {t.feedbackPage.laterButton}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!rating || isSubmitting}
              className="flex-1 rounded-xl h-11"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t.feedbackPage.sendButton
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Feedback;
