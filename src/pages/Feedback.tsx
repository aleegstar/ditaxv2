import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Check, Star, Bug, Lightbulb, Heart, Loader2, Sparkles } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { Checkbox } from '@/components/ui/checkbox';

const categories = [
  { value: 'praise',  label: 'Der Ablauf gefällt mir', icon: Heart },
  { value: 'feature', label: 'Ich habe eine Idee',     icon: Lightbulb },
  { value: 'bug',     label: 'Ich habe einen Fehler gefunden', icon: Bug },
] as const;

const ratingCopy: Record<number, { headline: string; sub: string }> = {
  1: { headline: 'Das tut uns leid.',           sub: 'Erzähl uns kurz, was schiefgelaufen ist — wir kümmern uns darum.' },
  2: { headline: 'Da ist Luft nach oben.',      sub: 'Was hätte deine Erfahrung besser gemacht?' },
  3: { headline: 'Okay, aber nicht ganz da.',   sub: 'Was würdest du als Erstes verbessern?' },
  4: { headline: 'Schön, dass es gefällt.',     sub: 'Was würde es noch besser machen?' },
  5: { headline: 'Das freut uns sehr.',         sub: 'Gibt es etwas, das du besonders schätzt — oder das noch fehlt?' },
};

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
        <div className="max-w-xl mx-auto px-6 py-20 sm:py-28 animate-fade-in">
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 ring-1 ring-emerald-200 flex items-center justify-center mb-6 animate-scale-in">
              <Check className="w-6 h-6 text-emerald-600" strokeWidth={2.25} />
            </div>
            <h2 className="text-[26px] font-semibold text-foreground tracking-[-0.022em] leading-tight mb-3">
              {t.feedbackPage.thankYouTitle}
            </h2>
            <p className="text-[14.5px] text-muted-foreground max-w-sm leading-relaxed">
              {t.feedbackPage.thankYouMessage}
            </p>
            <Button onClick={() => navigate('/')} className="mt-10">
              {t.feedbackPage.backToHome}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const activeStar = hoveredStar || rating;
  const copy = activeStar > 0 ? ratingCopy[activeStar] : null;

  return (
    <div className="min-h-screen">
      <SubpageHeader title={t.feedbackPage.title} onBack={() => navigate(-1)} />

      <div className="max-w-xl mx-auto px-6 pt-10 pb-16 sm:pt-14">
        {/* Hero */}
        <div className="text-center mb-10 sm:mb-14">
          <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-muted-foreground/60 inline-flex items-center gap-1.5 mb-3">
            <Sparkles className="w-3 h-3" strokeWidth={2.25} />
            Dein Feedback
          </p>
          <h1 className="text-[28px] sm:text-[32px] font-semibold text-foreground tracking-[-0.026em] leading-[1.1] max-w-md mx-auto">
            Wie war deine Erfahrung mit Ditax?
          </h1>
          <p className="text-[14.5px] text-muted-foreground mt-3 max-w-sm mx-auto leading-relaxed">
            Jede Stimme hilft uns, die Schweizer Steuererklärung ein Stück einfacher zu machen.
          </p>
        </div>

        {/* Star rating — visual centerpiece */}
        <div className="flex flex-col items-center mb-12">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-5">
            {[1, 2, 3, 4, 5].map((star) => {
              const filled = activeStar >= star;
              return (
                <button
                  key={star}
                  type="button"
                  aria-label={`${star} Sterne`}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  onClick={() => setRating(star)}
                  className="p-1.5 rounded-full transition-transform duration-200 hover:scale-110 active:scale-95"
                  style={{ transitionDelay: filled ? `${(star - 1) * 30}ms` : '0ms' }}
                >
                  <Star
                    className={cn(
                      'w-11 h-11 sm:w-12 sm:h-12 transition-all duration-200',
                      filled
                        ? 'text-amber-400 fill-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.35)]'
                        : 'text-muted-foreground/25 fill-transparent'
                    )}
                    strokeWidth={1.5}
                  />
                </button>
              );
            })}
          </div>

          <div className="h-12 flex flex-col items-center justify-center">
            {copy ? (
              <div key={activeStar} className="text-center animate-fade-in">
                <p className="text-[15px] font-medium text-foreground tracking-[-0.008em]">
                  {copy.headline}
                </p>
                <p className="text-[12.5px] text-muted-foreground mt-1 max-w-xs">
                  {copy.sub}
                </p>
              </div>
            ) : (
              <p className="text-[12.5px] text-muted-foreground/70">
                Tippe einen Stern, um zu starten
              </p>
            )}
          </div>
        </div>

        {/* Reveal the rest only after a rating */}
        <div
          className={cn(
            'transition-all duration-500',
            rating > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
          )}
        >
          {/* Category chips */}
          <div className="mb-8">
            <p className="text-[13px] font-medium text-foreground/80 mb-3">
              Was beschreibt es am besten?
            </p>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = selectedCategory === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setSelectedCategory(isActive ? null : cat.value)}
                    className={cn(
                      'inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-[13px] font-medium transition-all duration-200 border',
                      isActive
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/30'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comment */}
          <div className="mb-7">
            <label htmlFor="feedback-comment" className="block text-[13px] font-medium text-foreground/80 mb-2">
              Erzähl uns mehr
              <span className="text-muted-foreground/65 font-normal ml-1.5">— optional</span>
            </label>
            <div className="relative rounded-2xl bg-muted/40 focus-within:bg-white focus-within:ring-1 focus-within:ring-border focus-within:shadow-sm transition-all">
              <textarea
                id="feedback-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Was hätte deine Erfahrung verbessert?"
                className="w-full min-h-[128px] rounded-2xl bg-transparent px-4 py-3.5 text-[14px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none resize-none leading-relaxed"
                maxLength={1000}
              />
              <p className="absolute bottom-2.5 right-3.5 text-[10.5px] text-muted-foreground/55 tabular-nums">
                {comment.length}/1000
              </p>
            </div>
          </div>

          {/* Contact consent */}
          <label htmlFor="contact-consent" className="flex items-start gap-3 mb-10 cursor-pointer group">
            <Checkbox
              id="contact-consent"
              checked={contactConsent}
              onCheckedChange={(checked) => setContactConsent(checked === true)}
              className="mt-0.5"
            />
            <span className="text-[13px] text-muted-foreground leading-relaxed group-hover:text-foreground/80 transition-colors">
              {t.feedbackPage.contactConsent}
            </span>
          </label>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-[13.5px] font-medium text-muted-foreground hover:text-foreground transition-colors h-11 px-3"
            >
              Später vielleicht
            </button>
            <Button
              onClick={handleSubmit}
              disabled={!rating || isSubmitting}
              className="min-w-[160px]"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Feedback senden'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Feedback;
