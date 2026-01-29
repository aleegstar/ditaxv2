import React, { useState } from 'react';
import { useTaxFiler, TaxFiler, TaxFilerInput } from '@/contexts/TaxFilerContext';
import { useI18n } from '@/contexts/I18nContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { SubpageHeader } from '@/components/ui/subpage-header';
import { User, UserPlus, Pencil, Trash2, Crown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type RelationshipType = 'self' | 'child' | 'spouse' | 'parent' | 'other';

const RELATIONSHIPS: RelationshipType[] = ['self', 'child', 'spouse', 'parent', 'other'];

const TaxFilers: React.FC = () => {
  const { taxFilers, createTaxFiler, updateTaxFiler, deleteTaxFiler, isLoading } = useTaxFiler();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFiler, setEditingFiler] = useState<TaxFiler | null>(null);
  const [deleteConfirmFiler, setDeleteConfirmFiler] = useState<TaxFiler | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [relationship, setRelationship] = useState<RelationshipType>('child');

  const getRelationshipLabel = (rel: string): string => {
    const labels: Record<string, string> = {
      self: t.taxFilers?.relationships?.self || 'Ich selbst',
      child: t.taxFilers?.relationships?.child || 'Kind',
      spouse: t.taxFilers?.relationships?.spouse || 'Ehepartner',
      parent: t.taxFilers?.relationships?.parent || 'Elternteil',
      other: t.taxFilers?.relationships?.other || 'Andere'
    };
    return labels[rel] || rel;
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setDateOfBirth('');
    setRelationship('child');
    setEditingFiler(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (filer: TaxFiler) => {
    setFirstName(filer.first_name);
    setLastName(filer.last_name);
    setDateOfBirth(filer.date_of_birth || '');
    setRelationship(filer.relationship as RelationshipType);
    setEditingFiler(filer);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const input: TaxFilerInput = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      date_of_birth: dateOfBirth || null,
      relationship
    };

    try {
      if (editingFiler) {
        await updateTaxFiler(editingFiler.id, input);
      } else {
        await createTaxFiler(input);
      }
      setIsDialogOpen(false);
      resetForm();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmFiler) return;
    
    await deleteTaxFiler(deleteConfirmFiler.id);
    setDeleteConfirmFiler(null);
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      <SubpageHeader 
        title={t.taxFilers?.pageTitle || 'Personen verwalten'} 
        onBack={() => navigate(-1)}
      />

      <div className="px-4 py-6 max-w-2xl mx-auto">
        {/* Description */}
        <p className="text-muted-foreground mb-6">
          {t.taxFilers?.pageDescription || 
            'Verwalten Sie hier die Personen, für die Sie Steuererklärungen erstellen möchten. Zum Beispiel für Ihre Kinder oder Eltern.'}
        </p>

        {/* Add Person Button */}
        <Button
          onClick={openAddDialog}
          className="w-full mb-6"
          disabled={isLoading}
        >
          <UserPlus className="h-5 w-5 mr-2" />
          {t.taxFilers?.addPerson || 'Person hinzufügen'}
        </Button>

        {/* Tax Filers List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : taxFilers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t.taxFilers?.noPersons || 'Keine Personen gefunden.'}
            </div>
          ) : (
            taxFilers.map((filer) => (
              <div
                key={filer.id}
                className={cn(
                  'bg-card border border-border rounded-xl p-4',
                  'flex items-center justify-between gap-4',
                  filer.is_primary && 'border-primary/30 bg-primary/5'
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                    filer.is_primary ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                  )}>
                    {filer.is_primary ? <Crown className="h-5 w-5" /> : <User className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground truncate">
                        {filer.first_name} {filer.last_name}
                      </h3>
                      {filer.is_primary && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full flex-shrink-0">
                          {t.taxFilers?.primary || 'Primär'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getRelationshipLabel(filer.relationship)}
                      {filer.date_of_birth && ` • ${new Date(filer.date_of_birth).toLocaleDateString('de-CH')}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(filer)}
                    className="h-9 w-9"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {!filer.is_primary && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirmFiler(filer)}
                      className="h-9 w-9 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Info Box */}
        <div className="mt-8 p-4 bg-muted/50 rounded-xl">
          <h4 className="font-medium text-foreground mb-2">
            {t.taxFilers?.infoTitle || 'Hinweis'}
          </h4>
          <p className="text-sm text-muted-foreground">
            {t.taxFilers?.infoDescription || 
              'Jede Person hat separate Formulardaten und Dokumente. Die primäre Person (Sie selbst) kann nicht gelöscht werden.'}
          </p>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingFiler 
                ? (t.taxFilers?.editPerson || 'Person bearbeiten')
                : (t.taxFilers?.addPerson || 'Person hinzufügen')}
            </DialogTitle>
            <DialogDescription>
              {editingFiler
                ? (t.taxFilers?.editDescription || 'Ändern Sie die Daten der Person.')
                : (t.taxFilers?.addDescription || 'Fügen Sie eine neue Person hinzu, für die Sie Steuererklärungen erstellen möchten.')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  {t.taxFilers?.firstName || 'Vorname'} *
                </Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  {t.taxFilers?.lastName || 'Nachname'} *
                </Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">
                {t.taxFilers?.dateOfBirth || 'Geburtsdatum'}
              </Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                autoComplete="bday"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="relationship">
                {t.taxFilers?.relationship || 'Beziehung'} *
              </Label>
              <Select
                value={relationship}
                onValueChange={(val) => setRelationship(val as RelationshipType)}
                disabled={editingFiler?.is_primary}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.filter(r => !editingFiler?.is_primary || r === 'self').map((rel) => (
                    <SelectItem key={rel} value={rel}>
                      {getRelationshipLabel(rel)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                {t.common?.cancel || 'Abbrechen'}
              </Button>
              <Button type="submit" disabled={isSaving || !firstName.trim() || !lastName.trim()}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingFiler 
                  ? (t.forms?.save || 'Speichern')
                  : (t.taxFilers?.addPerson || 'Hinzufügen')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmFiler} onOpenChange={() => setDeleteConfirmFiler(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t.taxFilers?.deleteTitle || 'Person löschen?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.taxFilers?.deleteDescription || 
                'Möchten Sie diese Person wirklich löschen? Alle zugehörigen Steuererklärungen und Dokumente werden ebenfalls gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t.common?.cancel || 'Abbrechen'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t.taxFilers?.deleteConfirm || 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TaxFilers;
