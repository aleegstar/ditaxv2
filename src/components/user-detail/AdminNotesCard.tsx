import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save, StickyNote, Lock, Check } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';

interface AdminNotesCardProps {
  userId: string;
  initialNotes: string;
}

const AdminNotesCard: React.FC<AdminNotesCardProps> = ({ userId, initialNotes }) => {
  const [adminNotes, setAdminNotes] = useState(initialNotes);
  const [savingNotes, setSavingNotes] = useState(false);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  const hasChanges = adminNotes !== initialNotes;

  const saveAdminNotes = async () => {
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ admin_notes: adminNotes })
        .eq('id', userId);

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
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="relative">
          <Textarea 
            placeholder="Notizen zum Benutzer hinzufügen..." 
            value={adminNotes} 
            onChange={(e) => setAdminNotes(e.target.value)} 
            className="min-h-[180px] resize-none rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#1d64ff] focus:ring-1 focus:ring-[#1d64ff]/20 transition-all text-slate-700 placeholder:text-slate-400" 
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
                : 'bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white disabled:bg-slate-100 disabled:text-slate-400'
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
