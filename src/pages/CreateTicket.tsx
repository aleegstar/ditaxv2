
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { SubpageHeader } from "@/components/ui/subpage-header";

const CreateTicket = () => {
  const { completedTaxReturnId, taxYear } = useParams<{ completedTaxReturnId: string; taxYear: string }>();
  const navigate = useNavigate();
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

    if (!completedTaxReturnId) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Ungültige Steuererklärung."
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

      // Navigate to tickets page
      navigate('/tickets');

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
    <div className="container mx-auto p-6 max-w-2xl">
      <SubpageHeader 
        title={`Problem melden - ${taxYear}`}
        onBack={() => navigate(-1)}
        className="mb-6"
      />

      <Card>
        <CardHeader>
          <CardTitle>Neues Ticket erstellen</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="block mb-3 text-[#718096] text-base font-medium">Titel *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Kurze Beschreibung des Problems"
                className="min-h-[56px] px-6 py-4 text-base rounded-xl border border-[#E2E8F0] bg-white text-foreground placeholder:text-muted-foreground shadow-none focus:shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#E2E8F0]"
                required
              />
            </div>

            <div>
              <Label className="block mb-3 text-[#718096] text-base font-medium">Beschreibung *</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detaillierte Beschreibung des Problems oder der gewünschten Anpassung..."
                className="min-h-[150px] px-6 py-4 text-base rounded-xl border border-[#E2E8F0] bg-white text-foreground placeholder:text-muted-foreground shadow-none focus:shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#E2E8F0]"
                required
              />
            </div>

            <div>
              <Label className="block mb-3 text-[#718096] text-base font-medium">Anhänge (optional)</Label>
              <div className="space-y-2">
                <Input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  accept="image/*,.pdf,.doc,.docx"
                  className="min-h-[56px] px-6 py-4 text-base rounded-xl border border-[#E2E8F0] bg-white text-foreground placeholder:text-muted-foreground shadow-none focus:shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#E2E8F0] file:bg-transparent file:text-foreground"
                />
                
                {attachments.length > 0 && (
                  <div className="space-y-1">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                        <span className="text-sm text-foreground truncate">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                          className="text-foreground"
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
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1 rounded-full"
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
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateTicket;
