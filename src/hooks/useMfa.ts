import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MfaFactor {
  id: string;
  friendly_name?: string;
  factor_type: 'totp' | 'phone';
  status: 'verified' | 'unverified';
}

interface MfaEnrollResponse {
  id: string;
  type: 'totp';
  totp: {
    qr_code: string;
    secret: string;
    uri: string;
  };
}

export const useMfa = () => {
  const [factors, setFactors] = useState<MfaFactor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState<MfaEnrollResponse | null>(null);

  const loadFactors = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const totpFactors = (data?.totp || []).map(factor => ({
        id: factor.id,
        friendly_name: factor.friendly_name,
        factor_type: factor.factor_type as 'totp' | 'phone',
        status: factor.status as 'verified' | 'unverified'
      }));
      setFactors(totpFactors);
    } catch (error) {
      console.error('Error loading MFA factors:', error);
    }
  };

  const startEnrollment = async (friendlyName?: string) => {
    setIsLoading(true);
    try {
      // Generate unique name to avoid conflicts
      const uniqueName = friendlyName || `Authenticator ${new Date().toLocaleDateString('de-CH')} ${Date.now().toString().slice(-4)}`;
      
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: uniqueName
      });

      if (error) throw error;
      setEnrollmentData(data);
      return data;
    } catch (error) {
      console.error('Error starting MFA enrollment:', error);
      toast.error('Fehler beim Starten der MFA-Einrichtung');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEnrollment = async (factorId: string, code: string) => {
    setIsLoading(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code
      });

      if (verify.error) throw verify.error;

      // Update profile to mark MFA as enabled
      await supabase
        .from('profiles')
        .update({ mfa_enabled: true })
        .eq('id', (await supabase.auth.getUser()).data.user?.id);

      toast.success('MFA erfolgreich eingerichtet!');
      setEnrollmentData(null);
      await loadFactors();
      return verify.data;
    } catch (error) {
      console.error('Error verifying MFA enrollment:', error);
      toast.error('Ungültiger Code. Bitte versuchen Sie es erneut.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const unenrollFactor = async (factorId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;

      // Check if any factors remain
      const { data } = await supabase.auth.mfa.listFactors();
      const remainingFactors = data?.totp || [];

      if (remainingFactors.length === 0) {
        // Update profile to mark MFA as disabled
        await supabase
          .from('profiles')
          .update({ mfa_enabled: false })
          .eq('id', (await supabase.auth.getUser()).data.user?.id);
      }

      toast.success('MFA-Gerät entfernt');
      await loadFactors();
    } catch (error) {
      console.error('Error unenrolling MFA factor:', error);
      toast.error('Fehler beim Entfernen des MFA-Geräts');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const createChallenge = async (factorId: string) => {
    try {
      const { data, error } = await supabase.auth.mfa.challenge({ factorId });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating MFA challenge:', error);
      throw error;
    }
  };

  const verifyChallenge = async (factorId: string, challengeId: string, code: string) => {
    try {
      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error verifying MFA challenge:', error);
      throw error;
    }
  };

  useEffect(() => {
    loadFactors();
  }, []);

  return {
    factors,
    isLoading,
    enrollmentData,
    startEnrollment,
    verifyEnrollment,
    unenrollFactor,
    createChallenge,
    verifyChallenge,
    loadFactors
  };
};