import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Paperclip, X, Loader2, MessageSquarePlus, CheckCircle } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
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
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Bitte fülle alle Pflichtfelder aus."
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht authentifiziert');

      // Create the ticket
      const {
        data: ticket,
        error: ticketError
      } = await supabase.from('support_tickets').insert({
        user_id: user.id,
        completed_tax_return_id: completedTaxReturnId,
        title,
        description,
        status: 'open',
        priority: 'medium'
      }).select().single();
      if (ticketError) throw ticketError;

      // Upload attachments if any
      if (attachments.length > 0) {
        for (const file of attachments) {
          const fileName = `${user.id}/${ticket.id}/${Date.now()}-${file.name}`;
          const {
            error: uploadError
          } = await supabase.storage.from('ticket-attachments').upload(fileName, file);
          if (uploadError) {
            console.error('Upload error:', uploadError);
            continue;
          }

          // Save attachment metadata
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
      toast({
        title: "Ticket erstellt",
        description: `Dein Ticket für das Steuerjahr ${taxYear} wurde erfolgreich erstellt.`
      });
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Ticket konnte nicht erstellt werden: " + error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md max-h-[90vh] bg-white border-0 p-0 overflow-hidden shadow-2xl rounded-3xl gap-0">
        {isComplete ? <div className="flex flex-col items-center justify-center py-16 px-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-500 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/30">
              <CheckCircle className="w-10 h-10 text-white" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Ticket erstellt!
            </h2>
            <p className="text-slate-500 text-center text-sm">
              Dein Support-Ticket wurde erfolgreich erstellt. Wir melden uns bald bei dir.
            </p>
          </div> : <>
            {/* Header with gradient background */}
            <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 px-6 py-3">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                  <MessageSquarePlus className="w-5 h-5 text-white" strokeWidth={1.5} />
                </div>
                <div>
                  <DialogTitle className="text-white font-semibold">
                    Problem melden — {taxYear}
                  </DialogTitle>
                  <p className="text-sm text-slate-400 mt-0.5">
                    Support-Ticket erstellen
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Title Input */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-slate-800 font-medium text-sm">
                  Titel <span className="text-red-500">*</span>
                </Label>
                <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Kurze Beschreibung des Problems" className="bg-white border-slate-200 h-12 rounded-xl text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20" required />
              </div>

              {/* Description Input */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-slate-800 font-medium text-sm">
                  Beschreibung <span className="text-red-500">*</span>
                </Label>
                <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Detaillierte Beschreibung des Problems oder der gewünschten Anpassung..." className="bg-white border-slate-200 min-h-[120px] rounded-xl text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20 resize-none" required />
              </div>

              {/* Attachments */}
              <div className="space-y-3">
                <Label className="text-slate-800 font-medium text-sm">
                  Anhänge <span className="text-slate-400 font-normal">(optional)</span>
                </Label>
                
                <label className="flex items-center gap-4 p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 hover:bg-slate-100/80 transition-colors cursor-pointer group">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 group-hover:border-slate-300 transition-colors">
                    <Paperclip className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-700 text-sm">Datei auswählen...</p>
                    <p className="text-xs text-slate-400">JPG, PNG, PDF bis zu 10MB</p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {attachments.length === 0 ? 'Keine ausgewählt' : `${attachments.length} ausgewählt`}
                  </span>
                  <Input type="file" multiple onChange={handleFileUpload} className="hidden" accept="image/*,.pdf,.doc,.docx" />
                </label>
                
                {attachments.length > 0 && <div className="space-y-2">
                    {attachments.map((file, index) => <div key={index} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-slate-700 text-sm truncate flex-1">{file.name}</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeAttachment(index)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg h-8 w-8 p-0">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>)}
                  </div>}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={handleClose} className="flex-1 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium">
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isSubmitting || !title.trim() || !description.trim()} className="flex-1 h-12 rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:shadow-none">
                  {isSubmitting ? <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Erstelle...
                    </> : 'Ticket absenden'}
                </Button>
              </div>
            </form>
          </>}
      </DialogContent>
    </Dialog>;
};