import React, { useState } from 'react';
import { useQuickReplies, QuickReply } from '@/hooks/useQuickReplies';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search, RefreshCw, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ChatQuickRepliesManager: React.FC = () => {
  const { 
    quickReplies, 
    loading, 
    error, 
    fetchQuickReplies,
    createQuickReply, 
    updateQuickReply, 
    deleteQuickReply 
  } = useQuickReplies();
  
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [deletingReply, setDeletingReply] = useState<QuickReply | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  const [formData, setFormData] = useState({
    trigger: '',
    title: '',
    content: '',
    category: 'Allgemein'
  });

  const categories = ['all', ...new Set(quickReplies.map(r => r.category || 'Allgemein'))];

  const filteredReplies = quickReplies.filter(reply => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      reply.trigger.toLowerCase().includes(query) ||
      reply.title.toLowerCase().includes(query) ||
      reply.content.toLowerCase().includes(query);
    const matchesCategory = filterCategory === 'all' || (reply.category || 'Allgemein') === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenCreate = () => {
    setEditingReply(null);
    setFormData({ trigger: '', title: '', content: '', category: 'Allgemein' });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (reply: QuickReply) => {
    setEditingReply(reply);
    setFormData({
      trigger: reply.trigger,
      title: reply.title,
      content: reply.content,
      category: reply.category || 'Allgemein'
    });
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (reply: QuickReply) => {
    setDeletingReply(reply);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.trigger.trim() || !formData.title.trim() || !formData.content.trim()) {
      toast({ title: "Fehler", description: "Bitte fülle alle Pflichtfelder aus.", variant: "destructive" });
      return;
    }
    try {
      setIsSaving(true);
      if (editingReply) {
        await updateQuickReply(editingReply.id, formData);
        toast({ title: "Aktualisiert", description: `Schnellantwort "@${formData.trigger}" wurde aktualisiert.` });
      } else {
        await createQuickReply(formData);
        toast({ title: "Erstellt", description: `Schnellantwort "@${formData.trigger}" wurde erstellt.` });
      }
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message || "Fehler beim Speichern.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingReply) return;
    try {
      await deleteQuickReply(deletingReply.id);
      toast({ title: "Gelöscht", description: `Schnellantwort "@${deletingReply.trigger}" wurde gelöscht.` });
      setIsDeleteDialogOpen(false);
      setDeletingReply(null);
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message || "Fehler beim Löschen.", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">Schnellantworten</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {quickReplies.length} Vorlagen
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchQuickReplies}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleOpenCreate}
             className="h-8 px-3 rounded-full bg-gradient-to-b from-[hsl(222,100%,60%)] to-[hsl(222,100%,47%)] text-white text-[12px] font-semibold flex items-center gap-1.5 hover:brightness-[1.04] transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Neue Vorlage
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            placeholder="Suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-white/60 backdrop-blur-xl border border-white/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring/30 transition-colors"
          />
        </div>
        <div className="flex gap-0.5 bg-muted/40 rounded-lg p-0.5">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-md text-[11px] font-medium transition-all whitespace-nowrap",
                filterCategory === cat
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {cat === 'all' ? 'Alle' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="text-[13px] text-destructive bg-destructive/5 border border-destructive/10 rounded-lg p-3 flex items-center justify-between">
          {error}
          <button onClick={fetchQuickReplies} className="text-[12px] font-medium underline underline-offset-2">
            Erneut versuchen
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty */}
      {!loading && quickReplies.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MessageSquare className="w-8 h-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Keine Schnellantworten</p>
          <p className="text-[13px] text-muted-foreground mb-4">
            Erstelle deine erste Vorlage, um im Chat Zeit zu sparen.
          </p>
          <button
            onClick={handleOpenCreate}
            className="h-8 px-3 rounded-full bg-gradient-to-b from-[hsl(222,100%,60%)] to-[hsl(222,100%,47%)] text-white text-[12px] font-semibold flex items-center gap-1.5 hover:brightness-[1.04] transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Erste Vorlage erstellen
          </button>
        </div>
      )}

      {/* List */}
      {!loading && filteredReplies.length > 0 && (
        <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl shadow-sm divide-y divide-white/30">
          {filteredReplies.map((reply) => (
            <div key={reply.id} className="group p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-mono font-medium text-foreground bg-foreground/[0.06] px-1.5 py-0.5 rounded">
                      @{reply.trigger}
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                      {reply.category || 'Allgemein'}
                    </span>
                  </div>
                  <h3 className="text-[13px] font-medium text-foreground mb-1">{reply.title}</h3>
                  <p className="text-[12px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {reply.content}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => handleOpenEdit(reply)}
                    className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenDelete(reply)}
                    className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {!loading && quickReplies.length > 0 && filteredReplies.length === 0 && (
        <div className="text-center py-12 text-[13px] text-muted-foreground">
          Keine Ergebnisse für „{searchQuery}"
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editingReply ? 'Schnellantwort bearbeiten' : 'Neue Schnellantwort'}
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              {editingReply 
                ? 'Bearbeite die Vorlage.'
                : 'Erstelle eine neue Vorlage für den Chat.'
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="trigger" className="text-[13px]">Trigger</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                <Input
                  id="trigger"
                  value={formData.trigger}
                  onChange={(e) => setFormData(prev => ({ ...prev, trigger: e.target.value.replace(/\s/g, '') }))}
                  placeholder="Lohnausweis"
                  className="pl-7 h-9 text-sm"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-[13px]">Titel</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Lohnausweis anfordern"
                className="h-9 text-sm"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-[13px]">Kategorie</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="Dokumente"
                className="h-9 text-sm"
                list="categories"
              />
              <datalist id="categories">
                {categories.filter(c => c !== 'all').map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="content" className="text-[13px]">Inhalt</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Hallo, zur Erstellung der Steuererklärung benötigen wir noch..."
                rows={5}
                className="text-sm"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsDialogOpen(false)}>
                Abbrechen
              </Button>
              <button
                type="submit"
                disabled={isSaving}
                className="h-8 px-4 rounded-lg bg-foreground text-background text-[12px] font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Speichern...' : editingReply ? 'Aktualisieren' : 'Erstellen'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Schnellantwort löschen?</AlertDialogTitle>
            <AlertDialogDescription className="text-[13px]">
              „@{deletingReply?.trigger}" wird unwiderruflich gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-[13px]">Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-[13px]">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
