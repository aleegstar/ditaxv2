
import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Paperclip, X, Loader2 } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { sanitizeFileName } from '@/utils/fileValidation';
import { toast } from "@/hooks/use-toast";
import { SubpageHeader } from '@/components/ui/subpage-header';

const CreateTicket = () => {
  const { completedTaxReturnId, taxYear } = useParams<{ completedTaxReturnId: string; taxYear: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSignature, setIsCheckingSignature] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if tax return is already signed - if so, redirect
  React.useEffect(() => {
    const checkSignatureStatus = async () => {
      if (!completedTaxReturnId) {
        setIsCheckingSignature(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/auth');
          return;
        }

        // Check completed_tax_returns for signature_status
        const { data: taxReturn } = await supabase
          .from('completed_tax_returns')
          .select('signature_status')
          .eq('id', completedTaxReturnId)
          .eq('user_id', user.id)
          .single();

        // Also check tax_return_signatures table
        const { data: signature } = await supabase
          .from('tax_return_signatures')
          .select('status')
          .eq('completed_tax_return_id', completedTaxReturnId)
          .eq('user_id', user.id)
          .maybeSingle();

        const isSigned = taxReturn?.signature_status === 'signed' || signature?.status === 'signed';

        if (isSigned) {
          toast({
            variant: "destructive",
            title: "Ticket nicht möglich",
            description: "Tickets können nur erstellt werden, bevor die Steuererklärung unterschrieben wurde."
          });
          navigate(-1);
          return;
        }
      } catch (error) {
        console.error('Error checking signature status:', error);
      } finally {
        setIsCheckingSignature(false);
      }
    };

    checkSignatureStatus();
  }, [completedTaxReturnId, navigate]);

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
          // SECURITY: Sanitize file name to prevent path traversal attacks
          const safeFileName = sanitizeFileName(file.name);
          const fileName = `${user.id}/${ticket.id}/${Date.now()}-${safeFileName}`;
          
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

  if (isCheckingSignature) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#1D64FF]" />
      </div>
    );
  }

  return (
    <div className="bg-white text-slate-700 min-h-screen relative overflow-x-hidden">
      <SubpageHeader 
        title="Neues Ticket erstellen" 
        onBack={() => navigate(-1)} 
      />

      {/* Main Page Layout */}
      <main className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 relative z-10">
        
        {/* Header Section */}
        <div className="mb-8">
          <p className="text-sm text-slate-500 mb-2">Problem melden — {taxYear}</p>
          <p className="text-base text-slate-500 font-normal">
            Fülle die Details unten aus, um den Support zu kontaktieren.
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Title Input */}
          <div className="space-y-3">
            <label htmlFor="title" className="text-sm font-medium text-slate-700">
              Titel <span className="text-[#1D64FF]">*</span>
            </label>
            <div className="relative group">
              <input 
                type="text" 
                id="title" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Kurze Beschreibung des Problems" 
                className="w-full bg-slate-50 text-base border border-slate-200 rounded-lg px-4 py-3 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D64FF]/20 focus:border-[#1D64FF]/50 transition-all shadow-sm text-slate-800"
                required
              />
            </div>
          </div>

          {/* Description Textarea */}
          <div className="space-y-3">
            <label htmlFor="description" className="text-sm font-medium text-slate-700">
              Beschreibung <span className="text-[#1D64FF]">*</span>
            </label>
            <div className="relative">
              <textarea 
                id="description" 
                rows={8} 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detaillierte Beschreibung des Problems oder der gewünschten Anpassung..." 
                className="w-full bg-slate-50 text-base border border-slate-200 rounded-lg px-4 py-3 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D64FF]/20 focus:border-[#1D64FF]/50 transition-all resize-none shadow-sm text-slate-800"
                required
              />
            </div>
          </div>

          {/* Attachments */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">
              Anhänge <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <label 
              className="flex items-center justify-between w-full px-4 py-4 border border-dashed border-slate-300 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 hover:border-slate-400 transition-all group"
            >
              <div className="flex items-center space-x-4">
                <div className="p-2.5 bg-white rounded-md group-hover:bg-slate-50 transition-colors border border-slate-200">
                  <Paperclip className="w-5 h-5 text-slate-500 stroke-[1.5]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-800 transition-colors">Datei auswählen...</span>
                  <span className="text-xs text-slate-400">JPG, PNG, PDF bis zu 10MB</span>
                </div>
              </div>
              <span className="text-xs text-slate-400 px-3 py-1 rounded-full bg-slate-100">
                {attachments.length === 0 ? 'Keine ausgewählt' : `${attachments.length} Datei(en)`}
              </span>
              <input 
                ref={fileInputRef}
                type="file" 
                multiple
                onChange={handleFileUpload}
                accept="image/*,.pdf,.doc,.docx"
                className="hidden" 
              />
            </label>

            {/* Attachment List */}
            {attachments.length > 0 && (
              <div className="space-y-2 mt-3">
                {attachments.map((file, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Paperclip className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-700 truncate max-w-[200px]">{file.name}</span>
                      <span className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="p-1.5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-px w-full bg-slate-200" />

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button 
              type="button"
              onClick={() => navigate(-1)}
              className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              Abbrechen
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-[#1D64FF] hover:bg-[#1D64FF]/90 text-white text-sm font-semibold rounded-lg shadow-lg shadow-blue-500/20 border border-transparent transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? 'Erstelle...' : 'Ticket absenden'}
            </button>
          </div>

        </form>
      </main>
    </div>
  );
};

export default CreateTicket;
