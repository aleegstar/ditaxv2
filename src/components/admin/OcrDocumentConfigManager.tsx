import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Search, RefreshCw, FileText, Upload } from 'lucide-react';
import { DOCUMENT_KEYWORDS } from '@/utils/documentKeywords';
import { cn } from '@/lib/utils';

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

  useEffect(() => { fetchConfigs(); }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('ocr_document_configs').select('*').order('display_name');
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
            document_type_id: typeId, display_name: config.displayName,
            keywords: config.keywords, min_match_count: config.minMatchCount,
            confidence: config.confidence, is_active: true,
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
        document_type_id: config.document_type_id, display_name: config.display_name,
        keywords: config.keywords.join(', '), min_match_count: config.min_match_count,
        confidence: config.confidence as 'high' | 'medium' | 'low', is_active: config.is_active,
      });
    } else {
      setFormData({ document_type_id: '', display_name: '', keywords: '', min_match_count: 2, confidence: 'medium', is_active: true });
    }
    setEditDialog({ open: true, config });
  };

  const saveConfig = async () => {
    const keywords = formData.keywords.split(',').map(k => k.trim()).filter(Boolean);
    if (!formData.document_type_id || !formData.display_name || keywords.length === 0) {
      toast({ variant: 'destructive', title: 'Fehler', description: 'Bitte alle Pflichtfelder ausfüllen.' });
      return;
    }
    const payload = { document_type_id: formData.document_type_id, display_name: formData.display_name, keywords, min_match_count: formData.min_match_count, confidence: formData.confidence, is_active: formData.is_active };
    if (editDialog.config) {
      const { error } = await supabase.from('ocr_document_configs').update(payload).eq('id', editDialog.config.id);
      if (error) { toast({ variant: 'destructive', title: 'Fehler', description: error.message }); return; }
      toast({ title: 'Gespeichert', description: 'Konfiguration aktualisiert.' });
    } else {
      const { error } = await supabase.from('ocr_document_configs').insert(payload);
      if (error) { toast({ variant: 'destructive', title: 'Fehler', description: error.message }); return; }
      toast({ title: 'Erstellt', description: 'Neue Konfiguration hinzugefügt.' });
    }
    setEditDialog({ open: false, config: null });
    await fetchConfigs();
  };

  const deleteConfig = async (id: string) => {
    const { error } = await supabase.from('ocr_document_configs').delete().eq('id', id);
    if (error) { toast({ variant: 'destructive', title: 'Fehler', description: error.message }); return; }
    toast({ title: 'Gelöscht', description: 'Konfiguration entfernt.' });
    await fetchConfigs();
  };

  const toggleActive = async (config: OcrConfig) => {
    const { error } = await supabase.from('ocr_document_configs').update({ is_active: !config.is_active }).eq('id', config.id);
    if (error) { toast({ variant: 'destructive', title: 'Fehler', description: error.message }); return; }
    await fetchConfigs();
  };

  const filtered = configs.filter(c =>
    c.display_name.toLowerCase().includes(search.toLowerCase()) ||
    c.document_type_id.toLowerCase().includes(search.toLowerCase())
  );

  const confidenceLabel = (c: string) => {
    switch (c) { case 'high': return 'Hoch'; case 'medium': return 'Mittel'; case 'low': return 'Niedrig'; default: return c; }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">OCR Dokumenten-Konfiguration</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">{configs.length} Konfigurationen</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchConfigs} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button onClick={syncFromHardcoded} disabled={syncing} className="h-8 px-3 rounded-xl bg-white/60 backdrop-blur-xl border border-white/40 text-[12px] font-medium text-foreground hover:bg-white/80 transition-colors flex items-center gap-1.5 disabled:opacity-50">
            <Upload className="h-3.5 w-3.5" />
            {syncing ? 'Importiere...' : 'Aus Code importieren'}
          </button>
          <button onClick={() => openEdit(null)} className="h-8 px-3 rounded-full bg-gradient-to-b from-[hsl(222,100%,60%)] to-[hsl(222,100%,47%)] text-white text-[12px] font-semibold flex items-center gap-1.5 hover:brightness-[1.04] transition-all">
            <Plus className="h-3.5 w-3.5" />
            Neu
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          placeholder="Suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-9 pl-9 pr-3 rounded-xl bg-white/60 backdrop-blur-xl border border-white/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring/30 transition-colors"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="w-8 h-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">
            {configs.length === 0 ? 'Keine Konfigurationen' : 'Keine Ergebnisse'}
          </p>
          <p className="text-[13px] text-muted-foreground">
            {configs.length === 0 ? 'Klicke „Aus Code importieren" um bestehende Keywords zu übernehmen.' : 'Keine Ergebnisse für die Suche.'}
          </p>
        </div>
      ) : (
        <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl shadow-sm divide-y divide-white/30">
          {filtered.map(config => (
            <div key={config.id} className={cn("group p-4 hover:bg-muted/30 transition-colors", !config.is_active && "opacity-50")}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-medium text-foreground truncate">{config.display_name}</span>
                    <span className="text-[10px] font-mono font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                      {config.document_type_id}
                    </span>
                    <span className="text-[10px] font-medium text-foreground bg-foreground/[0.06] px-1.5 py-0.5 rounded">
                      {confidenceLabel(config.confidence)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2">
                    <span>Min. Treffer: {config.min_match_count}</span>
                    <span>·</span>
                    <span>{config.keywords.length} Keywords</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {config.keywords.slice(0, 8).map((kw, i) => (
                      <span key={i} className="text-[10px] font-medium text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
                        {kw}
                      </span>
                    ))}
                    {config.keywords.length > 8 && (
                      <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
                        +{config.keywords.length - 8}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Switch checked={config.is_active} onCheckedChange={() => toggleActive(config)} />
                  <button onClick={() => openEdit(config)} className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors opacity-0 group-hover:opacity-100">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteConfig(config.id)} className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={open => setEditDialog({ open, config: editDialog.config })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">{editDialog.config ? 'Konfiguration bearbeiten' : 'Neue Konfiguration'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-[13px]">Dokument-Typ ID</Label>
              <Input value={formData.document_type_id} onChange={e => setFormData(p => ({ ...p, document_type_id: e.target.value }))} placeholder="z.B. employment-income" disabled={!!editDialog.config} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Anzeigename</Label>
              <Input value={formData.display_name} onChange={e => setFormData(p => ({ ...p, display_name: e.target.value }))} placeholder="z.B. Lohnausweis" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Keywords (kommagetrennt)</Label>
              <textarea
                className="w-full min-h-[100px] rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring/30 transition-colors"
                value={formData.keywords}
                onChange={e => setFormData(p => ({ ...p, keywords: e.target.value }))}
                placeholder="lohnausweis, bruttolohn, nettolohn, ..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[13px]">Min. Treffer</Label>
                <Input type="number" min={1} value={formData.min_match_count} onChange={e => setFormData(p => ({ ...p, min_match_count: parseInt(e.target.value) || 1 }))} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">Konfidenz</Label>
                <Select value={formData.confidence} onValueChange={v => setFormData(p => ({ ...p, confidence: v as any }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">Hoch</SelectItem>
                    <SelectItem value="medium">Mittel</SelectItem>
                    <SelectItem value="low">Niedrig</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.is_active} onCheckedChange={v => setFormData(p => ({ ...p, is_active: v }))} />
              <Label className="text-[13px]">Aktiv</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setEditDialog({ open: false, config: null })}>Abbrechen</Button>
            <button onClick={saveConfig} className="h-8 px-4 rounded-full bg-gradient-to-b from-[hsl(222,100%,60%)] to-[hsl(222,100%,47%)] text-white text-[12px] font-semibold hover:brightness-[1.04] transition-all">Speichern</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
