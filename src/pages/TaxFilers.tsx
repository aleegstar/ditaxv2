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
    <div className="min-h-screen bg-white text-foreground antialiased pb-24">
      <SubpageHeader
        title={t.taxFilers?.pageTitle || 'Personen verwalten'}
        onBack={() => navigate(-1)}
      />

      <main className="max-w-[440px] mx-auto px-6 pt-4">
        <p className="text-[13px] text-muted-foreground/70 mb-6 leading-relaxed">
          {t.taxFilers?.pageDescription ||
            'Verwalten Sie hier die Personen, für die Sie Steuererklärungen erstellen möchten. Zum Beispiel für Ihre Kinder oder Eltern.'}
        </p>

        <div className="flex items-center justify-between px-1 mb-2.5">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/55">
            Profile
          </span>
          <span className="text-[10.5px] font-medium text-muted-foreground/45 tabular-nums">
            {taxFilers.length}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {taxFilers.length === 0 ? (
              <div className="bg-white border border-black/[0.07] rounded-2xl py-10 text-center text-sm text-muted-foreground shadow-[0_1px_2px_rgba(15,27,61,0.03),0_4px_16px_-12px_rgba(15,27,61,0.06)]">
                {t.taxFilers?.noPersons || 'Keine Personen gefunden.'}
              </div>
            ) : (
              <div className="bg-white border border-black/[0.07] rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(15,27,61,0.03),0_4px_16px_-12px_rgba(15,27,61,0.06)] divide-y divide-black/[0.05]">
                {taxFilers.map((filer) => {
                  const initials = `${filer.first_name.charAt(0)}${filer.last_name.charAt(0)}`.toUpperCase();
                  return (
                    <div
                      key={filer.id}
                      className="group relative flex items-center gap-4 px-5 py-4 transition-colors duration-150 hover:bg-foreground/[0.022]"
                    >
                      <Avatar className="w-10 h-10 ring-1 ring-black/[0.06] flex-shrink-0">
                        <AvatarImage
                          src={getAvatarUrl(filer)}
                          alt={`${filer.first_name} ${filer.last_name}`}
                          className="object-cover"
                        />
                        <AvatarFallback
                          className="text-[13px] font-semibold tracking-tight"
                          style={{
                            background: 'hsla(var(--primary) / 0.07)',
                            color: 'hsl(var(--primary))',
                          }}
                        >
                          {initials}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-[14.5px] font-medium text-foreground tracking-[-0.005em]">
                            {filer.first_name} {filer.last_name}
                          </h3>
                          {filer.is_primary && (
                            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary/80 bg-primary/[0.07] px-1.5 py-0.5 rounded-md">
                              {t.taxFilers?.primary || 'Primär'}
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-muted-foreground/65 truncate mt-0.5">
                          {getRelationshipLabel(filer.relationship)}
                          {filer.date_of_birth && ` • ${new Date(filer.date_of_birth).toLocaleDateString('de-CH')}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(filer)}
                          className="h-8 w-8 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-foreground/[0.05]"
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                        </Button>
                        {!filer.is_primary && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirmFiler(filer)}
                            className="h-8 w-8 rounded-full text-muted-foreground/60 hover:text-destructive hover:bg-destructive/[0.06]"
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={openAddDialog}
              disabled={isLoading}
              className="w-full mt-3 group flex items-center gap-4 px-5 py-4 bg-white border border-dashed border-black/[0.14] rounded-2xl transition-all duration-150 hover:border-foreground/30 hover:bg-foreground/[0.018] active:scale-[0.995] focus:outline-none focus-visible:border-foreground/30 disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-foreground/[0.04] border border-black/[0.05] group-hover:bg-foreground/[0.06] transition-colors">
                <Plus className="w-4 h-4 text-foreground/70" strokeWidth={2} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <h3 className="text-[14.5px] font-medium text-foreground tracking-[-0.005em]">
                  {t.taxFilers?.addPerson || 'Person hinzufügen'}
                </h3>
                <p className="text-[12px] text-muted-foreground/65 mt-0.5 truncate">
                  {t.taxFilers?.addDescription || 'Neue Person für Steuererklärungen anlegen.'}
                </p>
              </div>
            </button>

            <p className="text-center text-[11px] text-muted-foreground/45 mt-8 tracking-tight">
              {t.taxFilers?.infoDescription ||
                'Jede Person hat separate Formulardaten und Dokumente. Die primäre Person kann nicht gelöscht werden.'}
            </p>
          </>
        )}
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
