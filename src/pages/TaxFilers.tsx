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
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
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
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProfile } from '@/hooks/useProfile';

type RelationshipType = 'self' | 'child' | 'spouse' | 'parent' | 'other';

const RELATIONSHIPS: RelationshipType[] = ['self', 'child', 'spouse', 'parent', 'other'];

const TaxFilers: React.FC = () => {
  const { taxFilers, createTaxFiler, updateTaxFiler, deleteTaxFiler, isLoading } = useTaxFiler();
  const { t } = useI18n();
  const { profile } = useProfile();
  const navigate = useNavigate();

  const getAvatarUrl = (filer: TaxFiler): string | undefined => {
    if (filer.avatar_url) return filer.avatar_url;
    if (filer.is_primary && profile?.avatar_url) return profile.avatar_url;
    return undefined;
  };

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
    <div className="min-h-screen bg-transparent text-foreground antialiased pb-24">
      <SubpageHeader 
        title={t.taxFilers?.pageTitle || 'Personen verwalten'} 
        onBack={() => navigate(-1)}
      />

      <main className="max-w-xl mx-auto px-4 sm:px-6 pt-2">
        {/* Description */}
        <p className="text-[13px] text-muted-foreground mb-5 leading-relaxed">
          {t.taxFilers?.pageDescription || 
            'Verwalten Sie hier die Personen, für die Sie Steuererklärungen erstellen möchten. Zum Beispiel für Ihre Kinder oder Eltern.'}
        </p>

        {/* Tax Filers List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : taxFilers.length === 0 ? (
            <div className="rounded-[1.5rem] bg-white border border-slate-200/80 shadow-[0_8px_32px_rgba(0,0,0,0.04)] py-10 text-center text-sm text-muted-foreground">
              {t.taxFilers?.noPersons || 'Keine Personen gefunden.'}
            </div>
          ) : (
            taxFilers.map((filer) => (
              <div
                key={filer.id}
                className="group rounded-[1.5rem] bg-white border border-slate-200/80 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-lg transition-all duration-200"
              >
                <div className="p-5 sm:p-6 flex items-center gap-3.5">
                  <div className={cn(
                    'w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all',
                    filer.is_primary ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  )}>
                    {filer.is_primary ? <Crown className="h-4 w-4" strokeWidth={2} /> : <User className="h-4 w-4" strokeWidth={2} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-[14px] font-semibold text-foreground tracking-tight truncate">
                        {filer.first_name} {filer.last_name}
                      </h2>
                      {filer.is_primary && (
                        <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full flex-shrink-0">
                          {t.taxFilers?.primary || 'Primär'}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-muted-foreground mt-0.5 truncate">
                      {getRelationshipLabel(filer.relationship)}
                      {filer.date_of_birth && ` • ${new Date(filer.date_of_birth).toLocaleDateString('de-CH')}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(filer)}
                      className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" strokeWidth={1.75} />
                    </Button>
                    {!filer.is_primary && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteConfirmFiler(filer)}
                        className="h-9 w-9 rounded-full text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Add Person Card */}
          <button
            onClick={openAddDialog}
            disabled={isLoading}
            className="w-full group rounded-[1.5rem] bg-white border border-dashed border-slate-300 hover:border-primary/40 hover:bg-primary/[0.02] transition-all duration-200 disabled:opacity-50"
          >
            <div className="p-5 sm:p-6 flex items-center gap-3.5">
              <div className="w-10 h-10 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <UserPlus className="h-4 w-4" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <h2 className="text-[14px] font-semibold text-foreground tracking-tight">
                  {t.taxFilers?.addPerson || 'Person hinzufügen'}
                </h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  {t.taxFilers?.addDescription || 'Neue Person für Steuererklärungen anlegen.'}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" strokeWidth={1.5} />
            </div>
          </button>
        </div>

        {/* Info Card */}
        <div className="mt-5 rounded-2xl bg-primary/5 border border-primary/15 px-4 py-3.5">
          <h3 className="font-semibold text-foreground tracking-tight text-[13px]">
            {t.taxFilers?.infoTitle || 'Hinweis'}
          </h3>
          <p className="text-muted-foreground mt-1 leading-snug text-[11px]">
            {t.taxFilers?.infoDescription || 
              'Jede Person hat separate Formulardaten und Dokumente. Die primäre Person (Sie selbst) kann nicht gelöscht werden.'}
          </p>
        </div>
      </main>

      {/* Add/Edit Bottom Sheet */}
      <Drawer open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DrawerContent variant="bottom-sheet" className="px-6 pb-8 pt-2 overflow-hidden">
          <div className="mb-6" />
          <div className="text-center space-y-2 mb-6">
            <DrawerTitle className="text-xl font-bold text-foreground">
              {editingFiler 
                ? (t.taxFilers?.editPerson || 'Person bearbeiten')
                : (t.taxFilers?.addPerson || 'Person hinzufügen')}
            </DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground">
              {editingFiler
                ? (t.taxFilers?.editDescription || 'Ändere die Daten der Person.')
                : (t.taxFilers?.addDescription || 'Füge eine neue Person hinzu, für die du Steuererklärungen erstellen möchtest.')}
            </DrawerDescription>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm text-muted-foreground">
                  {t.taxFilers?.firstName || 'Vorname'} *
                </Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                  className="rounded-xl border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm text-muted-foreground">
                  {t.taxFilers?.lastName || 'Nachname'} *
                </Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                  className="rounded-xl border-border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth" className="text-sm text-muted-foreground">
                {t.taxFilers?.dateOfBirth || 'Geburtsdatum'}
              </Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                autoComplete="bday"
                className="rounded-xl border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="relationship" className="text-sm text-muted-foreground">
                {t.taxFilers?.relationship || 'Beziehung'} *
              </Label>
              <Select
                value={relationship}
                onValueChange={(val) => setRelationship(val as RelationshipType)}
                disabled={editingFiler?.is_primary}
              >
                <SelectTrigger className="rounded-xl border-border">
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

            <div className="flex flex-col gap-3 pt-2">
              <Button
                type="submit"
                disabled={isSaving || !firstName.trim() || !lastName.trim()}
                className="w-full"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              >
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingFiler 
                  ? (t.forms?.save || 'Speichern')
                  : (t.taxFilers?.addPerson || 'Person hinzufügen')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
                className="w-full text-muted-foreground"
              >
                {t.common?.cancel || 'Abbrechen'}
              </Button>
            </div>
          </form>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmFiler} onOpenChange={() => setDeleteConfirmFiler(null)}>
        <AlertDialogContent className="border-0 shadow-xl rounded-2xl bg-transparent">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-foreground">
              {t.taxFilers?.deleteTitle || 'Person löschen?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-primary">
              {t.taxFilers?.deleteDescription || 
                'Möchtest du diese Person wirklich löschen? Alle zugehörigen Steuererklärungen und Dokumente werden ebenfalls gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3 pt-2 sm:flex-row">
            <AlertDialogCancel className="flex-1 rounded-xl border-border text-foreground mt-0">
              {t.common?.cancel || 'Abbrechen'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="flex-1 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
