import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { useFormContext } from '../contexts';
import { useTaxFiler } from '@/contexts/TaxFilerContext';
import { ChecklistItem } from '../types';
import { Check, ChevronUp, ChevronRight, RefreshCw, AlertTriangle, Eye, Trash2, User, Briefcase, Home, Calculator, FolderSearch, FileCheck, FolderOpen, Plus, X, Zap, ArrowRight, Clock, Calendar } from 'lucide-react';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from 'react-router-dom';
import { useDocuments } from '@/hooks/use-documents';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { DocumentMetadata, documentService } from '@/services/DocumentService';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import DocumentViewer from './DocumentViewer';
import DocumentAssignmentModal from '@/components/documents/DocumentAssignmentModal';
import { supabase } from '@/integrations/supabase/client';
import { debug } from '@/utils/debug';
import { useI18n } from '@/contexts/I18nContext';
import DocumentUploadSheet from '@/components/documents/DocumentUploadSheet';

const DocumentChecklist: React.FC = () => {
  const { t } = useI18n();
  const {
    checklistItems,
    generateChecklist,
    markUploaded,
    formProgress,
    updateFormProgress,
    formData,
    formDataLoaded,
    setCurrentStep,
    taxYear,
    loadDocuments: formContextLoadDocuments
  } = useFormContext();
  const { activeTaxFilerId: contextTaxFilerId } = useTaxFiler();
  const activeTaxFilerId = contextTaxFilerId
    || sessionStorage.getItem('ditax_selected_tax_filer')
    || null;
  const {
    documents,
    isLoading,
    error,
    refreshDocuments,
    deleteDocument,
    getDocumentsForItem,
    hasDocuments
  } = useDocuments();
  


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
    const map: { [key: string]: any[] } = {};
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
  }>({ open: false, item: null });
  const [unassignedDocsCounts, setUnassignedDocsCounts] = useState<Record<string, number>>({});
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const [uploadSheetItem, setUploadSheetItem] = useState<ChecklistItem | null>(null);
  
  const hasShownCompletionDialog = useRef(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const handleNext = () => { navigate(`/payment?year=${taxYear}`); };
  const handleBack = () => { navigate(`/form?section=deductions&year=${taxYear}`); };

  const handleSheetUploaded = useCallback(async (itemId: string) => {
    // Optimistic update
    markUploaded(itemId, true);
    
    // Clear cache and reload fresh data from DB
    documentService.clearCache();
    try {
      await formContextLoadDocuments(true);
    } catch (err) {
      console.error('[DocumentChecklist] Error reloading documents after upload:', err);
    }
    
    toast({ title: 'Erfolgreich hochgeladen', description: 'Dokument wurde hochgeladen.' });
  }, [markUploaded, formContextLoadDocuments, toast]);

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
    // Filter by active tax filer to prevent showing other filer's documents
    if (activeTaxFilerId && doc.metadata?.taxFilerId && doc.metadata.taxFilerId !== activeTaxFilerId) {
      return false;
    }
    return true;
  });

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

  const loadUnassignedDocsCount = useCallback(async () => {
    if (!userId || !taxYear || !activeTaxFilerId) return;
    try {
      const { data, error } = await supabase
        .from('uploaded_documents')
        .select('id, checklist_item_id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .eq('is_assigned_to_checklist', false)
        .eq('tax_year', taxYear)
        .eq('tax_filer_id', activeTaxFilerId);
      if (error) {
        debug.error('Error loading unassigned documents:', error);
        return;
      }
      const counts: Record<string, number> = {};
      checklistItems.forEach(item => {
        counts[item.id] = data?.length || 0;
      });
      setUnassignedDocsCounts(counts);
    } catch (error) {
      debug.error('Error in loadUnassignedDocsCount:', error);
    }
  }, [userId, taxYear, checklistItems, activeTaxFilerId]);

  const hasLoadedCountsRef = useRef(false);
  useEffect(() => {
    if (userId && taxYear && checklistItems.length > 0 && !hasLoadedCountsRef.current) {
      hasLoadedCountsRef.current = true;
      loadUnassignedDocsCount();
    }
  }, [userId, taxYear, checklistItems.length, loadUnassignedDocsCount]);

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
      setTimeout(() => { hasGeneratedRef.current = false; }, 2000);
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

  const handleDocumentRefresh = useCallback(() => { refreshDocuments(); }, [refreshDocuments]);

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const categoryMap: Record<string, string> = {
    'general': t.documentChecklist.categories.general,
    'income': t.documentChecklist.categories.income,
    'assets': t.documentChecklist.categories.assets,
    'deductions': t.documentChecklist.categories.deductions
  };
  const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    'general': User,
    'income': Briefcase,
    'assets': Home,
    'deductions': Calculator
  };
  const categorizedItems = categorizedItemsMemo;

  const getCategoryDescription = (category: string, items: ChecklistItem[]) => {
    const titles = items.slice(0, 2).map(item => item.title);
    return titles.join(', ');
  };

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

  const allDocumentsUploaded = useMemo(() => {
    if (checklistItems.length === 0) return false;
    return checklistItems.every(item => item.uploaded);
  }, [checklistItems]);

  useEffect(() => {
    if (allDocumentsUploaded && !hasShownCompletionDialog.current && !isLoading && initialLoadComplete) {
      const timer = setTimeout(() => {
        setShowCompletionDialog(true);
        hasShownCompletionDialog.current = true;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [allDocumentsUploaded, isLoading, initialLoadComplete]);

  useEffect(() => {
    if (!allDocumentsUploaded) {
      hasShownCompletionDialog.current = false;
    }
  }, [allDocumentsUploaded]);

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
    return <div className="min-h-screen bg-[#fafafa]">
        <div className="p-6 pt-24">
          <Skeleton className="h-16 w-full mb-4 bg-slate-100" />
          <Skeleton className="h-16 w-full mb-4 bg-slate-100" />
          <Skeleton className="h-16 w-full bg-slate-100" />
        </div>
      </div>;
  }

  if (!isAuthValid) {
    return <div className="min-h-screen bg-[#fafafa]">
        <div className="p-6 pt-24">
          <Alert variant="destructive" className="bg-red-50 border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-700">Authentifizierung erforderlich</AlertTitle>
            <AlertDescription className="text-red-600">
              Du musst angemeldet sein, um deine Dokumente zu verwalten.
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={() => navigate('/auth', { state: { from: '/form' } })} variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50">
                  Zur Anmeldung
                </Button>
                <Button size="sm" onClick={handleAuthRefresh} variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Session prüfen
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>;
  }

  if (!initialLoadComplete || isLoading && checklistItems.length === 0) {
    return <div className="min-h-screen bg-[#fafafa]">
        <div className="p-6 pt-24">
          <Skeleton className="h-16 w-full mb-4 bg-slate-100" />
          <Skeleton className="h-16 w-full mb-4 bg-slate-100" />
          <Skeleton className="h-16 w-full bg-slate-100" />
        </div>
      </div>;
  }

  return <div className="min-h-screen bg-white flex flex-col items-center">
      <SubpageHeader title={t.documentChecklist.title} onBack={handleBack} className="w-full max-w-[880px]" />

      <main className="w-full max-w-[880px] space-y-8 sm:py-8 sm:px-6 pt-6 px-4 pb-24">
        
        {/* Dark Progress Card */}
        {checklistItems.length > 0 && (() => {
        const requiredItems = checklistItems.filter(item => item.required);
        const completedRequired = requiredItems.filter(item => item.uploaded).length;
        const totalRequired = requiredItems.length;
        const allOptional = totalRequired === 0;
        const totalCompleted = checklistItems.filter(item => item.uploaded).length;
        const currentCount = allOptional ? totalCompleted : completedRequired;
        const totalCount = allOptional ? checklistItems.length : totalRequired;
        const progressPercent = totalCount > 0 ? Math.round((currentCount / totalCount) * 100) : 0;
        const isComplete = progressPercent === 100;
        const remaining = totalCount - currentCount;

        // Find first incomplete category for hint text
        const firstIncompleteCategory = Object.entries(categorizedItems).find(([_, items]) => 
          items.some(item => !item.uploaded)
        );
        const incompleteCategoryName = firstIncompleteCategory ? categoryMap[firstIncompleteCategory[0]] : '';
        
        return <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 sm:p-8 shadow-2xl shadow-blue-900/20">
              {/* Background blurs */}
              <div className="absolute top-0 right-0 -mr-24 -mt-24 h-80 w-80 rounded-full bg-blue-600 opacity-20 blur-[80px]" />
              <div className="absolute bottom-0 left-0 -ml-24 -mb-24 h-80 w-80 rounded-full bg-indigo-600 opacity-20 blur-[80px]" />

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <p className="text-sm font-medium text-blue-300 uppercase tracking-wider mb-1">
                      Gesamtfortschritt
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">
                        {progressPercent}%
                      </span>
                      <span className="text-base font-medium text-slate-400">
                        erledigt
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-full shadow-lg shadow-black/10">
                    <FileCheck className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium text-blue-100">{currentCount} / {totalCount}</span>
                  </div>
                </div>

                {/* Segmented progress bar */}
                <div className="flex gap-1.5 h-2.5 w-full mb-5">
                  {Array.from({ length: totalCount }).map((_, i) => (
                    <div 
                      key={i}
                      className={cn(
                        "flex-1 rounded-full transition-all duration-500",
                        i < currentCount 
                          ? "bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]" 
                          : "bg-slate-800 border border-slate-700/50"
                      )}
                    />
                  ))}
                </div>

                {/* Hint text */}
                {!isComplete && remaining > 0 && (
                  <div className="flex items-start gap-3 text-sm text-slate-400">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
                    <span className="leading-relaxed">
                      Nur noch <span className="text-blue-200 font-medium">{remaining} {remaining === 1 ? 'Dokument' : 'Dokumente'}</span>
                      {incompleteCategoryName && <> im Bereich <span className="text-white">{incompleteCategoryName}</span></>} hochladen.
                    </span>
                  </div>
                )}
                {isComplete && (
                  <div className="flex items-start gap-3 text-sm text-emerald-400">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span className="leading-relaxed font-medium">{t.documentChecklist.allMandatoryPresent}</span>
                  </div>
                )}
              </div>
            </div>;
      })()}

        {/* Categories */}
        <div className="space-y-6">
          {error && <Alert variant="destructive" className="rounded-3xl">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Fehler beim Laden</AlertTitle>
              <AlertDescription>
                {error}
                <div className="mt-2">
                  <Button size="sm" onClick={() => navigate('/auth', { state: { from: '/form' } })} variant="outline">
                    Zur Anmeldung
                  </Button>
                </div>
              </AlertDescription>
            </Alert>}

          {Object.keys(categorizedItems).length === 0 ? <div className="text-center py-16">
              <FolderSearch className="w-8 h-8 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-1 font-medium">Checkliste wird erstellt</p>
              <p className="text-sm text-slate-400 mb-6">
                {!formDataLoaded ? "Daten werden geladen..." : "Basierend auf deinen Angaben."}
              </p>
              <Button onClick={handleForceGeneration} disabled={isLoading} className="rounded-xl">
                {isLoading ? "Wird geladen..." : "Checkliste generieren"}
              </Button>
        </div> : Object.entries(categorizedItems).map(([category, items]) => {
          const isComplete = isCategoryComplete(category);
          const isOpen = openCategories[category];
          const Icon = categoryIcons[category];
          const uploadedCount = items.filter(i => i.uploaded).length;
          const openCount = items.length - uploadedCount;
          const pendingItems = items.filter(i => !i.uploaded);
          const completedItems = items.filter(i => i.uploaded);
          
          return <Collapsible key={category} open={isOpen} onOpenChange={open => {
            setOpenCategories(prev => ({ ...prev, [category]: open }));
          }}>
              {/* Liquid card wrapper */}
              <div 
                className={cn(
                  "rounded-3xl p-[1px] transition-all",
                  !isComplete && isOpen ? "shadow-lg shadow-slate-200/50" : "",
                  isComplete && !isOpen ? "opacity-90 hover:opacity-100" : ""
                )}
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.6)',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.6)'
                }}
              >
                <div className="bg-white/50 rounded-[1.3rem] p-6 sm:p-8">
                  {/* Section Header */}
                  <CollapsibleTrigger className="group w-full text-left">
                    <div className={cn("flex items-start justify-between", isOpen && "mb-6")}>
                      <div className="flex gap-5">
                        <div className={cn(
                          "h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm",
                          isComplete 
                            ? "bg-emerald-50 text-emerald-500 ring-1 ring-emerald-100" 
                            : "bg-slate-100 text-slate-500 ring-1 ring-slate-200/60"
                        )}>
                          {isComplete 
                            ? <Check className="w-6 h-6" strokeWidth={1.5} /> 
                            : <Icon className="w-6 h-6" />
                          }
                        </div>
                        <div>
                          <h2 className="text-xl font-medium text-slate-800 tracking-tight">
                            {categoryMap[category]}
                          </h2>
                          <p className={cn(
                            "text-base mt-0.5",
                            isComplete ? "text-emerald-600 font-medium" : "text-slate-500"
                          )}>
                            {isComplete ? 'Vollständig' : `${uploadedCount} von ${items.length} erledigt`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        {!isComplete && openCount > 0 && (
                          <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-medium tracking-wide uppercase shadow-sm ring-1 ring-blue-100">
                            {openCount} Offen
                          </span>
                        )}
                        {isOpen 
                          ? <ChevronUp className="w-5 h-5 text-slate-400" strokeWidth={1.5} />
                          : <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-500 transition-colors" strokeWidth={1.5} />
                        }
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="flex flex-col">
                      {/* Active / pending items first */}
                      {pendingItems.map((item, idx) => {
                        const hasUnassignedDocs = (unassignedDocsCounts[item.id] || 0) > 0;
                        
                        return <div key={item.id}>
                          <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-slate-200 mb-4 transition-all hover:shadow-md hover:ring-blue-100">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                              <div className="flex items-center gap-4">
                                <h3 className="text-lg font-medium text-slate-800">{item.title}</h3>
                              </div>
                              <div className="flex items-center gap-3 w-full md:w-auto">
                                {hasUnassignedDocs && (
                                  <Button 
                                    variant="secondary"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); setAssignmentModal({ open: true, item }); }}
                                    className="flex-1 md:flex-none"
                                  >
                                    <FolderOpen className="w-4 h-4" strokeWidth={1.5} />
                                    {t.documentChecklist.assign}
                                  </Button>
                                )}
                                <Button 
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); setUploadSheetItem(item); setUploadSheetOpen(true); }}
                                  className="flex-1 md:flex-none"
                                >
                                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                                  Hochladen
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>;
                      })}

                      {/* Dotted separator between pending and completed */}
                      {pendingItems.length > 0 && completedItems.length > 0 && (
                        <div className="border-t-2 border-dotted border-slate-200 my-4" />
                      )}

                      {/* Completed items */}
                      {completedItems.map((item, idx) => {
                        const itemFiles = getUserDocumentsForItem(item.id);
                        
                        return <div key={item.id}>
                          {idx > 0 && <div className="border-t border-slate-100 my-3" />}
                          <div className="group flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-4">
                            <div className="flex items-start gap-4 opacity-50 hover:opacity-100 transition-opacity">
                              <div>
                                <h3 className="text-lg text-slate-500 line-through decoration-slate-300">
                                  {item.title}
                                </h3>
                                {itemFiles.length > 0 && (
                                  <div className="flex items-center gap-1.5 mt-1 text-emerald-600">
                                    <FileCheck className="w-4 h-4" strokeWidth={1.5} />
                                    <span className="text-sm font-medium">
                                      {itemFiles.length} {itemFiles.length === 1 ? t.documentChecklist.file : t.documentChecklist.files} hochgeladen
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 pl-10 sm:pl-0">
                              <button 
                                onClick={() => handleViewDocuments(item.id, 0)} 
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                              >
                                <Eye className="w-5 h-5" strokeWidth={1.5} />
                              </button>
                              <button 
                                onClick={() => handleDocumentDeleted(itemFiles[0]?.id, item.id)} 
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                              >
                                <Trash2 className="w-5 h-5" strokeWidth={1.5} />
                              </button>
                            </div>
                          </div>
                        </div>;
                      })}
                    </div>
                  </CollapsibleContent>
                </div>
              </div>
            </Collapsible>;
        })}
        </div>
      </main>

      <DocumentViewer documents={viewerDocuments} initialDocumentIndex={viewerInitialIndex} isOpen={viewerOpen} onClose={handleCloseViewer} />
      
      {assignmentModal.item && <DocumentAssignmentModal open={assignmentModal.open} onClose={() => setAssignmentModal({ open: false, item: null })} checklistItemId={assignmentModal.item.id} checklistItemTitle={assignmentModal.item.title} taxYear={taxYear} onAssignment={() => {
      refreshDocuments();
      setAssignmentModal({ open: false, item: null });
    }} />}

      {/* Completion Bottom Sheet */}
      {showCompletionDialog && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in-0 duration-300"
            onClick={() => setShowCompletionDialog(false)}
          />
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[2rem] shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.15)] animate-in slide-in-from-bottom duration-400 p-8 pb-10 max-w-lg md:max-w-xl lg:max-w-2xl mx-auto">
            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-6" />

            <div className="flex flex-col items-center">
              {/* Success Icon */}
              <div className="mb-6 relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200/50 text-white">
                  <Check className="w-8 h-8" strokeWidth={3} />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-semibold text-slate-900 text-center tracking-tight mb-3">
                {t.documentChecklist.dialogTitle}
              </h2>

              {/* Tax year badge */}
              <div className="mb-6">
                <span className="inline-flex items-center gap-1.5 text-emerald-600/90 font-medium text-sm tracking-tight bg-emerald-50/80 px-4 py-1.5 rounded-full border border-emerald-100/60">
                  <Calendar className="w-3.5 h-3.5" strokeWidth={2.5} />
                  {t.documentChecklist.taxReturnYear} {taxYear}
                </span>
              </div>

              {/* Description */}
              <p className="text-center text-[15px] text-slate-500 leading-relaxed mb-8 font-normal max-w-sm">
                {t.documentChecklist.dialogDescription}
              </p>

              {/* Buttons */}
              <div className="w-full flex flex-col gap-3">
                <Button
                  onClick={() => navigate(`/payment?year=${taxYear}`)}
                  className="w-full"
                >
                  <Zap className="w-[18px] h-[18px]" />
                  {t.documentChecklist.createNow}
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => setShowCompletionDialog(false)}
                  className="w-full"
                >
                  <Clock className="w-[18px] h-[18px]" />
                  {t.documentChecklist.later}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unified Upload Bottom Sheet */}
      <DocumentUploadSheet
        open={uploadSheetOpen}
        onClose={() => { setUploadSheetOpen(false); setUploadSheetItem(null); }}
        item={uploadSheetItem}
        taxYear={taxYear}
        taxFilerId={activeTaxFilerId}
        onUploaded={handleSheetUploaded}
      />
    </div>;

};
export default DocumentChecklist;
