import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save, StickyNote, Lock, Check } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';

interface AdminNotesCardProps {
  userId: string;
  initialNotes: string;
  taxFilerId?: string | null;
}

const AdminNotesCard: React.FC<AdminNotesCardProps> = ({ userId, initialNotes, taxFilerId }) => {
  const [adminNotes, setAdminNotes] = useState(initialNotes);
  const [savingNotes, setSavingNotes] = useState(false);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    setAdminNotes(initialNotes);
  }, [initialNotes]);

  const hasChanges = adminNotes !== initialNotes;

  const saveAdminNotes = async () => {
    setSavingNotes(true);
    try {
      const targetTable = taxFilerId ? 'tax_filers' : 'profiles';
      const targetId = taxFilerId || userId;

      const { error } = await supabase
        .from('admin_notes_internal')
        .upsert(
          { target_table: targetTable, target_id: targetId, note: adminNotes },
          { onConflict: 'target_table,target_id' }
        );

      if (error) {
        console.error('Error saving admin notes:', error);
        toast({
          title: "Fehler beim Speichern",
          description: "Die Notizen konnten nicht gespeichert werden.",
          variant: "destructive"
        });
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        toast({ title: "Notizen gespeichert", description: "Die Admin-Notizen wurden erfolgreich gespeichert." });
      }
    } catch (error) {
      console.error('Error saving admin notes:', error);
      toast({
        title: "Fehler beim Speichern",
        description: "Die Notizen konnten nicht gespeichert werden.",
        variant: "destructive"
      });
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            <StickyNote className="h-5 w-5 text-foreground/70" strokeWidth={1.8} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Admin-Notizen</h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
              <Lock className="h-3 w-3" strokeWidth={1.8} />
              <span>Nur für Administratoren sichtbar</span>
            </div>
          </div>
        </div>
        {hasChanges && (
          <span className="shrink-0 text-[11px] font-medium text-foreground bg-muted px-2.5 py-1 rounded-full border border-border">
            Ungespeicherte Änderungen
          </span>
        )}
      </div>

      {/* Textarea */}
      <Textarea
        placeholder="Notizen zum Benutzer hinzufügen..."
        value={adminNotes}
        onChange={(e) => setAdminNotes(e.target.value)}
        className="min-h-[200px] resize-none rounded-xl border-border bg-background focus-visible:ring-1 focus-visible:ring-ring text-sm"
      />

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-muted-foreground tabular-nums">
          {adminNotes.length} Zeichen
        </p>
        <Button
          onClick={saveAdminNotes}
          disabled={savingNotes || !hasChanges}
          className="h-10 px-5 rounded-2xl bg-gradient-to-b from-[#1E3A5F] to-[#0F1B3D] text-white text-[13px] font-semibold hover:opacity-95 transition-opacity shadow-[0_2px_8px_-2px_rgba(15,27,61,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {savingNotes ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              Speichern...
            </>
          ) : saved ? (
            <>
              <Check className="h-4 w-4 mr-2" strokeWidth={1.8} />
              Gespeichert
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" strokeWidth={1.8} />
              Speichern
            </>
          )}
        </Button>

      </div>
    </div>
  );
};

export default AdminNotesCard;
