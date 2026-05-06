import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { useFormContext } from '../contexts';
import { useTaxFiler } from '@/contexts/TaxFilerContext';
import { ChecklistItem } from '../types';
import { Check, ChevronRight, RefreshCw, AlertTriangle, Eye, Trash2, User, Briefcase, Home, Calculator, FolderSearch, FileCheck, FolderOpen, Plus, X, ArrowRight, Calendar } from 'lucide-react';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
    return null;
  }

  if (!isAuthValid) {
return <div className="min-h-screen">
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
    return null;
  }

  return <div className="min-h-screen flex flex-col items-center">
      <SubpageHeader title={t.documentChecklist.title} onBack={handleBack} className="w-full" />

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
        
        return <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-white/70 to-white/30 backdrop-blur-2xl backdrop-saturate-200 border border-white/60 p-7 md:p-8 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)] transition-all duration-300">

              <div className="relative z-10">
                <div className="mb-6">
                  <h2 className="text-[22px] font-semibold text-foreground tracking-tight leading-tight">
                    Gesamtfortschritt
                  </h2>
                  <p className="text-[15px] text-muted-foreground mt-1.5">
                    {currentCount} von {totalCount} hochgeladen
                  </p>
                </div>

                {/* Segmented progress bar */}
                <div className="flex gap-1.5 h-2 w-full mb-5">
                  {Array.from({ length: totalCount }).map((_, i) => (
                    <div 
                      key={i}
                      className={cn(
                        "flex-1 rounded-full transition-all duration-500",
                        i < currentCount 
                          ? "bg-primary" 
                          : "bg-muted"
                      )}
                    />
                  ))}
                </div>

                {/* Hint text */}
                {!isComplete && remaining > 0 && (
                  <div className="flex items-start gap-3 text-[14px] text-muted-foreground">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
                    <span className="leading-relaxed">
                      Nur noch <span className="text-primary font-medium">{remaining} {remaining === 1 ? 'Dokument' : 'Dokumente'}</span> hochladen.
                    </span>
                  </div>
                )}
                {isComplete && (
                  <div className="flex items-start gap-3 text-[14px] text-emerald-600">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span className="leading-relaxed font-medium">{t.documentChecklist.allMandatoryPresent}</span>
                  </div>
                )}
              </div>
            </div>;
      })()}

        {/* Flat checklist */}
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

          {checklistItems.length === 0 ? (
            <div className="text-center py-16">
              <FolderSearch className="w-8 h-8 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-1 font-medium">Checkliste wird erstellt</p>
              <p className="text-sm text-slate-400 mb-6">
                {!formDataLoaded ? "Daten werden geladen..." : "Basierend auf deinen Angaben."}
              </p>
              <Button onClick={handleForceGeneration} disabled={isLoading} className="rounded-xl">
                {isLoading ? "Wird geladen..." : "Checkliste generieren"}
              </Button>
            </div>
          ) : (() => {
            const pendingItems = checklistItems.filter(i => !i.uploaded);
            const completedItems = checklistItems.filter(i => i.uploaded);
            return (
              <>
                {/* Pending items */}
                {pendingItems.map((item) => {
                  const hasUnassignedDocs = (unassignedDocsCounts[item.id] || 0) > 0;
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_4px_16px_rgba(0,0,0,0.03)] p-4 flex items-center gap-3"
                    >
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <FolderOpen className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
                      </div>
                      <h3 className="flex-1 text-[14px] font-medium text-foreground leading-snug">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {hasUnassignedDocs && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setAssignmentModal({ open: true, item }); }}
                          >
                            <FolderOpen className="w-4 h-4" strokeWidth={1.5} />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); setUploadSheetItem(item); setUploadSheetOpen(true); }}
                          className="rounded-full"
                        >
                          <Plus className="w-4 h-4" strokeWidth={2} />
                          Hochladen
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {/* Completed items grouped in single card */}
                {completedItems.length > 0 && (
                  <div className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_4px_16px_rgba(0,0,0,0.03)] overflow-hidden mt-4">
                    <div className="px-4 pt-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Erledigt ({completedItems.length})
                    </div>
                    {completedItems.map((item, idx) => {
                      const itemFiles = getUserDocumentsForItem(item.id);
                      return (
                        <div key={item.id}>
                          {idx > 0 && <div className="border-t border-border/60 mx-4" />}
                          <div className="flex items-center gap-3 px-4 py-2.5">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Check className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-[13px] text-muted-foreground line-through truncate">
                                {item.title}
                              </h3>
                              {itemFiles.length > 0 && (
                                <span className="text-[11px] text-muted-foreground/70">
                                  {itemFiles.length} {itemFiles.length === 1 ? t.documentChecklist.file : t.documentChecklist.files}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => handleViewDocuments(item.id, 0)}
                                className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              >
                                <Eye className="w-4 h-4" strokeWidth={1.5} />
                              </button>
                              <button
                                onClick={() => handleDocumentDeleted(itemFiles[0]?.id, item.id)}
                                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}
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
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-[2rem] shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.15)] animate-in slide-in-from-bottom duration-400 p-6 sm:p-8 pb-10 mx-auto">
            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-6" />

            <div className="flex flex-col items-center">
              {/* Success Icon */}
              <div className="mb-6 relative">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Check className="w-7 h-7" strokeWidth={2.5} />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-semibold text-foreground text-center tracking-tight mb-3">
                {t.documentChecklist.dialogTitle}
              </h2>

              {/* Tax year badge */}
              <div className="mb-6">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium text-sm tracking-tight bg-muted px-4 py-1.5 rounded-full">
                  <Calendar className="w-3.5 h-3.5" strokeWidth={2.5} />
                  {t.documentChecklist.taxReturnYear} {taxYear}
                </span>
              </div>

              {/* Description */}
              <p className="text-center text-[15px] text-muted-foreground leading-relaxed mb-8 font-normal max-w-sm">
                {t.documentChecklist.dialogDescription}
              </p>

              {/* Buttons */}
              <div className="w-full flex flex-col gap-3">
                <button
                  onClick={() => navigate(`/payment?year=${taxYear}`)}
                  className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-b from-[hsl(222,100%,60%)] to-[hsl(222,100%,47%)] px-5 py-3 font-semibold text-sm tracking-tight text-white transition-all hover:brightness-110 active:scale-[0.97]"
                >
                  {t.documentChecklist.createNow}
                </button>

                <button
                  onClick={() => setShowCompletionDialog(false)}
                  className="flex w-full items-center justify-center rounded-2xl bg-background px-5 py-3 font-medium text-base text-foreground transition-all border border-border hover:bg-muted/50 active:scale-[0.97]"
                >
                  {t.documentChecklist.later}
                </button>
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
