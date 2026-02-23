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
    return <div className="min-h-screen bg-white" />;
  }

  if (!taxReturn || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white text-slate-600 antialiased">
      <SubpageHeader 
        title={`Steuererklärung ${taxReturn.tax_year}`} 
        onBack={() => navigate('/')} 
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">

        {/* Glassy Detail Card */}
        <div className="relative mb-16">
          {/* Decorative blur */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-50 to-slate-50 rounded-[2.5rem] blur-2xl opacity-50 -z-10" />

          <div className="bg-white/60 backdrop-blur-xl border border-slate-100 rounded-[2rem] p-8 md:p-10 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.06)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-12">
              {/* Name */}
              <div className="space-y-2">
                <span className="block text-sm font-medium text-slate-400">Name</span>
                <p className="text-lg text-slate-900 font-medium tracking-tight">{profile.first_name}</p>
              </div>

              {/* Steuerjahr */}
              <div className="space-y-2">
                <span className="block text-sm font-medium text-slate-400">Steuerjahr</span>
                <p className="text-lg text-slate-900 font-medium tracking-tight">{taxReturn.tax_year}</p>
              </div>

              {/* Service */}
              <div className="space-y-2">
                <span className="block text-sm font-medium text-slate-400">Service</span>
                <div className="flex items-center gap-2">
                  {taxReturn.express_service && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                    </span>
                  )}
                  <p className="text-lg text-slate-900 font-medium tracking-tight">
                    {taxReturn.express_service ? 'Express-Service' : 'Standard-Service'}
                  </p>
                </div>
              </div>

              {/* Lieferung */}
              <div className="space-y-2">
                <span className="block text-sm font-medium text-slate-400">Voraussichtliche Lieferung</span>
                <p className="text-lg text-slate-900 font-medium tracking-tight">{getEstimatedDeliveryDate()}</p>
              </div>

              {/* Status */}
              <div className="md:col-span-2 space-y-2">
                <span className="block text-sm font-medium text-slate-400">Status</span>
                <button className="inline-flex items-center gap-1.5 text-lg text-blue-600 font-medium tracking-tight hover:text-blue-700 hover:gap-2 transition-all group">
                  {getStatusText()}
                  <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
            </div>
          </div>
        </div>

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
