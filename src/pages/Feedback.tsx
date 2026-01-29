import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

const Feedback = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  
  const emojis = [
    { value: 1, emoji: '😢', label: t.feedbackPage.ratings.veryUnsatisfied },
    { value: 2, emoji: '😕', label: t.feedbackPage.ratings.unsatisfied },
    { value: 3, emoji: '😐', label: t.feedbackPage.ratings.neutral },
    { value: 4, emoji: '🙂', label: t.feedbackPage.ratings.satisfied },
    { value: 5, emoji: '😍', label: t.feedbackPage.ratings.verySatisfied }
  ];

  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [featureRequest, setFeatureRequest] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selectedRating) {
      toast({
        title: t.feedbackPage.ratingRequired,
        description: t.feedbackPage.ratingRequiredDescription,
        variant: 'destructive'
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
          variant: 'destructive'
        });
        return;
      }

      const { error } = await supabase
        .from('user_feedback')
        .insert({
          user_id: user.id,
          user_email: user.email,
          rating: selectedRating,
          feature_request: featureRequest.trim() || null
        });

      if (error) throw error;

      setIsSubmitted(true);
      toast({
        title: t.feedbackPage.successToast,
        description: t.feedbackPage.successToastDescription
      });

    } catch (error: any) {
      console.error('Feedback submission error:', error);
      toast({
        title: t.feedbackPage.error,
        description: t.feedbackPage.errorDescription,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-white">
        <SubpageHeader 
          title={t.feedbackPage.title}
          onBack={() => navigate(-1)} 
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
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
            <Button 
              onClick={() => navigate('/')}
              className="mt-4"
            >
              {t.feedbackPage.backToHome}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <SubpageHeader 
        title={t.feedbackPage.title}
        onBack={() => navigate(-1)} 
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="space-y-8">
          {/* Rating Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-foreground text-center">
              {t.feedbackPage.satisfactionQuestion}
            </h2>
            
            <div className="flex justify-center gap-3 sm:gap-6">
              {emojis.map((item) => (
                <button
                  key={item.value}
                  onClick={() => setSelectedRating(item.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl transition-all duration-200',
                    selectedRating === item.value
                      ? 'bg-primary/10 ring-2 ring-primary scale-110'
                      : 'hover:bg-muted hover:scale-105'
                  )}
                  aria-label={item.label}
                >
                  <span className="text-3xl sm:text-4xl">{item.emoji}</span>
                  <span className={cn(
                    'text-xs text-muted-foreground hidden sm:block',
                    selectedRating === item.value && 'text-primary font-medium'
                  )}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Feature Request Section */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              {t.feedbackPage.featureRequestLabel}
              <span className="text-muted-foreground font-normal ml-1">{t.feedbackPage.featureRequestOptional}</span>
            </label>
            <Textarea
              value={featureRequest}
              onChange={(e) => setFeatureRequest(e.target.value)}
              placeholder={t.feedbackPage.featureRequestPlaceholder}
              className="min-h-[120px] resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {featureRequest.length}/1000
            </p>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!selectedRating || isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? t.feedbackPage.submitting : t.feedbackPage.submitButton}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Feedback;
