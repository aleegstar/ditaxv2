import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink } from 'lucide-react';
import { TrackingProgressSteps } from '@/components/tax-tracking/TrackingProgressSteps';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { ExpressUpgradeCard } from '@/components/tax-tracking/ExpressUpgradeCard';
import { useToast } from '@/hooks/use-toast';
import { format, addBusinessDays } from 'date-fns';
import { de } from 'date-fns/locale';

interface TaxReturnData {
  id: string;
  user_id: string;
  tax_year: string;
  status: string;
  payment_status: string;
  workflow_step: string;
  express_service: boolean;
  payment_date: string | null;
  created_at: string;
}

interface ProfileData {
  first_name: string;
  last_name: string;
  email: string;
}

export default function TaxReturnTracking() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [taxReturn, setTaxReturn] = useState<TaxReturnData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    fetchTaxReturnData();
  }, [id]);

  const fetchTaxReturnData = async () => {
    try {
      if (!id) {
        throw new Error('Tax return ID is required');
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      const { data: taxReturnData, error: taxReturnError } = await supabase
        .from('tax_returns')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
      if (taxReturnError) throw taxReturnError;
      if (!taxReturnData) {
        throw new Error('Tax return not found');
      }
      setTaxReturn(taxReturnData);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single();
      if (profileError) throw profileError;
      setProfile(profileData);
    } catch (error) {
      console.error('Error fetching tax return data:', error);
      toast({
        title: 'Fehler',
        description: 'Steuererklärung konnte nicht geladen werden.',
        variant: 'destructive',
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const getEstimatedDeliveryDate = () => {
    if (!taxReturn) return '';
    if (taxReturn.express_service) {
      const baseDate = taxReturn.payment_date
        ? new Date(taxReturn.payment_date)
        : new Date(taxReturn.created_at);
      const deliveryDate = addBusinessDays(baseDate, 10);
      return format(deliveryDate, 'dd. MMMM yyyy', { locale: de });
    }
    return 'Variierende Bearbeitungszeit';
  };

  const getStatusText = () => {
    if (!taxReturn) return '';
    switch (taxReturn.workflow_step) {
      case 'in_creation':
        return 'In Bearbeitung';
      case 'completed':
        return 'Abgeschlossen';
      default:
        return 'Eingereicht';
    }
  };

  if (loading) {
    return <div className="min-h-screen" />;
  }

  if (!taxReturn || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen text-foreground antialiased">
      <SubpageHeader 
        title={`Steuererklärung ${taxReturn.tax_year}`} 
        onBack={() => navigate('/')} 
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

        {/* Timeline */}
        <TrackingProgressSteps workflowStep={taxReturn.workflow_step} />

        {/* Express Upgrade */}
        <div className="mt-16">
          <ExpressUpgradeCard
            taxReturnId={taxReturn.id}
            currentExpressService={taxReturn.express_service}
          />
        </div>
      </div>
    </div>
  );
}
