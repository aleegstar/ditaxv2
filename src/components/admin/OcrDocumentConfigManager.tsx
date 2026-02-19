import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { AdminWelcomeHeader } from './AdminWelcomeHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Search, Tag, FileText, Upload } from 'lucide-react';
import { DOCUMENT_KEYWORDS, type DocumentKeywordConfig } from '@/utils/documentKeywords';

interface OcrConfig {
  id: string;
  document_type_id: string;
  display_name: string;
  keywords: string[];
  min_match_count: number;
  confidence: 'high' | 'medium' | 'low';
  is_active: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export function OcrDocumentConfigManager() {
  const [configs, setConfigs] = useState<OcrConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editDialog, setEditDialog] = useState<{ open: boolean; config: OcrConfig | null }>({ open: false, config: null });
  const [formData, setFormData] = useState({
    document_type_id: '',
    display_name: '',
    keywords: '',
    min_match_count: 2,
    confidence: 'medium' as 'high' | 'medium' | 'low',
    is_active: true,
  });
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ocr_document_configs')
      .select('*')
      .order('display_name');

    if (error) {
      toast({ variant: 'destructive', title: 'Fehler', description: error.message });
    } else {
      setConfigs((data || []) as OcrConfig[]);
    }
    setLoading(false);
  };

  const syncFromHardcoded = async () => {
    setSyncing(true);
    try {
      const entries = Object.entries(DOCUMENT_KEYWORDS);
      let inserted = 0;

      for (const [typeId, config] of entries) {
        const existing = configs.find(c => c.document_type_id === typeId);
        if (!existing) {
          const { error } = await supabase.from('ocr_document_configs').insert({
            document_type_id: typeId,
            display_name: config.displayName,
            keywords: config.keywords,
            min_match_count: config.minMatchCount,
            confidence: config.confidence,
            is_active: true,
          });
          if (!error) inserted++;
        }
      }

      toast({ title: 'Sync abgeschlossen', description: `${inserted} neue Konfigurationen importiert.` });
      await fetchConfigs();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Sync fehlgeschlagen', description: String(e) });
    }
    setSyncing(false);
  };

  const openEdit = (config: OcrConfig | null) => {
    if (config) {
      setFormData({
        document_type_id: config.document_type_id,
        display_name: config.display_name,
        keywords: config.keywords.join(', '),
        min_match_count: config.min_match_count,
        confidence: config.confidence as 'high' | 'medium' | 'low',
        is_active: config.is_active,
      });
    } else {
      setFormData({
        document_type_id: '',
        display_name: '',
        keywords: '',
        min_match_count: 2,
        confidence: 'medium',
        is_active: true,
      });
    }
    setEditDialog({ open: true, config });
  };

  const saveConfig = async () => {
    const keywords = formData.keywords.split(',').map(k => k.trim()).filter(Boolean);
    
    if (!formData.document_type_id || !formData.display_name || keywords.length === 0) {
      toast({ variant: 'destructive', title: 'Fehler', description: 'Bitte alle Pflichtfelder ausfüllen.' });
      return;
    }

    const payload = {
      document_type_id: formData.document_type_id,
      display_name: formData.display_name,
      keywords,
      min_match_count: formData.min_match_count,
      confidence: formData.confidence,
      is_active: formData.is_active,
    };

    if (editDialog.config) {
      const { error } = await supabase
        .from('ocr_document_configs')
        .update(payload)
        .eq('id', editDialog.config.id);
      if (error) {
        toast({ variant: 'destructive', title: 'Fehler', description: error.message });
        return;
      }
      toast({ title: 'Gespeichert', description: 'Konfiguration aktualisiert.' });
    } else {
      const { error } = await supabase.from('ocr_document_configs').insert(payload);
      if (error) {
        toast({ variant: 'destructive', title: 'Fehler', description: error.message });
        return;
      }
      toast({ title: 'Erstellt', description: 'Neue Konfiguration hinzugefügt.' });
    }

    setEditDialog({ open: false, config: null });
    await fetchConfigs();
  };

  const deleteConfig = async (id: string) => {
    const { error } = await supabase.from('ocr_document_configs').delete().eq('id', id);
    if (error) {
      toast({ variant: 'destructive', title: 'Fehler', description: error.message });
      return;
    }
    toast({ title: 'Gelöscht', description: 'Konfiguration entfernt.' });
    await fetchConfigs();
  };

  const toggleActive = async (config: OcrConfig) => {
    const { error } = await supabase
      .from('ocr_document_configs')
      .update({ is_active: !config.is_active })
      .eq('id', config.id);
    if (error) {
      toast({ variant: 'destructive', title: 'Fehler', description: error.message });
      return;
    }
    await fetchConfigs();
  };

  const filtered = configs.filter(c =>
    c.display_name.toLowerCase().includes(search.toLowerCase()) ||
    c.document_type_id.toLowerCase().includes(search.toLowerCase())
  );

  const confidenceColor = (c: string) => {
    switch (c) {
      case 'high': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'low': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return '';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <AdminWelcomeHeader
        title="OCR Dokumenten-Konfiguration"
        subtitle="Keywords und Erkennungseinstellungen für die automatische Dokumentenzuordnung verwalten"
        badge={{ text: `${configs.length} Konfigurationen`, variant: 'secondary' }}
        onRefresh={fetchConfigs}
      />

      <div className="flex flex-col sm:flex-row gap-3 mt-6 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Suchen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={syncFromHardcoded} disabled={syncing}>
          <Upload className="h-4 w-4 mr-2" />
          {syncing ? 'Importiere...' : 'Aus Code importieren'}
        </Button>
        <Button onClick={() => openEdit(null)}>
          <Plus className="h-4 w-4 mr-2" />
          Neu
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Laden...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">
              {configs.length === 0 
                ? 'Keine Konfigurationen vorhanden. Klicke "Aus Code importieren" um die bestehenden Keywords zu übernehmen.'
                : 'Keine Ergebnisse für die Suche.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map(config => (
            <Card key={config.id} className={`transition-all ${!config.is_active ? 'opacity-50' : ''}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground truncate">{config.display_name}</h3>
                      <Badge variant="outline" className="text-xs font-mono shrink-0">
                        {config.document_type_id}
                      </Badge>
                      <Badge className={`text-xs shrink-0 ${confidenceColor(config.confidence)}`}>
                        {config.confidence}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <span>Min. Treffer: {config.min_match_count}</span>
                      <span>•</span>
                      <span>{config.keywords.length} Keywords</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {config.keywords.slice(0, 8).map((kw, i) => (
                        <Badge key={i} variant="secondary" className="text-xs font-normal">
                          <Tag className="h-3 w-3 mr-1" />
                          {kw}
                        </Badge>
                      ))}
                      {config.keywords.length > 8 && (
                        <Badge variant="secondary" className="text-xs">
                          +{config.keywords.length - 8} weitere
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={config.is_active}
                      onCheckedChange={() => toggleActive(config)}
                    />
                    <Button size="icon" variant="ghost" onClick={() => openEdit(config)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteConfig(config.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editDialog.open} onOpenChange={open => setEditDialog({ open, config: editDialog.config })}>
        <DialogContent variant="admin" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editDialog.config ? 'Konfiguration bearbeiten' : 'Neue Konfiguration'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Dokument-Typ ID</Label>
              <Input
                value={formData.document_type_id}
                onChange={e => setFormData(p => ({ ...p, document_type_id: e.target.value }))}
                placeholder="z.B. employment-income"
                disabled={!!editDialog.config}
              />
            </div>
            <div>
              <Label>Anzeigename</Label>
              <Input
                value={formData.display_name}
                onChange={e => setFormData(p => ({ ...p, display_name: e.target.value }))}
                placeholder="z.B. Lohnausweis"
              />
            </div>
            <div>
              <Label>Keywords (kommagetrennt)</Label>
              <textarea
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.keywords}
                onChange={e => setFormData(p => ({ ...p, keywords: e.target.value }))}
                placeholder="lohnausweis, bruttolohn, nettolohn, ..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Min. Treffer</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.min_match_count}
                  onChange={e => setFormData(p => ({ ...p, min_match_count: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div>
                <Label>Konfidenz</Label>
                <Select value={formData.confidence} onValueChange={v => setFormData(p => ({ ...p, confidence: v as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">Hoch</SelectItem>
                    <SelectItem value="medium">Mittel</SelectItem>
                    <SelectItem value="low">Niedrig</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={v => setFormData(p => ({ ...p, is_active: v }))}
              />
              <Label>Aktiv</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, config: null })}>
              Abbrechen
            </Button>
            <Button onClick={saveConfig}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
