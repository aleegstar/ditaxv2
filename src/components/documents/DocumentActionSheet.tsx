import React, { useState, useEffect } from 'react';
import { Eye, Pencil, Trash2, X, Calendar, FileText, Image, Check, ChevronDown, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import EncryptedDocumentService from '@/services/EncryptedDocumentService';

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  upload_date: string;
  tax_year: string;
}

interface DocumentActionSheetProps {
  document: Document | null;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
  availableYears: string[];
}

const DocumentActionSheet: React.FC<DocumentActionSheetProps> = ({
  document,
  open,
  onClose,
  onUpdate,
  availableYears
}) => {
  const [view, setView] = useState<'actions' | 'preview' | 'edit' | 'delete'>('actions');
  const [editName, setEditName] = useState('');
  const [editYear, setEditYear] = useState('');
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // Cleanup object URLs on unmount or when closing
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (document && open) {
      setEditName(document.file_name);
      setEditYear(document.tax_year);
      setView('actions');
      // Clean up previous preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    }
  }, [document, open]);

  const handlePreview = async () => {
    if (!document) return;
    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Nicht angemeldet');
      }

      // Use EncryptedDocumentService to decrypt and download
      const encryptedDocService = EncryptedDocumentService.getInstance();
      const { blob, fileType } = await encryptedDocService.downloadOwnDecryptedDocument(
        document.id,
        user.id
      );

      // Create object URL for preview
      const objectUrl = URL.createObjectURL(blob);
      setPreviewUrl(objectUrl);
      setView('preview');
    } catch (error) {
      console.error('Error loading preview:', error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Vorschau konnte nicht geladen werden",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!document) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('uploaded_documents')
        .update({
          file_name: editName,
          tax_year: editYear
        })
        .eq('id', document.id);
      
      if (error) throw error;
      toast({
        title: "Gespeichert",
        description: "Dokument wurde aktualisiert"
      });
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating document:', error);
      toast({
        title: "Fehler",
        description: "Änderungen konnten nicht gespeichert werden",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!document) return;
    setLoading(true);
    try {
      // Soft delete - set status to deleted
      const { error } = await supabase
        .from('uploaded_documents')
        .update({ status: 'deleted' })
        .eq('id', document.id);
      
      if (error) throw error;
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Fehler",
        description: "Dokument konnte nicht gelöscht werden",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!open || !document) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 rounded-t-3xl max-h-[90vh] overflow-hidden"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>

            {/* Content */}
            <div className="px-6 pb-8">
              {/* Actions View */}
              {view === 'actions' && (
                <div className="space-y-4">
                  {/* Document Info Header */}
                  <div className="flex items-center gap-4 py-4 border-b border-slate-100">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0",
                      document.file_type?.startsWith('image/')
                        ? "bg-emerald-50 border border-emerald-100"
                        : "bg-red-50 border border-red-100"
                    )}>
                      {document.file_type?.startsWith('image/')
                        ? <Image className="w-6 h-6 text-emerald-600" strokeWidth={1.5} />
                        : <FileText className="w-6 h-6 text-red-600" strokeWidth={1.5} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-medium text-slate-900 truncate">{document.file_name}</p>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {format(new Date(document.upload_date), 'd. MMM yyyy', { locale: de })} • Steuerjahr {document.tax_year}
                      </p>
                    </div>
                    <button
                      onClick={onClose}
                      className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      <X className="w-5 h-5" strokeWidth={1.5} />
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <button
                      onClick={handlePreview}
                      disabled={loading}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 hover:border-slate-200 transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                        <Eye className="w-5 h-5 text-blue-600" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">Vorschau anzeigen</p>
                        <p className="text-xs text-slate-500">Dokument ansehen</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setView('edit')}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 hover:border-slate-200 transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                        <Pencil className="w-5 h-5 text-amber-600" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">Bearbeiten</p>
                        <p className="text-xs text-slate-500">Name oder Steuerjahr ändern</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setView('delete')}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-red-50 hover:border-red-100 transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                        <Trash2 className="w-5 h-5 text-red-600" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">Löschen</p>
                        <p className="text-xs text-slate-500">Dokument entfernen</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Preview View */}
              {view === 'preview' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <button
                      onClick={() => setView('actions')}
                      className="text-sm text-blue-600 font-medium"
                    >
                      ← Zurück
                    </button>
                    <h3 className="text-base font-medium text-slate-900">Vorschau</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" strokeWidth={1.5} />
                    </button>
                  </div>

                  {previewUrl && (
                    <div className="rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                      {document.file_type?.startsWith('image/') ? (
                        <img
                          src={previewUrl}
                          alt={document.file_name}
                          className="w-full max-h-[60vh] object-contain"
                        />
                      ) : (
                        <iframe
                          src={previewUrl}
                          className="w-full h-[60vh]"
                          title={document.file_name}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Edit View */}
              {view === 'edit' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between py-2">
                    <button
                      onClick={() => setView('actions')}
                      className="text-sm text-blue-600 font-medium"
                    >
                      ← Zurück
                    </button>
                    <h3 className="text-base font-medium text-slate-900">Bearbeiten</h3>
                    <div className="w-12" />
                  </div>

                  <div className="space-y-4">
                    {/* Name Input */}
                    <div className="space-y-2">
                      <label className="text-sm text-slate-500 font-medium ml-1">Dokumentname</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all"
                        placeholder="Dokumentname eingeben"
                      />
                    </div>

                    {/* Year Selector */}
                    <div className="space-y-2">
                      <label className="text-sm text-slate-500 font-medium ml-1">Steuerjahr</label>
                      <div className="relative">
                        <button
                          onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 flex items-center justify-between hover:border-slate-300 transition-colors"
                        >
                          <span>{editYear}</span>
                          <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform", isYearDropdownOpen && "rotate-180")} strokeWidth={1.5} />
                        </button>
                        
                        {isYearDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsYearDropdownOpen(false)} />
                            <div className="absolute top-full mt-2 left-0 right-0 z-20 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                              {availableYears.map(year => (
                                <button
                                  key={year}
                                  onClick={() => {
                                    setEditYear(year);
                                    setIsYearDropdownOpen(false);
                                  }}
                                  className={cn(
                                    "w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between",
                                    year === editYear 
                                      ? "bg-blue-50 text-blue-700" 
                                      : "text-slate-700 hover:bg-slate-50"
                                  )}
                                >
                                  {year}
                                  {year === editYear && <Check className="w-4 h-4 text-blue-600" strokeWidth={1.5} />}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <motion.button
                    onClick={handleSaveEdit}
                    disabled={loading || !editName.trim()}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full h-12 rounded-full bg-blue-600 text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_20px_-4px_rgba(59,130,246,0.4)] hover:shadow-[0_4px_24px_-4px_rgba(59,130,246,0.5)] hover:bg-blue-500 transition-all"
                  >
                    {loading ? 'Wird gespeichert...' : 'Speichern'}
                  </motion.button>
                </div>
              )}

              {/* Delete Confirmation View */}
              {view === 'delete' && (
                <div className="space-y-6 py-4">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-red-100 border border-red-200 flex items-center justify-center mx-auto">
                      <Trash2 className="w-8 h-8 text-red-600" strokeWidth={1.5} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium text-slate-900">Dokument löschen?</h3>
                      <p className="text-sm text-slate-500 max-w-[280px] mx-auto">
                        "{document.file_name}" wird unwiderruflich gelöscht.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setView('actions')}
                      className="flex-1 h-12 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-200 transition-colors"
                    >
                      Abbrechen
                    </button>
                    <motion.button
                      onClick={handleDelete}
                      disabled={loading}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 h-12 rounded-full bg-red-600 text-white font-semibold text-sm disabled:opacity-50 hover:bg-red-500 transition-colors shadow-[0_4px_16px_-4px_rgba(239,68,68,0.4)]"
                    >
                      {loading ? 'Wird gelöscht...' : 'Löschen'}
                    </motion.button>
                  </div>
                </div>
              )}
            </div>

            {/* Safe area padding */}
            <div className="h-[env(safe-area-inset-bottom)]" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DocumentActionSheet;
