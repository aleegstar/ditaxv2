
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, X } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CreateTicketDialogProps {
  isOpen: boolean;
  onClose: () => void;
  completedTaxReturnId: string;
  taxYear: string;
}

export const CreateTicketDialog = ({ isOpen, onClose, completedTaxReturnId, taxYear }: CreateTicketDialogProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Bitte füllen Sie alle Pflichtfelder aus."
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht authentifiziert');

      // Create the ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          completed_tax_return_id: completedTaxReturnId,
          title,
          description,
          status: 'open',
          priority: 'medium'
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Upload attachments if any
      if (attachments.length > 0) {
        for (const file of attachments) {
          const fileName = `${user.id}/${ticket.id}/${Date.now()}-${file.name}`;
          
          const { error: uploadError } = await supabase.storage
            .from('ticket-attachments')
            .upload(fileName, file);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            continue;
          }

          // Save attachment metadata
          await supabase
            .from('ticket_attachments')
            .insert({
              ticket_id: ticket.id,
              file_name: file.name,
              file_path: fileName,
              file_type: file.type,
              file_size: file.size,
              uploaded_by: user.id
            });
        }
      }

      toast({
        title: "Ticket erstellt",
        description: `Ihr Ticket für das Steuerjahr ${taxYear} wurde erfolgreich erstellt.`
      });

      // Reset form
      setTitle('');
      setDescription('');
      setAttachments([]);
      onClose();

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto z-[102] relative">
        <DialogHeader>
          <DialogTitle className="text-white">Problem melden - {taxYear}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-white">Titel *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Kurze Beschreibung des Problems"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              required
            />
          </div>

          <div>
            <Label className="text-white">Beschreibung *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detaillierte Beschreibung des Problems oder der gewünschten Anpassung..."
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[100px]"
              required
            />
          </div>

          <div>
            <Label className="text-white">Anhänge (optional)</Label>
            <div className="space-y-2">
              <Input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="bg-white/10 border-white/20 text-white file:bg-white/20 file:text-white file:border-0 file:rounded"
                accept="image/*,.pdf,.doc,.docx"
              />
              
              {attachments.length > 0 && (
                <div className="space-y-1">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-white/10 p-2 rounded">
                      <span className="text-white text-sm truncate">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                        className="text-white/70 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-full"
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-full"
            >
              {isSubmitting ? 'Erstelle...' : 'Ticket erstellen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
