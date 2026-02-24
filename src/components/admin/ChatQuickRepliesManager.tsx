import React, { useState } from 'react';
import { useQuickReplies, QuickReply } from '@/hooks/useQuickReplies';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Pencil, Trash2, MessageSquare, Search, RefreshCw } from 'lucide-react';
import { AdminWelcomeHeader } from './AdminWelcomeHeader';

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
  
  // Form state
  const [formData, setFormData] = useState({
    trigger: '',
    title: '',
    content: '',
    category: 'Allgemein'
  });

  const filteredReplies = quickReplies.filter(reply => {
    const query = searchQuery.toLowerCase();
    return (
      reply.trigger.toLowerCase().includes(query) ||
      reply.title.toLowerCase().includes(query) ||
      reply.content.toLowerCase().includes(query)
    );
  });

  const handleOpenCreate = () => {
    setEditingReply(null);
    setFormData({
      trigger: '',
      title: '',
      content: '',
      category: 'Allgemein'
    });
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
      toast({
        title: "Fehler",
        description: "Bitte fülle alle Pflichtfelder aus.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSaving(true);
      
      if (editingReply) {
        await updateQuickReply(editingReply.id, formData);
        toast({
          title: "Aktualisiert",
          description: `Schnellantwort "@${formData.trigger}" wurde aktualisiert.`
        });
      } else {
        await createQuickReply(formData);
        toast({
          title: "Erstellt",
          description: `Schnellantwort "@${formData.trigger}" wurde erstellt.`
        });
      }
      
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({
        title: "Fehler",
        description: err.message || "Fehler beim Speichern der Schnellantwort.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingReply) return;
    
    try {
      await deleteQuickReply(deletingReply.id);
      toast({
        title: "Gelöscht",
        description: `Schnellantwort "@${deletingReply.trigger}" wurde gelöscht.`
      });
      setIsDeleteDialogOpen(false);
      setDeletingReply(null);
    } catch (err: any) {
      toast({
        title: "Fehler",
        description: err.message || "Fehler beim Löschen der Schnellantwort.",
        variant: "destructive"
      });
    }
  };

  const categories = [...new Set(quickReplies.map(r => r.category || 'Allgemein'))];

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <AdminWelcomeHeader
        title="Schnellantworten"
        subtitle="Vorlagen für häufige Chat-Antworten verwalten"
        badge={{
          text: `${quickReplies.length} Vorlagen`,
          variant: 'secondary'
        }}
        onRefresh={fetchQuickReplies}
      />

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Suchen nach Trigger, Titel oder Inhalt..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Neue Vorlage
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          {error}
          <Button variant="link" onClick={fetchQuickReplies} className="ml-2">
            Erneut versuchen
          </Button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty State */}
      {!loading && quickReplies.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Keine Schnellantworten</h3>
            <p className="text-muted-foreground text-center mb-4">
              Erstelle deine erste Schnellantwort, um im Chat Zeit zu sparen.
            </p>
            <Button onClick={handleOpenCreate} className="gap-2">
              <Plus className="w-4 h-4" />
              Erste Vorlage erstellen
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Replies List */}
      {!loading && filteredReplies.length > 0 && (
        <div className="grid gap-4">
          {filteredReplies.map((reply) => (
            <Card key={reply.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="font-mono">
                        @{reply.trigger}
                      </Badge>
                      <Badge variant="outline">
                        {reply.category || 'Allgemein'}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{reply.title}</CardTitle>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(reply)}
                      className="h-8 w-8"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDelete(reply)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                  {reply.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Results */}
      {!loading && quickReplies.length > 0 && filteredReplies.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Keine Schnellantworten gefunden für "{searchQuery}"
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingReply ? 'Schnellantwort bearbeiten' : 'Neue Schnellantwort'}
            </DialogTitle>
            <DialogDescription>
              {editingReply 
                ? 'Bearbeite die Schnellantwort-Vorlage.'
                : 'Erstelle eine neue Schnellantwort-Vorlage für den Chat.'
              }
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="trigger">Trigger *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                <Input
                  id="trigger"
                  value={formData.trigger}
                  onChange={(e) => setFormData(prev => ({ ...prev, trigger: e.target.value.replace(/\s/g, '') }))}
                  placeholder="Lohnausweis"
                  className="pl-8"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Tippe @{formData.trigger || 'trigger'} im Chat, um diese Vorlage einzufügen.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Lohnausweis anfordern"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Kategorie</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="Dokumente"
                list="categories"
              />
              <datalist id="categories">
                {categories.map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Inhalt *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Hallo, zur Erstellung der Steuererklärung benötigen wir noch..."
                rows={6}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Speichern...' : editingReply ? 'Aktualisieren' : 'Erstellen'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Schnellantwort löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Bist du sicher, dass du die Schnellantwort "@{deletingReply?.trigger}" löschen möchtest?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
