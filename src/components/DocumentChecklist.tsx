import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { useFormContext } from '../contexts';
import { ChecklistItem } from '../types';
import { Check, ChevronUp, ChevronRight, RefreshCw, AlertTriangle, Eye, Trash2, User, Briefcase, Home, Calculator, FolderSearch, FileCheck, FolderOpen, Plus, X } from 'lucide-react';
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
import { DocumentMetadata } from '@/services/DocumentService';
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
  const handleBack = () => { navigate('/form?section=deductions'); };

  const handleSheetUploaded = useCallback((itemId: string) => {
    markUploaded(itemId, true);
    refreshDocuments();
    toast({ title: 'Erfolgreich hochgeladen', description: 'Dokument wurde hochgeladen.' });
  }, [markUploaded, refreshDocuments, toast]);

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
    if (!userId || !taxYear) return;
    const activeTaxFilerId = localStorage.getItem('activeTaxFilerId');
    try {
      let query = supabase.from('uploaded_documents').select('id, checklist_item_id').eq('user_id', userId).eq('status', 'active').eq('is_assigned_to_checklist', false).eq('tax_year', taxYear);
      if (activeTaxFilerId) {
        query = query.eq('tax_filer_id', activeTaxFilerId);
      }
      const { data, error } = await query;
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
  }, [userId, taxYear, checklistItems]);

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

      <main className="w-full max-w-[880px] space-y-4 sm:py-8 sm:px-6 pt-6 px-4 pb-24">
        
        {/* Stacked Progress Header */}
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
        
        return <div className="mb-4">
              <div className={cn(
                "rounded-2xl px-5 py-4 text-white shadow-md",
                isComplete ? "bg-emerald-500" : "bg-primary"
              )}>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2.5">
                    {isComplete && <Check className="w-4 h-4 text-white" strokeWidth={2.5} />}
                    <span className="text-sm font-medium opacity-90">
                      {isComplete 
                        ? t.documentChecklist.allMandatoryPresent
                        : `${currentCount} von ${totalCount} hochgeladen`
                      }
                    </span>
                  </div>
                  <span className="text-sm font-semibold">{progressPercent}%</span>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>;
      })()}

        {/* Categories */}
        <div className="space-y-3">
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
          
          return <Collapsible key={category} open={isOpen} onOpenChange={open => {
            setOpenCategories(prev => ({ ...prev, [category]: open }));
          }}>
              <div className="rounded-3xl bg-white shadow-[0_2px_20px_rgb(0,0,0,0.04)] overflow-hidden transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                <CollapsibleTrigger className="group w-full text-left">
                  <div className={cn("w-full p-6 flex items-center justify-between", isOpen && "border-b border-slate-50 pb-5")}>
                    <div className="flex items-center gap-5">
                      <div className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-2xl",
                        isComplete ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500"
                      )}>
                        {isComplete 
                          ? <Check className="w-6 h-6" strokeWidth={1.5} /> 
                          : <Icon className="w-6 h-6" />
                        }
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-slate-900 tracking-tight">{categoryMap[category]}</h3>
                        <p className={cn("text-sm mt-0.5", isComplete ? "text-emerald-600 font-medium" : "text-slate-400")}>
                          {isComplete ? 'Vollständig' : `${uploadedCount} von ${items.length} erledigt`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {!isComplete && (
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 tracking-wide uppercase">
                          {openCount} offen
                        </span>
                      )}
                      {isOpen 
                        ? <ChevronUp className="w-5 h-5 text-slate-300" />
                        : <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-400 transition-colors" />
                      }
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="flex flex-col p-3 space-y-1">
                    {items.map((item, idx) => {
                      const itemFiles = getUserDocumentsForItem(item.id);
                      const hasUnassignedDocs = (unassignedDocsCounts[item.id] || 0) > 0;
                      
                      if (!item.uploaded) {
                        return <div key={item.id}>
                          {idx > 0 && <div className="mx-3 border-t border-dashed border-slate-100 my-1" />}
                          <div className="flex flex-col gap-4 rounded-2xl bg-slate-50/80 p-5 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3.5">
                              <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] border-slate-300 bg-white shadow-sm" />
                              <span className="text-base font-medium text-slate-900 tracking-tight">{item.title}</span>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              {hasUnassignedDocs && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setAssignmentModal({ open: true, item }); }}
                                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-all hover:bg-slate-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] active:scale-95"
                                >
                                  <FolderOpen className="w-4 h-4" />
                                  {t.documentChecklist.assign}
                                </button>
                              )}
                              <button 
                                onClick={(e) => { e.stopPropagation(); setUploadSheetItem(item); setUploadSheetOpen(true); }}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-[0_4px_12px_rgba(37,99,235,0.2)] transition-all hover:bg-blue-700 hover:shadow-[0_4px_16px_rgba(37,99,235,0.3)] active:scale-95"
                              >
                                <Plus className="w-4 h-4" />
                                Hochladen
                              </button>
                            </div>
                          </div>
                        </div>;
                      }
                      
                      return <div key={item.id}>
                        {idx > 0 && <div className="mx-3 border-t border-dashed border-slate-100 my-1" />}
                        <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors">
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-500/30">
                              <Check className="w-3 h-3" strokeWidth={3} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="block text-base font-medium text-slate-400 line-through decoration-slate-300 decoration-2 truncate">
                                {item.title}
                              </span>
                              {itemFiles.length > 0 && (
                                <span className="mt-1 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                                  <FileCheck className="w-3.5 h-3.5 flex-shrink-0" />
                                  {itemFiles.length} {itemFiles.length === 1 ? t.documentChecklist.file : t.documentChecklist.files} hochgeladen
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 ml-2 opacity-60 hover:opacity-100 transition-opacity">
                            <button onClick={() => handleViewDocuments(item.id, 0)} className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-white hover:shadow-sm hover:text-slate-700">
                              <Eye className="w-5 h-5" />
                            </button>
                            <button onClick={() => handleDocumentDeleted(itemFiles[0]?.id, item.id)} className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>;
                    })}
                  </div>
                </CollapsibleContent>
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

      <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md bg-white border-0 p-8 shadow-[0_25px_60px_-12px_rgba(0,0,0,0.15)] rounded-[24px] gap-0">
          <button onClick={() => setShowCompletionDialog(false)} className="absolute right-4 top-4 w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors z-10">
            <X className="h-4 w-4 text-slate-400" />
          </button>
          <div className="pt-2">
            <div className="flex justify-center mb-5">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                <Check className="w-7 h-7 text-emerald-500" strokeWidth={2.5} />
              </div>
            </div>
            <div className="flex flex-col items-center mb-5">
              <DialogTitle className="text-xl font-semibold text-slate-800 text-center">{t.documentChecklist.dialogTitle}</DialogTitle>
              <p className="text-sm text-slate-400 mt-1.5 text-center">{t.documentChecklist.taxReturnYear} {taxYear}</p>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed text-center mb-8">{t.documentChecklist.dialogDescription}</p>
            <div className="flex flex-col gap-3">
              <Button onClick={() => navigate(`/payment?year=${taxYear}`)} className="w-full h-12 rounded-xl">
                {t.documentChecklist.createNow}
              </Button>
              <Button variant="ghost" onClick={() => setShowCompletionDialog(false)} className="w-full h-11 rounded-xl text-slate-400 hover:text-slate-600">
                {t.documentChecklist.later}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unified Upload Bottom Sheet */}
      <DocumentUploadSheet
        open={uploadSheetOpen}
        onClose={() => { setUploadSheetOpen(false); setUploadSheetItem(null); }}
        item={uploadSheetItem}
        taxYear={taxYear}
        onUploaded={handleSheetUploaded}
      />
    </div>;

};
export default DocumentChecklist;
