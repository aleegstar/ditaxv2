import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, Loader2, MessageSquarePlus, CheckCircle, Paperclip } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { sanitizeFileName } from '@/utils/fileValidation';
import { toast } from "@/hooks/use-toast";
import ticketHero from "@/assets/ticket-hero.webp";

interface CreateTicketDialogProps {
  isOpen: boolean;
  onClose: () => void;
  completedTaxReturnId: string;
  taxYear: string;
}

export const CreateTicketDialog = ({
  isOpen,
  onClose,
  completedTaxReturnId,
  taxYear
}: CreateTicketDialogProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAttachments([]);
    setIsComplete(false);
  };
  const handleClose = () => {
    resetForm();
    onClose();
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast({ variant: "destructive", title: "Fehler", description: "Bitte fülle alle Pflichtfelder aus." });
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht authentifiziert');

      const { data: ticket, error: ticketError } = await supabase.from('support_tickets').insert({
        user_id: user.id,
        completed_tax_return_id: completedTaxReturnId,
        title,
        description,
        status: 'open',
        priority: 'medium'
      }).select().single();
      if (ticketError) throw ticketError;

      if (attachments.length > 0) {
        for (const file of attachments) {
          const safeFileName = sanitizeFileName(file.name);
          const fileName = `${user.id}/${ticket.id}/${Date.now()}-${safeFileName}`;
          const { error: uploadError } = await supabase.storage.from('ticket-attachments').upload(fileName, file);
          if (uploadError) { console.error('Upload error:', uploadError); continue; }
          await supabase.from('ticket_attachments').insert({
            ticket_id: ticket.id,
            file_name: file.name,
            file_path: fileName,
            file_type: file.type,
            file_size: file.size,
            uploaded_by: user.id
          });
        }
      }
      setIsComplete(true);
      toast({ title: "Ticket erstellt", description: `Dein Ticket für das Steuerjahr ${taxYear} wurde erfolgreich erstellt.` });
      setTimeout(() => { handleClose(); }, 2000);
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      toast({ variant: "destructive", title: "Fehler", description: "Ticket konnte nicht erstellt werden: " + error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        hideCloseButton
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md max-h-[92vh] bg-card border border-border p-0 overflow-hidden shadow-[0_8px_40px_rgba(15,27,61,0.12)] rounded-3xl gap-0 flex flex-col"
      >
        {/* Hero */}
        <div className="relative h-36 bg-muted overflow-hidden shrink-0">
          <img src={ticketHero} alt="" className="w-full h-full object-cover" />
          <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-card/95 backdrop-blur px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm border border-border">
            <MessageSquarePlus className="w-3.5 h-3.5 text-primary" strokeWidth={1.8} />
            Support-Ticket
          </div>
          <button
            onClick={handleClose}
            className="absolute right-3 top-3 w-8 h-8 rounded-full bg-card/95 backdrop-blur flex items-center justify-center border border-border hover:bg-muted transition-colors"
            aria-label="Schliessen"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {isComplete ? (
          <div className="flex flex-col items-center justify-center px-6 py-10">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
              <CheckCircle className="w-7 h-7 text-emerald-500" strokeWidth={1.5} />
            </div>
            <DialogTitle className="text-[15px] font-semibold text-foreground mb-1.5 text-center">
              Ticket erstellt!
            </DialogTitle>
            <p className="text-muted-foreground text-center text-[12.5px]">
              Dein Support-Ticket wurde erfolgreich erstellt. Wir melden uns bald bei dir.
            </p>
          </div>
        ) : (
          <div className="px-6 pt-5 pb-6 overflow-y-auto">
            <div className="mb-5">
              <DialogTitle className="text-[15px] font-semibold text-foreground tracking-tight">
                Problem melden — {taxYear}
              </DialogTitle>
              <p className="text-[12.5px] text-muted-foreground mt-1">
                Beschreibe dein Anliegen — unser Team meldet sich zeitnah.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-foreground font-medium text-[12.5px]">
                  Titel <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Kurze Beschreibung des Problems"
                  className="bg-background border-border h-11 rounded-xl text-[13px] placeholder:text-muted-foreground/70 focus-visible:ring-primary/20 focus-visible:border-primary"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-foreground font-medium text-[12.5px]">
                  Beschreibung <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Detaillierte Beschreibung des Problems..."
                  className="bg-background border-border min-h-[110px] rounded-xl text-[13px] placeholder:text-muted-foreground/70 focus-visible:ring-primary/20 focus-visible:border-primary resize-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-foreground font-medium text-[12.5px]">
                  Anhänge <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-dashed border-border bg-primary/[0.03] hover:bg-primary/[0.06] transition-colors cursor-pointer">
                  <Paperclip className="w-4 h-4 text-primary" strokeWidth={1.8} />
                  <span className="text-[12.5px] text-foreground font-medium">Datei wählen</span>
                  <span className="text-[12px] text-muted-foreground ml-auto">
                    {attachments.length === 0 ? 'Keine Datei ausgewählt' : `${attachments.length} ausgewählt`}
                  </span>
                  <Input type="file" multiple onChange={handleFileUpload} className="hidden" accept="image/*,.pdf,.doc,.docx" />
                </label>

                {attachments.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-lg border border-border">
                        <span className="text-foreground text-[12.5px] truncate flex-1">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-muted-foreground hover:text-foreground rounded-md h-7 w-7 inline-flex items-center justify-center"
                          aria-label="Entfernen"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 h-12 rounded-2xl"
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !title.trim() || !description.trim()}
                  className="flex-1 h-12 rounded-2xl"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Erstelle...</>
                  ) : 'Absenden'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
