import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { useFormContext } from '../contexts';
import { ChecklistItem } from '../types';
import { Check, ChevronUp, ChevronRight, RefreshCw, AlertTriangle, Eye, Folder, Trash2, User, Briefcase, Home, Calculator, Plus, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from '@/hooks/use-toast';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNavigate } from 'react-router-dom';
import { useDocuments } from '@/hooks/use-documents';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { DocumentMetadata } from '@/services/DocumentService';
import { BorderBeam } from '@/components/ui/border-beam';

import DocumentViewer from './DocumentViewer';
import DocumentAssignmentModal from '@/components/documents/DocumentAssignmentModal';
import { supabase } from '@/integrations/supabase/client';
import { debug } from '@/utils/debug';
import { SubpageHeader } from '@/components/ui/subpage-header';

const DocumentChecklist: React.FC = () => {
  const {
    checklistItems,
    generateChecklist,
    markUploaded,
    formProgress,
    updateFormProgress,
    formData,
    formDataLoaded,
    setCurrentStep,
    taxYear
  } = useFormContext();
  const {
    documents,
    isLoading,
    error,
    refreshDocuments,
    deleteDocument,
    getDocumentsForItem,
    hasDocuments
  } = useDocuments();
  
  // Memoized calculations to prevent unnecessary re-renders
  const categorizedItemsMemo = useMemo(() => {
    const categories = {
      general: checklistItems.filter(item => item.category === 'general'),
      income: checklistItems.filter(item => item.category === 'income'),
      assets: checklistItems.filter(item => item.category === 'assets'),
      deductions: checklistItems.filter(item => item.category === 'deductions')
    };
    return categories;
  }, [checklistItems]);

  const documentsByItem = useMemo(() => {
    const map: {[key: string]: any[]} = {};
    checklistItems.forEach(item => {
      map[item.id] = getDocumentsForItem(item.id);
    });
    return map;
  }, [documents, checklistItems, getDocumentsForItem]);
  
  const {
    userId,
    isValid: isAuthValid,
    isLoading: isAuthLoading,
    validateSession
  } = useAuthValidation();
  
  const [viewerDocuments, setViewerDocuments] = useState<DocumentMetadata[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [assignmentModal, setAssignmentModal] = useState<{
    open: boolean;
    item: ChecklistItem | null;
  }>({
    open: false,
    item: null
  });
  const [unassignedDocsCounts, setUnassignedDocsCounts] = useState<Record<string, number>>({});
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  
  const handleNext = () => {
    navigate('/payment');
  };
  
  const handleBack = () => {
    navigate('/form?section=deductions');
  };
  
  const handleUploadDocument = (itemId: string) => {
    navigate(`/form/documents/upload/${itemId}?year=${taxYear}`);
  };
  
  useEffect(() => {
    if (!isAuthLoading && !isAuthValid) {
      toast({
        title: "Authentifizierung erforderlich",
        description: "Du musst angemeldet sein, um deine Dokumente zu verwalten.",
        variant: "destructive"
      });
    }
  }, [isAuthLoading, isAuthValid]);
  
  const userDocuments = documents.filter(doc => {
    if (!userId) return false;
    return true;
  });
  
  // Optimized document status tracking using memoized values
  const documentStatus = useMemo(() => {
    const itemsWithDocs = new Set<string>();
    userDocuments.forEach(doc => {
      if (doc.checklistItemId) {
        itemsWithDocs.add(doc.checklistItemId);
      }
    });
    return itemsWithDocs;
  }, [userDocuments]);

  useEffect(() => {
    if (checklistItems.length > 0) {
      checklistItems.forEach(item => {
        const hasDocuments = documentStatus.has(item.id);
        if (item.uploaded !== hasDocuments) {
          markUploaded(item.id, hasDocuments);
        }
      });
    }
  }, [documentStatus, checklistItems, markUploaded]);
  
  useEffect(() => {
    if (!initialLoadComplete && !isLoading) {
      setInitialLoadComplete(true);
    }
  }, [isLoading, initialLoadComplete]);

  // Load unassigned documents count for current year
  const loadUnassignedDocsCount = useCallback(async () => {
    if (!userId || !taxYear) return;
    try {
      const {
        data,
        error
      } = await supabase.from('uploaded_documents').select('id, checklist_item_id').eq('user_id', userId).eq('status', 'active').eq('is_assigned_to_checklist', false).eq('tax_year', taxYear);
      if (error) {
        debug.error('Error loading unassigned documents:', error);
        return;
      }

      // Count documents by what they could be assigned to
      const counts: Record<string, number> = {};
      checklistItems.forEach(item => {
        counts[item.id] = data?.length || 0;
      });
      setUnassignedDocsCounts(counts);
    } catch (error) {
      debug.error('Error in loadUnassignedDocsCount:', error);
    }
  }, [userId, taxYear, checklistItems]);
  
  const hasLoadedCountsRef = useRef(false);
  
  useEffect(() => {
    if (userId && taxYear && checklistItems.length > 0 && !hasLoadedCountsRef.current) {
      hasLoadedCountsRef.current = true;
      loadUnassignedDocsCount();
    }
  }, [userId, taxYear, checklistItems.length, loadUnassignedDocsCount]);
  
  // Optimized checklist generation with ref to prevent loops
  const hasGeneratedRef = useRef(false);
  const lastFormDataHashRef = useRef('');
  
  const shouldGenerateChecklist = useMemo(() => {
    const formDataHash = JSON.stringify(formData);
    const hasChanged = formDataHash !== lastFormDataHashRef.current;
    return formDataLoaded && checklistItems.length === 0 && !isLoading && hasChanged && !hasGeneratedRef.current;
  }, [formDataLoaded, checklistItems.length, isLoading, formData]);

  useEffect(() => {
    if (shouldGenerateChecklist) {
      console.log('Generating checklist based on form data...');
      hasGeneratedRef.current = true;
      lastFormDataHashRef.current = JSON.stringify(formData);
      generateChecklist();
      
      setTimeout(() => {
        hasGeneratedRef.current = false;
      }, 2000);
    }
  }, [shouldGenerateChecklist, generateChecklist, formData]);
  
  const handleDocumentDeleted = async (docId: string, checklistItemId: string) => {
    const success = await deleteDocument(docId, checklistItemId);
    if (success) {
      const hasRemainingDocs = userDocuments.some(doc => doc.checklistItemId === checklistItemId && doc.id !== docId);
      if (!hasRemainingDocs) {
        markUploaded(checklistItemId, false);
      }
    }
  };
  
  const handleDocumentRefresh = useCallback(() => {
    refreshDocuments();
  }, [refreshDocuments]);
  
  const toggleCategory = (category: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };
  
  const categoryMap: Record<string, string> = {
    'general': 'Allgemeine Dokumente',
    'income': 'Einkommen',
    'assets': 'Vermögen',
    'deductions': 'Abzüge'
  };
  
  const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    'general': User,
    'income': Briefcase,
    'assets': Home,
    'deductions': Calculator
  };
  
  const categorizedItems = categorizedItemsMemo;

  // Calculate initial category status based on completion
  const calculateInitialCategoryStatus = useCallback(() => {
    const status: Record<string, boolean> = {};
    Object.keys(categorizedItems).forEach(category => {
      const items = categorizedItems[category] || [];
      const requiredItems = items.filter(item => item.required);

      if (requiredItems.length === 0) {
        status[category] = false;
      } else {
        const hasIncompleteUploads = requiredItems.some(item => !item.uploaded);
        status[category] = hasIncompleteUploads;
      }
    });
    return status;
  }, [categorizedItems]);

  // Initialize categories based on completion status, but only once
  useEffect(() => {
    if (checklistItems.length > 0 && userDocuments.length >= 0 && initialLoadComplete && Object.keys(openCategories).length === 0) {
      const initialStatus = calculateInitialCategoryStatus();
      setOpenCategories(initialStatus);
    }
  }, [checklistItems.length, userDocuments.length, initialLoadComplete, openCategories, calculateInitialCategoryStatus]);
  
  const getUserDocumentsForItem = useCallback((itemId: string) => {
    return userDocuments.filter(doc => doc.checklistItemId === itemId);
  }, [userDocuments]);
  
  const handleViewDocuments = (itemId: string, initialIndex = 0) => {
    const itemDocuments = getUserDocumentsForItem(itemId);
    if (itemDocuments.length > 0) {
      setViewerDocuments(itemDocuments);
      setViewerInitialIndex(initialIndex);
      setViewerOpen(true);
    } else {
      toast({
        title: "Keine Dokumente",
        description: "Für diesen Punkt wurden keine Dokumente gefunden.",
        variant: "default"
      });
    }
  };
  
  const handleCloseViewer = () => {
    setViewerOpen(false);
    setViewerDocuments([]);
    setViewerInitialIndex(0);
  };
  
  const getCategoryProgress = (category: string) => {
    const items = categorizedItems[category] || [];
    if (items.length === 0) return "0/0";
    const uploadedCount = items.filter(item => item.uploaded).length;
    return `${uploadedCount}/${items.length}`;
  };
  
  const isCategoryComplete = (category: string) => {
    const items = categorizedItems[category] || [];
    if (items.length === 0) return false;
    return items.every(item => item.uploaded);
  };
  
  const handleForceGeneration = () => {
    generateChecklist();
    refreshDocuments();
    toast({
      title: "Aktualisierung gestartet",
      description: "Die Dokumentenliste wird aktualisiert."
    });
  };
  
  const areRequiredDocumentsUploaded = () => {
    const requiredItems = checklistItems.filter(item => item.required);
    return requiredItems.length > 0 && requiredItems.every(item => item.uploaded);
  };

  // Auto-update documents progress when all required documents are uploaded
  useEffect(() => {
    if (checklistItems.length > 0 && !isLoading) {
      const allRequiredUploaded = areRequiredDocumentsUploaded();
      if (allRequiredUploaded && !formProgress.documents) {
        updateFormProgress('documents' as any, true);
      } else if (!allRequiredUploaded && formProgress.documents) {
        updateFormProgress('documents' as any, false);
      }
    }
  }, [checklistItems, documents, updateFormProgress, formProgress.documents, isLoading]);
  
  const handleAuthRefresh = async () => {
    await validateSession();
    refreshDocuments();
  };
  
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#020408]">
        <div className="fixed inset-0 pointer-events-none -z-10" style={{
          background: 'radial-gradient(circle at 50% 30%, rgba(29, 100, 255, 0.08) 0%, rgba(29, 100, 255, 0.02) 40%, transparent 60%)',
          filter: 'blur(80px)'
        }} />
        <div className="p-6 pt-24">
          <Skeleton className="h-16 w-full mb-4 bg-white/[0.02]" />
          <Skeleton className="h-16 w-full mb-4 bg-white/[0.02]" />
          <Skeleton className="h-16 w-full bg-white/[0.02]" />
        </div>
      </div>
    );
  }
  
  if (!isAuthValid) {
    return (
      <div className="min-h-screen bg-[#020408]">
        <div className="fixed inset-0 pointer-events-none -z-10" style={{
          background: 'radial-gradient(circle at 50% 30%, rgba(29, 100, 255, 0.08) 0%, rgba(29, 100, 255, 0.02) 40%, transparent 60%)',
          filter: 'blur(80px)'
        }} />
        <div className="p-6 pt-24">
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 backdrop-blur-md">
            <AlertTriangle className="h-4 w-4 text-red-300" />
            <AlertTitle className="text-red-300">Authentifizierung erforderlich</AlertTitle>
            <AlertDescription className="text-red-200">
              Du musst angemeldet sein, um deine Dokumente zu verwalten.
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={() => navigate('/auth', { state: { from: '/form' } })} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  Zur Anmeldung
                </Button>
                <Button size="sm" onClick={handleAuthRefresh} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Session prüfen
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }
  
  if (!initialLoadComplete || (isLoading && checklistItems.length === 0)) {
    return (
      <div className="min-h-screen bg-[#020408]">
        <div className="fixed inset-0 pointer-events-none -z-10" style={{
          background: 'radial-gradient(circle at 50% 30%, rgba(29, 100, 255, 0.08) 0%, rgba(29, 100, 255, 0.02) 40%, transparent 60%)',
          filter: 'blur(80px)'
        }} />
        <div className="p-6 pt-24">
          <Skeleton className="h-16 w-full mb-4 bg-white/[0.02]" />
          <Skeleton className="h-16 w-full mb-4 bg-white/[0.02]" />
          <Skeleton className="h-16 w-full bg-white/[0.02]" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#020408] text-zinc-200">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none -z-10" style={{
        background: 'radial-gradient(circle at 50% 30%, rgba(29, 100, 255, 0.08) 0%, rgba(29, 100, 255, 0.02) 40%, transparent 60%)',
        filter: 'blur(80px)'
      }} />
      
      {/* Header */}
      <header className="h-24 shrink-0 flex items-center justify-center px-6 relative z-30">
        <button 
          onClick={handleBack}
          className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <h1 className="text-[15px] font-medium text-zinc-200 tracking-normal">Unterlagen</h1>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-2">
        <div className="max-w-[600px] mx-auto space-y-4 pb-24">
          
          {error && (
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 backdrop-blur-md">
              <AlertTriangle className="h-4 w-4 text-red-300" />
              <AlertTitle className="text-red-300">Fehler beim Laden der Dokumente</AlertTitle>
              <AlertDescription className="text-red-200">
                {error}
                <div className="mt-2">
                  <Button size="sm" onClick={() => navigate('/auth', { state: { from: '/form' } })} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                    Zur Anmeldung
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {Object.keys(categorizedItems).length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/80 mb-4">
                Die Dokumenten-Checkliste wird basierend auf deinen Angaben erstellt.
                {!formDataLoaded && " Bitte warte, während deine Daten geladen werden."}
              </p>
              <Button onClick={handleForceGeneration} className="bg-[#1D64FF] hover:bg-[#1D64FF]/90 text-white" disabled={isLoading}>
                {isLoading ? "Wird geladen..." : "Checkliste jetzt generieren"}
              </Button>
            </div>
          ) : (
            Object.entries(categorizedItems).map(([category, items]) => {
              const isComplete = isCategoryComplete(category);
              const isOpen = openCategories[category];
              const Icon = categoryIcons[category];
              
              return (
                <Collapsible 
                  key={category} 
                  open={isOpen} 
                  onOpenChange={open => {
                    setOpenCategories(prev => ({
                      ...prev,
                      [category]: open
                    }));
                  }}
                >
                  {/* Collapsed State - Glass Panel */}
                  {!isOpen ? (
                    <CollapsibleTrigger className="group w-full rounded-xl transition-all duration-300" style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                      <div className="w-full flex items-center justify-between p-4 text-left group-hover:bg-white/[0.02]">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                            isComplete 
                              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500"
                              : "bg-zinc-900 border border-white/5 text-zinc-400 group-hover:text-zinc-200 group-hover:border-white/10"
                          )}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className="text-base font-medium text-zinc-200 group-hover:text-white">
                            {categoryMap[category]}
                          </span>
                        </div>
                        {isComplete ? (
                          <Check className="w-5 h-5 text-emerald-500" strokeWidth={1.5} />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors" strokeWidth={1.5} />
                        )}
                      </div>
                    </CollapsibleTrigger>
                  ) : (
                    /* Expanded State - Blue Border */
                    <div className="bg-[#020408] rounded-xl border border-[#1D64FF]/20 overflow-hidden transition-all duration-300">
                      <CollapsibleTrigger className="w-full flex items-center justify-between p-4 text-left border-b border-white/[0.04]">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-[#1D64FF]/10 border border-[#1D64FF]/20 flex items-center justify-center text-[#1D64FF]">
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className="text-base font-semibold text-white">
                            {categoryMap[category]}
                          </span>
                        </div>
                        <ChevronUp className="w-5 h-5 text-[#1D64FF]" strokeWidth={1.5} />
                      </CollapsibleTrigger>

                      <CollapsibleContent className="p-5 bg-white/[0.01]">
                        <div className="space-y-5">
                          {items.map(item => {
                            const itemFiles = getUserDocumentsForItem(item.id);
                            const fileCount = itemFiles.length;
                            const hasUnassignedDocs = (unassignedDocsCounts[item.id] || 0) > 0;
                            
                            return (
                              <div 
                                key={item.id} 
                                className="rounded-2xl p-6 md:p-8 text-center relative overflow-hidden bg-gradient-to-br from-white/[0.08] to-transparent"
                                style={{
                                  border: '1px solid rgba(255, 255, 255, 0.05)'
                                }}
                              >
                                {/* Orange BorderBeam for non-uploaded items */}
                                {!item.uploaded && (
                                  <BorderBeam 
                                    size={120}
                                    duration={6}
                                    borderWidth={1.5}
                                    colorFrom="#F97316"
                                    colorTo="#FBBF24"
                                    delay={Math.random() * 3}
                                  />
                                )}
                                
                                <div className="relative z-10 flex flex-col items-center">
                                  {/* Title */}
                                  <h3 className="text-lg font-semibold tracking-tight mb-2 text-zinc-200">
                                    {item.title}
                                  </h3>
                                  
                                  {/* Description */}
                                  {!item.uploaded && item.description && (
                                    <p className="text-base text-zinc-400 max-w-sm mx-auto leading-relaxed mb-6 font-medium">
                                      {item.description}
                                    </p>
                                  )}
                                  
                                  {/* Badge */}
                                  {!item.uploaded && item.required && (
                                    <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-[11px] font-semibold text-orange-400 tracking-wide mb-8 uppercase">
                                      Erforderlich
                                    </div>
                                  )}
                                  
                                  {/* Uploaded State */}
                                  {item.uploaded && itemFiles.length > 0 && (
                                    <div className="flex flex-col items-center gap-3 mt-2">
                                      <div className="inline-flex items-center gap-3 rounded-full px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/20">
                                        <Check className="w-4 h-4 text-emerald-500" />
                                        <span className="text-sm font-medium text-emerald-400">
                                          {itemFiles.length} Datei{itemFiles.length !== 1 ? 'en' : ''} hochgeladen
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          onClick={() => handleViewDocuments(item.id, 0)}
                                          className="text-zinc-400 hover:text-white hover:bg-white/[0.04] h-9 px-3"
                                        >
                                          <Eye className="h-4 w-4 mr-2" />
                                          Ansehen
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => handleDocumentDeleted(itemFiles[0]?.id, item.id)}
                                          className="text-zinc-400 hover:text-red-400 hover:bg-red-500/10 h-9 px-3"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Löschen
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Action Buttons for non-uploaded items */}
                                  {!item.uploaded && (
                                    <div className="flex flex-col items-center w-full max-w-[280px] gap-3.5">
                                      {/* Assignment Button */}
                                      {hasUnassignedDocs && (
                                        <>
                                          <button 
                                            onClick={() => setAssignmentModal({ open: true, item })}
                                            className="group flex hover:border-[#1D64FF]/50 hover:shadow-[0_0_25px_-5px_rgba(29,100,255,0.4)] transition-all duration-300 cursor-pointer active:scale-95 bg-[#0A0C10] border-white/10 border rounded-full py-2 px-5 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.5)] backdrop-blur-xl gap-x-3 items-center justify-center w-full"
                                          >
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-b from-[#1D64FF] to-[#0040CC] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] border border-white/10 group-hover:scale-105 transition-transform duration-300">
                                              <FolderOpen className="w-4 h-4 text-white" strokeWidth={2.5} />
                                            </div>
                                            <span className="text-white font-medium text-[15px]">Zuordnen</span>
                                          </button>

                                          {/* Divider */}
                                          <div className="w-full flex items-center gap-4 px-2 opacity-80">
                                            <div className="h-px bg-white/10 flex-1" />
                                            <span className="text-zinc-500 text-[13px] font-medium">oder</span>
                                            <div className="h-px bg-white/10 flex-1" />
                                          </div>
                                        </>
                                      )}

                                      {/* Upload Button */}
                                      <button 
                                        onClick={() => handleUploadDocument(item.id)}
                                        className="group flex hover:border-[#1D64FF]/50 hover:shadow-[0_0_25px_-5px_rgba(29,100,255,0.4)] transition-all duration-300 cursor-pointer active:scale-95 bg-[#0A0C10] border-white/10 border rounded-full py-2 px-5 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.5)] backdrop-blur-xl gap-x-3 items-center justify-center w-full"
                                      >
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-b from-[#1D64FF] to-[#0040CC] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] border border-white/10 group-hover:scale-105 transition-transform duration-300">
                                          <Plus className="w-4 h-4 text-white" strokeWidth={2.5} />
                                        </div>
                                        <span className="text-white font-medium text-[15px]">Hochladen</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </div>
                  )}
                </Collapsible>
              );
            })
          )}
        </div>
      </div>

      <DocumentViewer 
        documents={viewerDocuments} 
        initialDocumentIndex={viewerInitialIndex} 
        isOpen={viewerOpen} 
        onClose={handleCloseViewer} 
      />
      
      {/* Document Assignment Modal */}
      {assignmentModal.item && (
        <DocumentAssignmentModal 
          open={assignmentModal.open} 
          onClose={() => setAssignmentModal({ open: false, item: null })} 
          checklistItemId={assignmentModal.item.id} 
          checklistItemTitle={assignmentModal.item.title} 
          taxYear={taxYear} 
          onAssignment={() => {
            refreshDocuments();
            setAssignmentModal({ open: false, item: null });
          }} 
        />
      )}
    </div>
  );
};

export default DocumentChecklist;
