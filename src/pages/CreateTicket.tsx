
import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Paperclip, X, Loader2 } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const CreateTicket = () => {
  const { completedTaxReturnId, taxYear } = useParams<{ completedTaxReturnId: string; taxYear: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <div className="bg-zinc-950 text-zinc-200 min-h-screen relative overflow-x-hidden">
      {/* Ambient Background Gradients */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[128px] pointer-events-none" />

      {/* Main Page Layout */}
      <main className="w-full max-w-3xl mx-auto px-6 py-12 md:py-20 relative z-10">
        
        {/* Header Section */}
        <div className="mb-12">
          <div className="flex items-center space-x-4 text-zinc-400 mb-8">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-full hover:bg-zinc-900 hover:text-white transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform stroke-[1.5]" />
            </button>
            <span className="text-sm font-medium tracking-wide">Problem melden — {taxYear}</span>
          </div>

          <h1 className="text-4xl font-medium tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400 mb-3">
            Neues Ticket erstellen
          </h1>
          <p className="text-lg text-zinc-500 font-normal">
            Füllen Sie die Details unten aus, um den Support zu kontaktieren.
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Title Input */}
          <div className="space-y-3">
            <label htmlFor="title" className="text-sm font-medium text-zinc-300">
              Titel <span className="text-indigo-400">*</span>
            </label>
            <div className="relative group">
              <input 
                type="text" 
                id="title" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Kurze Beschreibung des Problems" 
                className="w-full bg-zinc-900 text-base border border-zinc-800 rounded-lg px-4 py-3 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all shadow-sm text-white"
                required
              />
            </div>
          </div>

          {/* Description Textarea */}
          <div className="space-y-3">
            <label htmlFor="description" className="text-sm font-medium text-zinc-300">
              Beschreibung <span className="text-indigo-400">*</span>
            </label>
            <div className="relative">
              <textarea 
                id="description" 
                rows={8} 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detaillierte Beschreibung des Problems oder der gewünschten Anpassung..." 
                className="w-full bg-zinc-900 text-base border border-zinc-800 rounded-lg px-4 py-3 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all resize-none shadow-sm text-white"
                required
              />
            </div>
          </div>

          {/* Attachments */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-zinc-300">
              Anhänge <span className="text-zinc-500 font-normal">(optional)</span>
            </label>
            <label 
              className="flex items-center justify-between w-full px-4 py-4 border border-dashed border-zinc-800 bg-zinc-900/50 rounded-lg cursor-pointer hover:bg-zinc-900 hover:border-zinc-700 transition-all group"
            >
              <div className="flex items-center space-x-4">
                <div className="p-2.5 bg-zinc-800 rounded-md group-hover:bg-zinc-700 transition-colors border border-zinc-700/50">
                  <Paperclip className="w-5 h-5 text-zinc-400 stroke-[1.5]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-200 transition-colors">Datei auswählen...</span>
                  <span className="text-xs text-zinc-500">JPG, PNG, PDF bis zu 10MB</span>
                </div>
              </div>
              <span className="text-xs text-zinc-600 px-3 py-1 rounded-full bg-zinc-800/50">
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
                    className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-3 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Paperclip className="w-4 h-4 text-zinc-500" />
                      <span className="text-sm text-zinc-300 truncate max-w-[200px]">{file.name}</span>
                      <span className="text-xs text-zinc-600">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-px w-full bg-zinc-900" />

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button 
              type="button"
              onClick={() => navigate(-1)}
              className="text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Abbrechen
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 text-sm font-semibold rounded-lg shadow-lg shadow-white/5 border border-transparent transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
