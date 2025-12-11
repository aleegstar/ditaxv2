import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { TrackingProgressSteps } from '@/components/tax-tracking/TrackingProgressSteps';
import { ExpressUpgradeCard } from '@/components/tax-tracking/ExpressUpgradeCard';
import { useToast } from '@/hooks/use-toast';

import { format, addDays, addBusinessDays } from 'date-fns';
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

      // Fetch tax return data
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

      // Fetch profile data
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
      const baseDate = taxReturn.payment_date 
        ? new Date(taxReturn.payment_date)
        : new Date(taxReturn.created_at);
      
      const deliveryDate = addBusinessDays(baseDate, 10);
      return format(deliveryDate, 'dd. MMMM yyyy', { locale: de });
    }
    
    // For standard service, don't show specific date as it varies
    return 'Variierende Bearbeitungszeit';
  };

  const getPlacedDate = () => {
    if (!taxReturn) return '';
    
    const date = taxReturn.payment_date 
      ? new Date(taxReturn.payment_date)
      : new Date(taxReturn.created_at);
    
    return format(date, 'dd. MMMM yyyy · HH:mm', { locale: de });
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
    return <div className="min-h-screen bg-gray-50" />;
  }

  if (!taxReturn || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <SubpageHeader
        title={`Steuererklärung ${taxReturn.tax_year}`}
        onBack={() => navigate('/')}
      />

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* User Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium text-gray-900">
                  {profile.first_name} {profile.last_name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Steuerjahr</p>
                <p className="font-medium text-gray-900">{taxReturn.tax_year}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Service</p>
                <p className="font-medium text-gray-900">
                  {taxReturn.express_service ? 'Express-Service' : 'Standard-Service'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Voraussichtliche Lieferung</p>
                <p className="font-medium text-gray-900">{getEstimatedDeliveryDate()}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium text-primary">{getStatusText()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Tracking */}
        <Card>
          <CardContent className="pt-6">
            <TrackingProgressSteps workflowStep={taxReturn.workflow_step} />
          </CardContent>
        </Card>

        {/* Express Upgrade Card */}
        <ExpressUpgradeCard
          taxReturnId={taxReturn.id}
          currentExpressService={taxReturn.express_service}
        />
      </div>
    </div>
  );
}
