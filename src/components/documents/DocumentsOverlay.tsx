import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FolderOpen, Plus, Search, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFormContext, FormProvider } from '@/contexts';
import { useTaxFiler } from '@/contexts/TaxFilerContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useI18n } from '@/contexts/I18nContext';
import { cn } from '@/lib/utils';
import EncryptedDocumentService from '@/services/EncryptedDocumentService';
import DocumentActionSheet from '@/components/documents/DocumentActionSheet';
import { DocumentThumbnail } from '@/components/documents/DocumentThumbnail';

interface DocumentsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const DocumentsOverlayContent: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t, language } = useI18n();
  const { activeTaxFilerId } = useTaxFiler();
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'type'>('date_desc');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadingRef = useRef(false);

  const allYears = React.useMemo(() => Array.from({ length: 11 }, (_, i) => (2024 + i).toString()), []);

  const loadDocuments = useCallback(async (showSpinner = true) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (showSpinner) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      let query = supabase
        .from('uploaded_documents')
        .select('*')
        .eq('user_id', user.id)
        .eq('tax_year', selectedYear)
        .eq('status', 'active');
      if (activeTaxFilerId) query = query.eq('tax_filer_id', activeTaxFilerId);
      const { data, error } = await query.order('upload_date', { ascending: false });
      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({ title: t.documentsPage.error, description: t.documentsPage.loadError, variant: 'destructive' });
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [selectedYear, activeTaxFilerId, toast, t]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  const uploadFilesDirectly = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: t.documentsPage.error, description: t.documentsPage.pleaseLogin, variant: 'destructive' });
      return;
    }
    let successCount = 0;
    let errorCount = 0;
    const encryptedDocService = EncryptedDocumentService.getInstance();
    for (const file of fileArray) {
      try {
        if (file.size > 10 * 1024 * 1024) { errorCount++; continue; }
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) { errorCount++; continue; }
        await encryptedDocService.uploadEncryptedDocument(file, null, user.id, selectedYear, undefined, activeTaxFilerId || null);
        successCount++;
      } catch { errorCount++; }
    }
    if (successCount > 0) {
      toast({
        title: t.documentsPage.uploadSuccess,
        description: `${successCount} ${successCount === 1 ? t.documentChecklist.file : t.documentChecklist.files} ${t.documentChecklist.uploaded}`,
      });
      loadDocuments(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFilesDirectly(e.target.files);
      e.target.value = '';
    }
  };

  const filteredDocuments = documents
    .filter(doc => doc.file_name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case 'date_desc': return new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime();
        case 'date_asc': return new Date(a.upload_date).getTime() - new Date(b.upload_date).getTime();
        case 'name_asc': return a.file_name.localeCompare(b.file_name, 'de');
        case 'name_desc': return b.file_name.localeCompare(a.file_name, 'de');
        case 'type': return (a.file_type || '').localeCompare(b.file_type || '', 'de');
        default: return 0;
      }
    });

  const sortOptions = [
    { value: 'date_desc', label: t.documentsPage.sortByDateDesc },
    { value: 'date_asc', label: t.documentsPage.sortByDateAsc },
    { value: 'name_asc', label: t.documentsPage.sortByNameAsc },
    { value: 'name_desc', label: t.documentsPage.sortByNameDesc },
    { value: 'type', label: t.documentsPage.sortByType },
  ] as const;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 pb-3"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
      >
        {/* Year selector */}
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-white">{t.documentsPage.taxYear}</span>
          <div className="relative">
            <button
              onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
              className="flex items-center gap-1 text-base text-white/60 hover:text-white transition-colors"
            >
              <span>{selectedYear}</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", isYearDropdownOpen && "rotate-180")} strokeWidth={1.5} />
            </button>
            {isYearDropdownOpen && (
              <>
                <div className="fixed inset-0 z-[199]" onClick={() => setIsYearDropdownOpen(false)} />
                <div className="absolute top-full left-0 mt-2 z-[200] bg-white/10 backdrop-blur-2xl rounded-xl border border-white/20 overflow-hidden min-w-[140px]">
                  <div className="max-h-64 overflow-y-auto py-1">
                    {allYears.map(year => (
                      <button
                        key={year}
                        onClick={() => { setSelectedYear(year); setIsYearDropdownOpen(false); }}
                        className={cn(
                          "w-full px-4 py-2.5 text-left text-sm transition-colors",
                          year === selectedYear ? "text-white font-medium bg-white/20" : "text-white/70 hover:bg-white/10"
                        )}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-[1.05] active:scale-[0.95]"
          style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 16px -2px rgba(0,0,0,0.12)',
          }}
        >
          <X className="w-4 h-4 text-zinc-800" strokeWidth={2} />
        </button>
      </div>

      {/* Search bar */}
      <div className="px-5 mb-4">
        <div className="relative flex items-center rounded-full overflow-hidden" style={{
          background: 'linear-gradient(180deg, hsl(222, 47%, 16%) 0%, hsl(222, 55%, 22%) 100%)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 4px 24px -4px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)',
        }}>
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-white/50" strokeWidth={1.5} />
          </div>
          <input
            type="text"
            placeholder={t.documentsPage.search}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-12 py-[18px] bg-transparent text-[15px] font-medium tracking-tight text-white placeholder:text-white/40 focus:outline-none transition-all"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1">
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <X className="h-4 w-4 text-white/40" strokeWidth={1.5} />
              </button>
            )}
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className={cn("p-1.5 rounded-lg hover:bg-white/10 transition-colors", showSortDropdown && "bg-white/10")}
            >
              <SlidersHorizontal className="h-4 w-4 text-white/40" strokeWidth={1.5} />
            </button>
          </div>
        </div>
        {showSortDropdown && (
          <>
            <div className="fixed inset-0 z-[59]" onClick={() => setShowSortDropdown(false)} />
            <div className="absolute right-5 mt-2 z-[60] bg-white/10 backdrop-blur-2xl rounded-xl border border-white/20 overflow-hidden min-w-[200px]">
              <div className="py-1">
                {sortOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => { setSortBy(option.value); setShowSortDropdown(false); }}
                    className={cn(
                      "w-full px-4 py-2.5 text-left text-sm transition-colors",
                      sortBy === option.value ? "text-white font-medium bg-white/20" : "text-white/70 hover:bg-white/10"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Scrollable document grid */}
      <div className="flex-1 overflow-y-auto px-5 pb-32" style={{ WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        ) : documents.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {filteredDocuments.map(doc => {
              const isImage = doc.file_type?.startsWith('image/');
              const fileExt = doc.file_name?.split('.').pop()?.toUpperCase() || 'FILE';
              const uploadDate = new Date(doc.upload_date).toLocaleDateString(
                language === 'de' ? 'de-CH' : 'en-GB',
                { day: '2-digit', month: '2-digit', year: 'numeric' }
              );
              return (
                <button
                  key={doc.id}
                  onClick={() => { setSelectedDocument(doc); setShowActionSheet(true); }}
                  className="group relative flex flex-col bg-white/[0.08] backdrop-blur-sm p-3 rounded-2xl text-left transition-all duration-300 cursor-pointer border border-white/10 hover:border-white/25 hover:bg-white/[0.12]"
                >
                  <div className="aspect-square w-full rounded-xl overflow-hidden bg-white/5 mb-3">
                    {isImage ? (
                      <DocumentThumbnail doc={doc} />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-white/5 via-white/10 to-white/5 relative overflow-hidden">
                        <div className="absolute -top-8 -right-8 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-violet-400/10 rounded-full blur-2xl" />
                        <div className="relative z-10 w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25 flex items-center justify-center">
                          <span className="px-2 py-0.5 rounded-full bg-white/90 text-[10px] font-bold text-blue-600">
                            {fileExt}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="px-1 pb-1">
                    <p className="text-sm font-medium text-white truncate leading-snug mb-0.5">{doc.file_name}</p>
                    <p className="text-xs text-white/40">{uploadDate}</p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-[hsl(var(--primary))] to-[hsl(221,100%,42%)] flex items-center justify-center mb-5 shadow-[0_8px_24px_-6px_rgba(29,100,255,0.3)]">
              <FolderOpen strokeWidth={1.5} className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-white tracking-tight mb-1">{t.documentsPage.collectReceipts}</h2>
            <p className="text-sm text-white/50 max-w-[260px] mx-auto text-center leading-relaxed">
              {t.documentsPage.collectReceiptsDescription}
            </p>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Floating upload pill – same design as chat input bar */}
      {createPortal(
        <div className="fixed inset-x-0 bottom-0 z-[10001] px-4 pb-[max(12px,env(safe-area-inset-bottom))] pointer-events-none">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex items-center gap-4 rounded-full px-[18px] py-[21px] h-[60px] cursor-pointer transition-all duration-200 active:scale-[0.98] overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, hsl(222, 47%, 16%) 0%, hsl(222, 55%, 22%) 100%)',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 4px 24px -4px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)',
              }}
            >
              <span className="text-[15px] flex-1 select-none font-medium tracking-tight text-white/50">
                {t.documentsPage.upload}
              </span>
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <Plus className="w-4 h-4 text-white/50" strokeWidth={2} />
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Document action sheet */}
      <DocumentActionSheet
        document={selectedDocument}
        open={showActionSheet}
        onClose={() => { setShowActionSheet(false); setSelectedDocument(null); }}
        onUpdate={loadDocuments}
        availableYears={allYears}
        isLocked={false}
      />
    </div>
  );
};

export const DocumentsOverlay: React.FC<DocumentsOverlayProps> = ({ isOpen, onClose }) => {
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('hide-bottom-navbar');
      document.body.setAttribute('data-documents-overlay', 'true');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('hide-bottom-navbar');
      document.body.removeAttribute('data-documents-overlay');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('hide-bottom-navbar');
      document.body.removeAttribute('data-documents-overlay');
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="documents-overlay"
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[10000] flex flex-col"
          style={{
            background: 'linear-gradient(180deg, hsl(222, 30%, 8%) 0%, hsl(222, 40%, 12%) 60%, hsl(220, 80%, 30%) 100%)',
          }}
        >
          <FormProvider taxYear={currentYear.toString()}>
            <DocumentsOverlayContent onClose={onClose} />
          </FormProvider>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
