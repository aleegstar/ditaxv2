
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';

interface AdminNotesCardProps {
  userId: string;
  initialNotes: string;
}

const AdminNotesCard: React.FC<AdminNotesCardProps> = ({ userId, initialNotes }) => {
  const [adminNotes, setAdminNotes] = useState(initialNotes);
  const [savingNotes, setSavingNotes] = useState(false);
  const { toast } = useToast();

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
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">Admin-Notizen</CardTitle>
        <CardDescription>
          Nur für Administratoren sichtbar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea 
          placeholder="Notizen zum Benutzer hinzufügen..." 
          value={adminNotes} 
          onChange={(e) => setAdminNotes(e.target.value)} 
          className="min-h-[150px] resize-none" 
        />
      </CardContent>
      <CardFooter>
        <Button 
          onClick={saveAdminNotes} 
          disabled={savingNotes} 
          className="w-full bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-full px-[20px] py-[10px] h-14 text-base font-medium border-0 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-[10px]"
          style={{
            boxShadow: 'rgba(29, 100, 255, 0.2) 0px 3px 10px 0px'
          }}
        >
          {savingNotes ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Wird gespeichert...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Speichern
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AdminNotesCard;
