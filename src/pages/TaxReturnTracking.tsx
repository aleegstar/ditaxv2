import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { TrackingProgressSteps } from '@/components/tax-tracking/TrackingProgressSteps';
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
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
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
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Fetch tax return data
      const {
        data: taxReturnData,
        error: taxReturnError
      } = await supabase.from('tax_returns').select('*').eq('id', id).eq('user_id', user.id).single();
      if (taxReturnError) throw taxReturnError;
      if (!taxReturnData) {
        throw new Error('Tax return not found');
      }
      setTaxReturn(taxReturnData);

      // Fetch profile data
      const {
        data: profileData,
        error: profileError
      } = await supabase.from('profiles').select('first_name, last_name, email').eq('id', user.id).single();
      if (profileError) throw profileError;
      setProfile(profileData);
    } catch (error) {
      console.error('Error fetching tax return data:', error);
      toast({
        title: 'Fehler',
        description: 'Steuererklärung konnte nicht geladen werden.',
        variant: 'destructive'
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };
  const getEstimatedDeliveryDate = () => {
    if (!taxReturn) return '';

    // For express service, show specific date (10 business days from payment)
    if (taxReturn.express_service) {
      const baseDate = taxReturn.payment_date ? new Date(taxReturn.payment_date) : new Date(taxReturn.created_at);
      const deliveryDate = addBusinessDays(baseDate, 10);
      return format(deliveryDate, 'dd. MMMM yyyy', {
        locale: de
      });
    }

    // For standard service, don't show specific date as it varies
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
  return <div className="min-h-screen bg-white text-slate-700 antialiased flex justify-center">
      {/* Main Container - wider on desktop */}
      <div className="w-full max-w-[480px] md:max-w-2xl lg:max-w-3xl min-h-screen bg-white relative flex flex-col overflow-hidden">

        {/* Sticky Header */}
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors group bg-slate-50 border border-slate-200">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <h1 className="text-sm font-semibold text-slate-800 tracking-tight">Steuererklärung {taxReturn.tax_year}</h1>
          <div className="w-9 h-9" /> {/* Spacer for centering */}
        </header>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto pb-10">
          
          {/* Info Grid */}
          <div className="p-6 pb-2">
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <div className="text-[11px] font-medium text-slate-400 mb-1">Name</div>
                <div className="text-sm font-medium text-slate-800">{profile.first_name}</div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-slate-400 mb-1">Steuerjahr</div>
                <div className="text-sm font-medium text-slate-800">{taxReturn.tax_year}</div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-slate-400 mb-1">Service</div>
                <div className="text-sm font-medium text-slate-800">
                  {taxReturn.express_service ? 'Express-Service' : 'Standard-Service'}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-slate-400 mb-1">Voraussichtliche Lieferung</div>
                <div className="text-sm font-medium text-slate-800">{getEstimatedDeliveryDate()}</div>
              </div>
              <div className="col-span-2">
                <div className="text-[11px] font-medium text-slate-400 mb-1">Status</div>
                <button className="text-sm font-medium text-[#1D64FF] hover:text-blue-600 transition-colors flex items-center gap-1.5">
                  {getStatusText()}
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </button>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-200 mx-6 my-4" />

          {/* Timeline Section */}
          <TrackingProgressSteps workflowStep={taxReturn.workflow_step} />

          {/* Express Upgrade Card */}
          <ExpressUpgradeCard taxReturnId={taxReturn.id} currentExpressService={taxReturn.express_service} />

          {/* Bottom Spacer */}
          <div className="h-6" />
        </div>
      </div>
    </div>;
}