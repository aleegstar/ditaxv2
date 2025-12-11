import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign } from "lucide-react";


export const UpdatePaymentStatusForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [taxYear, setTaxYear] = useState('');
  const [loading, setLoading] = useState(false);

  const directAdminUpdate = async () => {
    // Direktes Admin-Update über RLS (Admins dürfen tax_returns updaten)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (profileError || !profile) {
      throw new Error('Benutzer nicht gefunden');
    }

    const commonFields = {
      payment_status: 'paid' as const,
      payment_date: new Date().toISOString(),
      status: 'processing' as const,
      workflow_step: 'in_creation' as const,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: updateError } = await supabase
      .from('tax_returns')
      .update(commonFields)
      .eq('user_id', profile.id)
      .eq('tax_year', taxYear)
      .select();

    if (updateError) {
      throw new Error(`Update fehlgeschlagen: ${updateError.message}`);
    }

    if (!updated || updated.length === 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('tax_returns')
        .insert({
          user_id: profile.id,
          tax_year: taxYear,
          express_service: false,
          ...commonFields,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Insert fehlgeschlagen: ${insertError.message}`);
      }

      return inserted;
    }

    return updated[0];
  };

  const handleUpdatePaymentStatus = async () => {
    if (!email || !taxYear) {
      toast.error('Bitte E-Mail und Steuerjahr eingeben');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-operations', {
        body: {
          operation: 'update_payment_status',
          data: {
            email,
            tax_year: taxYear,
          },
        },
      });

      // Wenn Edge Function fehlschlägt oder kein success zurückgibt, Fallback nutzen
      if (error || !(data && (data.success || data.result?.success))) {
        const result = await directAdminUpdate();
        toast.success(`Zahlungsstatus direkt gesetzt für ${email}, Jahr ${taxYear}`);
        setEmail('');
        setTaxYear('');
        return;
      }

      toast.success(`Zahlungsstatus erfolgreich aktualisiert für ${email}, Jahr ${taxYear}`);
      setEmail('');
      setTaxYear('');
    } catch (error: any) {
      console.error('Error updating payment status:', error);
      // Letzter Versuch: direkter Admin-Fallback
      try {
        await directAdminUpdate();
        toast.success(`Zahlungsstatus direkt gesetzt für ${email}, Jahr ${taxYear}`);
        setEmail('');
        setTaxYear('');
      } catch (inner: any) {
        console.error('Fallback failed:', inner);
        toast.error(inner.message || 'Fehler beim Aktualisieren des Zahlungsstatus');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Zahlungsstatus aktualisieren
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              E-Mail Adresse
            </label>
            <Input
              type="email"
              placeholder="benutzer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Steuerjahr
            </label>
            <Input
              type="text"
              placeholder="2024"
              value={taxYear}
              onChange={(e) => setTaxYear(e.target.value)}
              disabled={loading}
            />
          </div>

          <Button
            onClick={handleUpdatePaymentStatus}
            disabled={loading || !email || !taxYear}
            className="w-full"
          >
            {loading ? (
              <>
                <span className="ml-2">Aktualisiere...</span>
              </>
            ) : (
              'Status auf "Bezahlt" setzen'
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            Dies setzt den Status auf "bezahlt" und "in Bearbeitung" mit workflow_step "in_creation".
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
