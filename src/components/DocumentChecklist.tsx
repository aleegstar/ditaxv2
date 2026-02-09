import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { useFormContext } from '../contexts';
import { ChecklistItem } from '../types';
import { Check, ChevronUp, ChevronRight, RefreshCw, AlertTriangle, Eye, Trash2, User, Briefcase, Home, Calculator, FolderSearch, CloudUpload, FileCheck, FolderOpen, Plus, X } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import { debug } from '@/utils/debug';
import { useI18n } from '@/contexts/I18nContext';

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
  return <div className="min-h-screen bg-white text-slate-800 antialiased flex flex-col items-center">
      {/* Header */}
      <SubpageHeader title={t.documentChecklist.title} onBack={handleBack} className="w-full max-w-4xl" />

      {/* Main Content */}
      <main className="w-full max-w-4xl space-y-5 sm:py-10 sm:px-6 pt-6 px-4 pb-8">
        {/* Progress Section - Clean Minimal Card */}
        {checklistItems.length > 0 && (() => {
        const requiredItems = checklistItems.filter(item => item.required);
        const completedRequired = requiredItems.filter(item => item.uploaded).length;
        const totalRequired = requiredItems.length;
        const allOptional = totalRequired === 0;
        const totalCompleted = checklistItems.filter(item => item.uploaded).length;
        const progressPercent = allOptional ? totalCompleted / checklistItems.length * 100 : completedRequired / totalRequired * 100;
        const isComplete = progressPercent === 100;
        return <div className={cn(
          "relative rounded-2xl p-5 transition-all duration-300 bg-white border shadow-sm",
          isComplete 
            ? "border-emerald-200 bg-emerald-50/50" 
            : "border-slate-200"
        )}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    isComplete 
                      ? "bg-emerald-500 text-white" 
                      : "bg-slate-200 text-slate-600"
                  )}>
                    {isComplete ? <Check className="w-5 h-5" strokeWidth={2.5} /> : <FileCheck className="w-5 h-5" />}
                  </div>
                  <div>
                    <span className={cn(
                      "text-sm font-semibold",
                      isComplete ? "text-emerald-700" : "text-slate-700"
                    )}>
                      {allOptional ? t.documentChecklist.documents : t.documentChecklist.mandatoryDocuments}
                    </span>
                    <p className={cn(
                      "text-xs mt-0.5",
                      isComplete ? "text-emerald-600/80" : "text-slate-500"
                    )}>
                      {allOptional 
                        ? `${totalCompleted} ${t.documentChecklist.completedOf} ${checklistItems.length} ${t.documentChecklist.uploaded}` 
                        : completedRequired === totalRequired 
                          ? t.documentChecklist.allMandatoryPresent 
                          : `${t.documentChecklist.stillRequired}: ${totalRequired - completedRequired}`}
                    </p>
                  </div>
                </div>
                <div className={cn(
                  "text-2xl font-bold tabular-nums",
                  isComplete ? "text-emerald-600" : "text-slate-700"
                )}>
                  {allOptional ? totalCompleted : completedRequired}
                  <span className="text-base font-normal text-slate-400">/{allOptional ? checklistItems.length : totalRequired}</span>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="relative w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-700 ease-out",
                    isComplete 
                      ? "bg-emerald-500" 
                      : "bg-primary"
                  )} 
                  style={{ width: `${Math.max(2, progressPercent)}%` }} 
                  role="progressbar" 
                />
              </div>
            </div>;
      })()}

        {/* Accordion Group */}
        <div className="space-y-3">
          {error && <Alert variant="destructive" className="bg-red-50 border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-700">Fehler beim Laden der Dokumente</AlertTitle>
              <AlertDescription className="text-red-600">
                {error}
                <div className="mt-2">
                  <Button size="sm" onClick={() => navigate('/auth', {
                state: {
                  from: '/form'
                }
              })} variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50">
                    Zur Anmeldung
                  </Button>
                </div>
              </AlertDescription>
            </Alert>}

          {Object.keys(categorizedItems).length === 0 ? <div className="text-center py-8">
              <p className="text-slate-600 mb-4">
                Die Dokumenten-Checkliste wird basierend auf deinen Angaben erstellt.
                {!formDataLoaded && " Bitte warte, während deine Daten geladen werden."}
              </p>
              <Button onClick={handleForceGeneration} className="bg-primary hover:bg-primary/90 text-white rounded-xl" disabled={isLoading}>
                {isLoading ? "Wird geladen..." : "Checkliste jetzt generieren"}
              </Button>
        </div> : Object.entries(categorizedItems).map(([category, items]) => {
          const isComplete = isCategoryComplete(category);
          const isOpen = openCategories[category];
          const Icon = categoryIcons[category];
          const uploadedCount = items.filter(i => i.uploaded).length;
          
          return <Collapsible key={category} open={isOpen} onOpenChange={open => {
            setOpenCategories(prev => ({
              ...prev,
              [category]: open
            }));
          }}>
                  {/* Collapsed State - Ultra clean */}
                  {!isOpen ? <CollapsibleTrigger className="group w-full bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                      <div className="w-full py-4 px-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                             "w-9 h-9 rounded-xl flex items-center justify-center",
                            isComplete 
                              ? "bg-emerald-100 text-emerald-600" 
                              : "bg-slate-100 text-slate-500"
                          )}>
                            {isComplete ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <Icon className="w-4 h-4" />}
                          </div>
                          <div className="text-left">
                            <span className={cn(
                              "text-sm font-medium block",
                              isComplete ? "text-slate-500" : "text-slate-700"
                            )}>
                              {categoryMap[category]}
                            </span>
                            <span className="text-xs text-slate-400">
                              {uploadedCount}/{items.length} {t.documentChecklist.uploaded}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-400 transition-colors" strokeWidth={1.5} />
                      </div>
                    </CollapsibleTrigger> : (/* Expanded State */
            <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                      {/* Header */}
                      <CollapsibleTrigger className="w-full px-5 py-4 flex items-center justify-between border-b border-slate-100">
                        <div className="flex items-center gap-3">
                           <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center",
                            isComplete 
                              ? "bg-emerald-500 text-white" 
                              : "bg-primary text-white"
                          )}>
                            {isComplete ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <Icon className="w-4 h-4" />}
                          </div>
                          <div className="text-left">
                            <span className="text-sm font-semibold text-slate-800 block">
                              {categoryMap[category]}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">
                                {uploadedCount} {t.documentChecklist.completedOf} {items.length}
                              </span>
                              {isComplete && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                                  <Check className="w-2.5 h-2.5" />
                                  Fertig
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <ChevronUp className="w-5 h-5 text-slate-400" strokeWidth={1.5} />
                      </CollapsibleTrigger>

                      {/* Content Area */}
                      <CollapsibleContent className="px-4 py-4">
                        <div className="space-y-3">
                          {items.map(item => {
                    const itemFiles = getUserDocumentsForItem(item.id);
                    const hasUnassignedDocs = (unassignedDocsCounts[item.id] || 0) > 0;
                    
                    return <div 
                      key={item.id} 
                      className={cn(
                        "bg-white rounded-xl p-4 transition-all",
                        item.uploaded 
                          ? "border border-emerald-200 hover:border-emerald-300" 
                          : "border border-slate-200 hover:border-slate-300"
                      )}
                    >
                                {/* Document Header */}
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3">
                                    {/* Status indicator */}
                                    <div className={cn(
                                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                                      item.uploaded 
                                        ? "bg-emerald-100 text-emerald-600" 
                                        : item.required 
                                          ? "bg-amber-100 text-amber-600" 
                                          : "bg-slate-100 text-slate-400"
                                    )}>
                                      {item.uploaded 
                                        ? <Check className="w-4 h-4" strokeWidth={2.5} />
                                        : <CloudUpload className="w-4 h-4" />
                                      }
                                    </div>
                                    <div>
                                      <h3 className="text-sm font-medium text-slate-800">
                                        {item.title}
                                      </h3>
                                      {!item.uploaded && item.description && (
                                        <p className="text-xs text-slate-400 leading-relaxed mt-1 max-w-xs">
                                          {item.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {!item.uploaded && item.required && (
                                    <span className="shrink-0 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                      {t.documentChecklist.required}
                                    </span>
                                  )}
                                </div>
                                
                                {/* Uploaded State */}
                                {item.uploaded && itemFiles.length > 0 && (
                                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100/80">
                                    <div className="flex items-center gap-2 text-emerald-600">
                                      <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg">
                                        <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                                        <span className="text-xs font-medium">
                                          {itemFiles.length} {itemFiles.length === 1 ? t.documentChecklist.file : t.documentChecklist.files}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                     <button 
                                        onClick={() => handleViewDocuments(item.id, 0)} 
                                        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        {t.documentChecklist.viewDocs}
                                      </button>
                                      <button 
                                        onClick={() => handleDocumentDeleted(itemFiles[0]?.id, item.id)} 
                                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        {t.documentChecklist.remove}
                                      </button>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Action Buttons */}
                                {!item.uploaded && (
                                  <div className="flex items-center gap-2 mt-4">
                                    {/* Primary: Upload new document */}
                                    <button 
                                      onClick={() => handleUploadDocument(item.id)} 
                                      className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-medium h-9 px-5 rounded-xl shadow-sm transition-all active:scale-[0.98] text-sm"
                                    >
                                      <CloudUpload className="w-4 h-4" strokeWidth={2} />
                                      {t.documentChecklist.upload}
                                    </button>
                                    
                                    {/* Secondary: Assign existing document */}
                                    {hasUnassignedDocs && (
                                      <button 
                                        onClick={() => setAssignmentModal({
                                          open: true,
                                          item
                                        })} 
                                        className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-slate-100 text-slate-600 font-medium text-sm transition-all hover:bg-slate-200 active:scale-[0.98]"
                                      >
                                        <FolderOpen className="w-4 h-4" strokeWidth={1.5} />
                                        {t.documentChecklist.assign}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>;
                  })}
                        </div>
                      </CollapsibleContent>
                    </div>)}
                </Collapsible>;
        })}
        </div>
      </main>

      <DocumentViewer documents={viewerDocuments} initialDocumentIndex={viewerInitialIndex} isOpen={viewerOpen} onClose={handleCloseViewer} />
      
      {/* Document Assignment Modal */}
      {assignmentModal.item && <DocumentAssignmentModal open={assignmentModal.open} onClose={() => setAssignmentModal({
      open: false,
      item: null
    })} checklistItemId={assignmentModal.item.id} checklistItemTitle={assignmentModal.item.title} taxYear={taxYear} onAssignment={() => {
      refreshDocuments();
      setAssignmentModal({
        open: false,
        item: null
      });
    }} />}

      {/* Completion Dialog */}
      <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md bg-white border-0 p-6 overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] rounded-3xl gap-0">
          {/* Close Button */}
          <button
            onClick={() => setShowCompletionDialog(false)}
            className="absolute right-4 top-4 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shadow-sm hover:bg-slate-200 transition-colors z-10"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>

          <div className="pt-4">
            {/* Header without icon */}
            <div className="flex flex-col items-center mb-4">
              <DialogTitle className="text-xl font-semibold text-slate-900 text-center">
                {t.documentChecklist.dialogTitle}
              </DialogTitle>
              <p className="text-sm text-slate-500 mt-1 text-center">
                {t.documentChecklist.taxReturnYear} {taxYear}
              </p>
            </div>

            <p className="text-slate-600 text-sm leading-relaxed text-center mb-6">
              {t.documentChecklist.dialogDescription}
            </p>

            <div className="flex flex-col gap-3">
              <Button
                onClick={() => navigate('/payment')}
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium shadow-[0_0_20px_rgba(29,100,255,0.3)]"
              >
                {t.documentChecklist.createNow}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowCompletionDialog(false)}
                className="w-full h-12 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium border border-slate-200"
              >
                {t.documentChecklist.later}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};
export default DocumentChecklist;