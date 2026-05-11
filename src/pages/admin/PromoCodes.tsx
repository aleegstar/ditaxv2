import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Plus, Tag, Power } from 'lucide-react';
import { AdminWelcomeHeader } from '@/components/admin/AdminWelcomeHeader';

interface PromoCode {
  id: string;
  code: string;
  active: boolean;
  created: number;
  expires_at: number | null;
  max_redemptions: number | null;
  times_redeemed: number;
  coupon: {
    id: string;
    name: string | null;
    percent_off: number | null;
    amount_off: number | null;
    currency: string | null;
    duration: string;
  };
}

const PromoCodes: React.FC = () => {
  const { toast } = useToast();
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    code: '',
    name: '',
    discountType: 'percent' as 'percent' | 'amount',
    percentOff: 10,
    amountOff: 10,
    maxRedemptions: '',
    expiresAt: '',
  });

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-promo-codes', { method: 'GET' });
      if (error) throw error;
      setCodes(data?.promoCodes || []);
    } catch (e) {
      toast({ title: 'Fehler', description: e instanceof Error ? e.message : 'Konnte Codes nicht laden', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCodes(); }, []);

  const handleCreate = async () => {
    if (!form.code.trim()) {
      toast({ title: 'Code erforderlich', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        action: 'create',
        code: form.code.trim().toUpperCase(),
        name: form.name || form.code,
        discountType: form.discountType,
      };
      if (form.discountType === 'percent') payload.percentOff = Number(form.percentOff);
      else { payload.amountOff = Number(form.amountOff); payload.currency = 'chf'; }
      if (form.maxRedemptions) payload.maxRedemptions = Number(form.maxRedemptions);
      if (form.expiresAt) payload.expiresAt = Math.floor(new Date(form.expiresAt).getTime() / 1000);

      const { data, error } = await supabase.functions.invoke('admin-promo-codes', { body: payload });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Aktionscode erstellt', description: form.code.toUpperCase() });
      setDialogOpen(false);
      setForm({ code: '', name: '', discountType: 'percent', percentOff: 10, amountOff: 10, maxRedemptions: '', expiresAt: '' });
      fetchCodes();
    } catch (e) {
      toast({ title: 'Fehler', description: e instanceof Error ? e.message : 'Erstellung fehlgeschlagen', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (promoCodeId: string) => {
    if (!confirm('Diesen Aktionscode wirklich deaktivieren?')) return;
    try {
      const { data, error } = await supabase.functions.invoke('admin-promo-codes', {
        body: { action: 'deactivate', promoCodeId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Deaktiviert' });
      fetchCodes();
    } catch (e) {
      toast({ title: 'Fehler', description: e instanceof Error ? e.message : 'Fehlgeschlagen', variant: 'destructive' });
    }
  };

  const formatDiscount = (c: PromoCode) => {
    if (c.coupon.percent_off) return `${c.coupon.percent_off}%`;
    if (c.coupon.amount_off) return `${(c.coupon.amount_off / 100).toFixed(2)} ${c.coupon.currency?.toUpperCase()}`;
    return '–';
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <AdminWelcomeHeader title="Aktionscodes" subtitle="Aktive Stripe Promotion Codes verwalten" />

      <div className="flex items-center justify-end gap-2 mt-6 mb-4">
        <Button variant="outline" size="sm" onClick={fetchCodes} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-2" />Neuer Code</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Neuen Aktionscode erstellen</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Code</Label>
                <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="z.B. SOMMER25" />
              </div>
              <div>
                <Label>Name (optional)</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Interne Beschreibung" />
              </div>
              <div>
                <Label>Rabatt-Typ</Label>
                <Select value={form.discountType} onValueChange={(v: 'percent' | 'amount') => setForm({ ...form, discountType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Prozent (%)</SelectItem>
                    <SelectItem value="amount">Fester Betrag (CHF)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.discountType === 'percent' ? (
                <div>
                  <Label>Rabatt in %</Label>
                  <Input type="number" min={1} max={100} value={form.percentOff} onChange={e => setForm({ ...form, percentOff: Number(e.target.value) })} />
                </div>
              ) : (
                <div>
                  <Label>Rabatt in CHF</Label>
                  <Input type="number" min={1} step="0.01" value={form.amountOff} onChange={e => setForm({ ...form, amountOff: Number(e.target.value) })} />
                </div>
              )}
              <div>
                <Label>Max. Einlösungen (optional)</Label>
                <Input type="number" min={1} value={form.maxRedemptions} onChange={e => setForm({ ...form, maxRedemptions: e.target.value })} placeholder="unbegrenzt" />
              </div>
              <div>
                <Label>Gültig bis (optional)</Label>
                <Input type="datetime-local" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={submitting}>Abbrechen</Button>
              <Button onClick={handleCreate} disabled={submitting}>{submitting ? 'Erstelle…' : 'Erstellen'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : codes.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
          Keine aktiven Aktionscodes vorhanden.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {codes.map(c => (
            <Card key={c.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Tag className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-mono">{c.code}</CardTitle>
                      {c.coupon.name && c.coupon.name !== c.code && (
                        <p className="text-xs text-muted-foreground mt-0.5">{c.coupon.name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={c.active ? 'default' : 'secondary'}>
                      {c.active ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                    {c.active && (
                      <Button size="sm" variant="ghost" onClick={() => handleDeactivate(c.id)} title="Deaktivieren">
                        <Power className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Rabatt</div>
                    <div className="font-medium">{formatDiscount(c)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Eingelöst</div>
                    <div className="font-medium">{c.times_redeemed}{c.max_redemptions ? ` / ${c.max_redemptions}` : ''}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Erstellt</div>
                    <div className="font-medium">{new Date(c.created * 1000).toLocaleDateString('de-CH')}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Gültig bis</div>
                    <div className="font-medium">{c.expires_at ? new Date(c.expires_at * 1000).toLocaleDateString('de-CH') : 'Unbegrenzt'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PromoCodes;
