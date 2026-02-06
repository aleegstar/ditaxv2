import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { useFormContext } from '../contexts';
import { ChecklistItem } from '../types';
import { Check, ChevronUp, ChevronRight, RefreshCw, AlertTriangle, Eye, Trash2, User, Briefcase, Home, Calculator, FolderSearch, CloudUpload, FileCheck, FolderOpen, Plus, X, Loader2 } from 'lucide-react';
import { SubpageHeader } from '@/components/ui/subpage-header';
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
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import DocumentViewer from './DocumentViewer';
import DocumentAssignmentModal from '@/components/documents/DocumentAssignmentModal';
import LowConfidenceModal from '@/components/documents/LowConfidenceModal';
import AIDocumentValidation from '@/components/ui/ai-document-validation';
import { supabase } from '@/integrations/supabase/client';
import { debug } from '@/utils/debug';
import { useI18n } from '@/contexts/I18nContext';
import { useInlineUpload, InlineUploadState } from '@/hooks/use-inline-upload';
import { useTaxFiler } from '@/contexts/TaxFilerContext';
import { AnimatePresence, motion } from 'framer-motion';

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
  
  const { activeTaxFilerId } = useTaxFiler();
  
  // Inline upload state and refs for file inputs
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [lowConfidenceState, setLowConfidenceState] = useState<InlineUploadState | null>(null);
  
  const {
    uploadStates,
    handleFileSelect,
    confirmUpload,
    cancelUpload,
    getItemState,
    clearItemState
  } = useInlineUpload({
    taxYear,
    taxFilerId: activeTaxFilerId,
    onUploadComplete: async (itemId) => {
      // Refresh documents and mark as uploaded
      await refreshDocuments();
      markUploaded(itemId, true);
      
      // Retry refresh if document doesn't appear (handles DB propagation delay)
      const docs = getDocumentsForItem(itemId);
      if (docs.length === 0) {
        console.log('[DocumentChecklist] Document not visible yet, retrying refresh...');
        setTimeout(async () => {
          await refreshDocuments();
        }, 1000);
      }
    },
    onValidationNeeded: (state) => {
      // Show low confidence modal
      setLowConfidenceState(state);
    }
  });

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
    const map: {
      [key: string]: any[];
    } = {};
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
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const hasShownCompletionDialog = useRef(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const handleNext = () => {
    navigate('/payment');
  };
  const handleBack = () => {
    navigate('/form?section=deductions');
  };
  
  // NEW: Direct file input trigger (replaces navigation)
  const handleUploadDocument = (itemId: string) => {
    const input = fileInputRefs.current[itemId];
    if (input) {
      input.click();
    }
  };
  
  // Handle file input change
  const handleFileInputChange = (itemId: string, itemTitle: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files, itemId, itemTitle);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };
  
  // Low confidence modal handlers
  const handleLowConfidenceConfirm = async () => {
    if (!lowConfidenceState) return;
    const itemId = lowConfidenceState.itemId;
    setLowConfidenceState(null);
    await confirmUpload(itemId);
  };
  
  const handleLowConfidenceReupload = () => {
    if (!lowConfidenceState) return;
    const itemId = lowConfidenceState.itemId;
    clearItemState(itemId);
    setLowConfidenceState(null);
    // Trigger file picker again
    setTimeout(() => handleUploadDocument(itemId), 100);
  };
  
  const handleLowConfidenceClose = () => {
    if (!lowConfidenceState) return;
    clearItemState(lowConfidenceState.itemId);
    setLowConfidenceState(null);
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

  // Load unassigned documents count for current year and tax filer
  const loadUnassignedDocsCount = useCallback(async () => {
    if (!userId || !taxYear) return;
    
    // Get activeTaxFilerId from localStorage as fallback
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
    'general': t.documentChecklist.categories.general,
    'income': t.documentChecklist.categories.income,
    'assets': t.documentChecklist.categories.assets,
    'deductions': t.documentChecklist.categories.deductions
  };
  const categoryIcons: Record<string, React.ComponentType<{
    className?: string;
  }>> = {
    'general': User,
    'income': Briefcase,
    'assets': Home,
    'deductions': Calculator
  };
  const categorizedItems = categorizedItemsMemo;

  // Get description for category based on items
  const getCategoryDescription = (category: string, items: ChecklistItem[]) => {
    const titles = items.slice(0, 2).map(item => item.title);
    return titles.join(', ');
  };

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

  // Check if all documents are uploaded and show completion dialog
  const allDocumentsUploaded = useMemo(() => {
    if (checklistItems.length === 0) return false;
    return checklistItems.every(item => item.uploaded);
  }, [checklistItems]);

  // Show completion dialog when all documents are uploaded
  useEffect(() => {
    if (allDocumentsUploaded && !hasShownCompletionDialog.current && !isLoading && initialLoadComplete) {
      // Small delay to ensure the UI has updated
      const timer = setTimeout(() => {
        setShowCompletionDialog(true);
        hasShownCompletionDialog.current = true;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [allDocumentsUploaded, isLoading, initialLoadComplete]);

  // Reset the dialog flag when documents change (user deletes a document)
  useEffect(() => {
    if (!allDocumentsUploaded) {
      hasShownCompletionDialog.current = false;
    }
  }, [allDocumentsUploaded]);

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
    return <div className="min-h-screen bg-white">
        <div className="p-6 pt-24">
          <Skeleton className="h-16 w-full mb-4 bg-slate-100" />
          <Skeleton className="h-16 w-full mb-4 bg-slate-100" />
          <Skeleton className="h-16 w-full bg-slate-100" />
        </div>
      </div>;
  }
  if (!isAuthValid) {
    return <div className="min-h-screen bg-white">
        <div className="p-6 pt-24">
          <Alert variant="destructive" className="bg-red-50 border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-700">Authentifizierung erforderlich</AlertTitle>
            <AlertDescription className="text-red-600">
              Du musst angemeldet sein, um deine Dokumente zu verwalten.
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={() => navigate('/auth', {
                state: {
                  from: '/form'
                }
              })} variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50">
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
    return <div className="min-h-screen bg-white">
        <div className="p-6 pt-24">
          <Skeleton className="h-16 w-full mb-4 bg-slate-100" />
          <Skeleton className="h-16 w-full mb-4 bg-slate-100" />
          <Skeleton className="h-16 w-full bg-slate-100" />
        </div>
      </div>;
  }
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <SubpageHeader title={t.documentChecklist.title} onBack={handleBack} className="w-full max-w-2xl mx-auto" />

      {/* Main Content */}
      <main className="w-full max-w-2xl mx-auto px-5 pt-6 pb-32 space-y-6">
        
        {/* Progress Card - Premium Glass Style */}
        {checklistItems.length > 0 && (() => {
          const requiredItems = checklistItems.filter(item => item.required);
          const completedRequired = requiredItems.filter(item => item.uploaded).length;
          const totalRequired = requiredItems.length;
          const allOptional = totalRequired === 0;
          const totalCompleted = checklistItems.filter(item => item.uploaded).length;
          const progressPercent = allOptional 
            ? (totalCompleted / checklistItems.length) * 100 
            : (completedRequired / totalRequired) * 100;
          
          return (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    {allOptional ? t.documentChecklist.documents : t.documentChecklist.mandatoryDocuments}
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {allOptional 
                      ? `${totalCompleted} ${t.documentChecklist.completedOf} ${checklistItems.length} ${t.documentChecklist.uploaded}` 
                      : completedRequired === totalRequired 
                        ? t.documentChecklist.allMandatoryPresent 
                        : `${t.documentChecklist.stillRequired}: ${totalRequired - completedRequired}`}
                  </p>
                </div>
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-blue-50">
                  <span className="text-xl font-bold text-primary tabular-nums">
                    {allOptional ? totalCompleted : completedRequired}/{allOptional ? checklistItems.length : totalRequired}
                  </span>
                </div>
              </div>
              
              {/* Elegant Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className={cn(
                    "h-2 rounded-full transition-all duration-700 ease-out",
                    progressPercent === 100 
                      ? "bg-gradient-to-r from-emerald-400 to-emerald-500" 
                      : "bg-gradient-to-r from-primary to-blue-400"
                  )} 
                  style={{ width: `${Math.max(4, progressPercent)}%` }}
                />
              </div>
            </div>
          );
        })()}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-red-900">Fehler beim Laden</h3>
                <p className="text-sm text-red-600 mt-1">{error}</p>
                <button 
                  onClick={() => navigate('/auth', { state: { from: '/form' } })} 
                  className="mt-3 text-sm font-medium text-red-700 hover:text-red-800"
                >
                  Zur Anmeldung →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {Object.keys(categorizedItems).length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-100">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-50 flex items-center justify-center">
              <FolderSearch className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Keine Dokumente definiert
            </h3>
            <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
              Die Dokumenten-Checkliste wird basierend auf deinen Angaben erstellt.
            </p>
            <button 
              onClick={handleForceGeneration} 
              disabled={isLoading}
              className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-primary text-white font-medium text-sm shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Wird geladen...
                </>
              ) : (
                'Checkliste generieren'
              )}
            </button>
          </div>
        ) : (
          /* Category Cards */
          <div className="space-y-4">
            {Object.entries(categorizedItems).map(([category, items]) => {
              const isComplete = isCategoryComplete(category);
              const isOpen = openCategories[category];
              const Icon = categoryIcons[category];
              const uploadedCount = items.filter(i => i.uploaded).length;
              
              return (
                <Collapsible 
                  key={category} 
                  open={isOpen} 
                  onOpenChange={open => setOpenCategories(prev => ({ ...prev, [category]: open }))}
                >
                  {/* Category Card */}
                  <div className={cn(
                    "bg-white rounded-2xl overflow-hidden transition-shadow duration-200",
                    isOpen 
                      ? "shadow-lg shadow-slate-200/60 ring-1 ring-slate-200/80" 
                      : "shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200"
                  )}>
                    {/* Category Header */}
                    <CollapsibleTrigger className="w-full p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Icon Badge */}
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                          isComplete 
                            ? "bg-emerald-50" 
                            : "bg-gradient-to-br from-primary/10 to-blue-50"
                        )}>
                          {isComplete ? (
                            <Check className="w-6 h-6 text-emerald-500" strokeWidth={2.5} />
                          ) : (
                            <Icon className="w-6 h-6 text-primary" />
                          )}
                        </div>
                        
                        {/* Title & Progress */}
                        <div className="text-left">
                          <h3 className="text-base font-semibold text-slate-900">
                            {categoryMap[category]}
                          </h3>
                          <p className="text-sm text-slate-500 mt-0.5">
                            {uploadedCount} von {items.length} hochgeladen
                          </p>
                        </div>
                      </div>
                      
                      {/* Chevron */}
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                        isOpen ? "bg-slate-100 rotate-180" : "bg-transparent"
                      )}>
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      </div>
                    </CollapsibleTrigger>

                    {/* Document Items */}
                    <CollapsibleContent>
                      <div className="px-4 pb-4 space-y-3">
                        {items.map(item => {
                          const itemFiles = getUserDocumentsForItem(item.id);
                          const hasUnassignedDocs = (unassignedDocsCounts[item.id] || 0) > 0;
                          const uploadState = getItemState(item.id);
                          const isUploading = uploadState && ['processing', 'validating', 'uploading'].includes(uploadState.status);
                          const isSuccess = uploadState?.status === 'success';
                          
                          return (
                            <div 
                              key={item.id} 
                              className={cn(
                                "rounded-xl p-4 transition-all",
                                item.uploaded 
                                  ? "bg-emerald-50/50 border border-emerald-100" 
                                  : "bg-slate-50/80 border border-slate-100"
                              )}
                            >
                              {/* Hidden file input */}
                              <input
                                type="file"
                                ref={el => { fileInputRefs.current[item.id] = el; }}
                                onChange={handleFileInputChange(item.id, item.title)}
                                accept="image/jpeg,image/png,image/jpg,image/gif,image/webp,application/pdf"
                                className="hidden"
                              />
                              
                              {/* Document Header */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium text-slate-900 leading-snug">
                                    {item.title}
                                  </h4>
                                  {!item.uploaded && !isUploading && item.description && (
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                                
                                {/* Status Badge */}
                                {item.uploaded ? (
                                  <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                                    <Check className="w-3 h-3" strokeWidth={3} />
                                    Erledigt
                                  </span>
                                ) : !isUploading && item.required && (
                                  <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-medium border border-amber-100">
                                    Pflicht
                                  </span>
                                )}
                              </div>
                              
                              {/* Upload Progress */}
                              {isUploading && uploadState && uploadState.status !== 'validating' && (
                                <div className="mt-4 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                    <span className="text-xs font-medium text-slate-600">
                                      {uploadState.message}
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                    <div 
                                      className="h-1.5 rounded-full bg-primary transition-all duration-300"
                                      style={{ width: `${uploadState.progress}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                              
                              {/* Validating State */}
                              {isUploading && uploadState?.status === 'validating' && (
                                <div className="mt-4 flex items-center gap-2">
                                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                  <span className="text-xs font-medium text-slate-600">Wird geprüft...</span>
                                </div>
                              )}
                              
                              {/* Success State */}
                              {isSuccess && (
                                <div className="mt-4 flex items-center gap-2 text-emerald-600">
                                  <Check className="w-4 h-4" strokeWidth={2.5} />
                                  <span className="text-xs font-medium">Erfolgreich hochgeladen</span>
                                </div>
                              )}
                              
                              {/* Uploaded Files Actions */}
                              {item.uploaded && itemFiles.length > 0 && !isSuccess && (
                                <div className="mt-4 flex items-center justify-between">
                                  <span className="text-xs text-slate-500">
                                    {itemFiles.length} {itemFiles.length === 1 ? 'Datei' : 'Dateien'}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <button 
                                      onClick={() => handleViewDocuments(item.id, 0)} 
                                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      Ansehen
                                    </button>
                                    <button 
                                      onClick={() => handleDocumentDeleted(itemFiles[0]?.id, item.id)} 
                                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      Entfernen
                                    </button>
                                  </div>
                                </div>
                              )}
                              
                              {/* Upload Actions */}
                              {!item.uploaded && !isUploading && !isSuccess && (
                                <div className="mt-4 flex items-center gap-2">
                                  <button 
                                    onClick={() => handleUploadDocument(item.id)} 
                                    className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-white font-medium text-sm shadow-sm shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all"
                                  >
                                    <CloudUpload className="w-4 h-4" />
                                    Hochladen
                                  </button>
                                  
                                  {hasUnassignedDocs && (
                                    <button 
                                      onClick={() => setAssignmentModal({ open: true, item })} 
                                      className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 active:scale-[0.98] transition-all"
                                    >
                                      <FolderOpen className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}
      </main>

      {/* Document Viewer */}
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

      {/* Completion Dialog */}
      <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-sm bg-white border-0 p-6 overflow-hidden shadow-2xl rounded-3xl gap-0">
          {/* Close Button */}
          <button
            onClick={() => setShowCompletionDialog(false)}
            className="absolute right-4 top-4 w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>

          <div className="pt-2">
            {/* Success Icon */}
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center">
                <FileCheck className="w-8 h-8 text-emerald-500" />
              </div>
            </div>
            
            <DialogTitle className="text-xl font-semibold text-slate-900 text-center mb-2">
              {t.documentChecklist.dialogTitle}
            </DialogTitle>
            <p className="text-sm text-slate-500 text-center mb-1">
              {t.documentChecklist.taxReturnYear} {taxYear}
            </p>
            <p className="text-sm text-slate-600 text-center mb-6 leading-relaxed">
              {t.documentChecklist.dialogDescription}
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/payment')}
                className="w-full h-12 rounded-xl bg-primary text-white font-medium shadow-lg shadow-primary/25 hover:bg-primary/90 transition-colors"
              >
                {t.documentChecklist.createNow}
              </button>
              <button
                onClick={() => setShowCompletionDialog(false)}
                className="w-full h-12 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors"
              >
                {t.documentChecklist.later}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Low Confidence Modal */}
      <LowConfidenceModal
        open={!!lowConfidenceState}
        onClose={handleLowConfidenceClose}
        onConfirm={handleLowConfidenceConfirm}
        onReupload={handleLowConfidenceReupload}
        validationResult={lowConfidenceState?.validationResult || null}
        fileName={lowConfidenceState?.fileName || ''}
        expectedDocType={lowConfidenceState?.itemId}
      />
      
      {/* AI Document Validation Modal - Bottom Sheet */}
      <AnimatePresence>
        {Object.values(uploadStates).some(s => s.status === 'validating' && s.validationProgress) && (() => {
          const validatingState = Object.values(uploadStates).find(s => s.status === 'validating' && s.validationProgress);
          if (!validatingState?.validationProgress) return null;
          
          return (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
              />
              
              {/* Bottom Sheet */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-[101]"
              >
                <div className="flex justify-center pt-3 pb-2 bg-white rounded-t-3xl">
                  <div className="w-10 h-1 bg-slate-200 rounded-full" />
                </div>
                <div className="bg-white px-6 pb-10 pt-2">
                  <AIDocumentValidation 
                    progress={validatingState.validationProgress}
                    documentType={validatingState.checklistItemTitle || 'Dokument'}
                    documentTypeId={validatingState.itemId}
                  />
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};
export default DocumentChecklist;