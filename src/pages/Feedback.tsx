import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

const emojis = [
  { value: 1, emoji: '😢', label: 'Sehr unzufrieden' },
  { value: 2, emoji: '😕', label: 'Unzufrieden' },
  { value: 3, emoji: '😐', label: 'Neutral' },
  { value: 4, emoji: '🙂', label: 'Zufrieden' },
  { value: 5, emoji: '😍', label: 'Sehr zufrieden' }
];

const Feedback = () => {
  const navigate = useNavigate();
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [featureRequest, setFeatureRequest] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selectedRating) {
      toast({
        title: 'Bewertung fehlt',
        description: 'Bitte wähle eine Bewertung aus.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'Nicht angemeldet',
          description: 'Bitte melde dich an, um Feedback zu geben.',
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
        title: 'Vielen Dank! 🎉',
        description: 'Dein Feedback wurde erfolgreich übermittelt.'
      });

    } catch (error: any) {
      console.error('Feedback submission error:', error);
      toast({
        title: 'Fehler',
        description: 'Beim Senden ist ein Fehler aufgetreten. Bitte versuche es erneut.',
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
          title="Feedback" 
          onBack={() => navigate(-1)} 
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-slate-900">
              Vielen Dank für dein Feedback!
            </h2>
            <p className="text-slate-600 max-w-md">
              Deine Meinung hilft uns, Ditax stetig zu verbessern.
            </p>
            <Button 
              onClick={() => navigate('/')}
              className="mt-4"
            >
              Zurück zur Startseite
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <SubpageHeader 
        title="Feedback" 
        onBack={() => navigate(-1)} 
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="space-y-8">
          {/* Rating Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-slate-900 text-center">
              Wie zufrieden bist du mit Ditax?
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
                      : 'hover:bg-slate-100 hover:scale-105'
                  )}
                  aria-label={item.label}
                >
                  <span className="text-3xl sm:text-4xl">{item.emoji}</span>
                  <span className={cn(
                    'text-xs text-slate-500 hidden sm:block',
                    selectedRating === item.value && 'text-primary font-medium'
                  )}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200" />

          {/* Feature Request Section */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Welche Funktionen wünschst du dir? 
              <span className="text-slate-400 font-normal ml-1">(optional)</span>
            </label>
            <Textarea
              value={featureRequest}
              onChange={(e) => setFeatureRequest(e.target.value)}
              placeholder="z.B. Automatische Belegerfassung, iOS Widget, Export-Funktion..."
              className="min-h-[120px] resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-slate-400 text-right">
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
            {isSubmitting ? 'Wird gesendet...' : 'Feedback senden'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Feedback;
