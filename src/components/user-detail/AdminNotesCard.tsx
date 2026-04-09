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

  // Reset notes when initialNotes changes (e.g., when switching tax filers)
  React.useEffect(() => {
    setAdminNotes(initialNotes);
  }, [initialNotes]);

  const hasChanges = adminNotes !== initialNotes;

  const saveAdminNotes = async () => {
    setSavingNotes(true);
    try {
      const targetTable = taxFilerId ? 'tax_filers' : 'profiles';
      const targetId = taxFilerId || userId;

      // Upsert into secure admin_notes_internal table
      const { error } = await supabase
        .from('admin_notes_internal')
        .upsert(
          {
            target_table: targetTable,
            target_id: targetId,
            note: adminNotes,
          },
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
        toast({
          title: "Notizen gespeichert",
          description: "Die Admin-Notizen wurden erfolgreich gespeichert."
        });
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center border border-amber-200/50">
            <StickyNote className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Admin-Notizen</h3>
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <Lock className="h-3.5 w-3.5" />
              <span>Nur für Administratoren sichtbar</span>
            </div>
          </div>
        </div>
        {hasChanges && (
          <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            Ungespeicherte Änderungen
          </span>
        )}
      </div>

      {/* Notes Card */}
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/40 p-6 space-y-4">
        <div className="relative">
          <Textarea 
            placeholder="Notizen zum Benutzer hinzufügen..." 
            value={adminNotes} 
            onChange={(e) => setAdminNotes(e.target.value)} 
            className="min-h-[180px] resize-none rounded-xl border-white/60 bg-white/30 focus:bg-white/60 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-foreground placeholder:text-muted-foreground" 
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-400">
            {adminNotes.length} Zeichen
          </p>
          <Button 
            onClick={saveAdminNotes} 
            disabled={savingNotes || !hasChanges}
            className={`
              rounded-full px-6 py-2.5 h-11 text-sm font-medium border-0 transition-all duration-200 
              flex items-center justify-center gap-2
              ${saved 
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                : 'bg-gradient-to-b from-[hsl(222,100%,60%)] to-[hsl(222,100%,47%)] hover:brightness-[1.04] text-white disabled:bg-muted disabled:text-muted-foreground'
              }
            `}
          >
            {savingNotes ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Speichern...
              </>
            ) : saved ? (
              <>
                <Check className="h-4 w-4" />
                Gespeichert
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Speichern
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminNotesCard;
