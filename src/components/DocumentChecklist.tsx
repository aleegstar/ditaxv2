import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { useFormContext } from '../contexts';
import { ChecklistItem } from '../types';
import { Check, ChevronUp, ChevronRight, RefreshCw, AlertTriangle, Eye, Trash2, User, Briefcase, Home, Calculator, FolderSearch, CloudUpload, FileCheck, FolderOpen, Plus } from 'lucide-react';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import DocumentViewer from './DocumentViewer';
import DocumentAssignmentModal from '@/components/documents/DocumentAssignmentModal';
import { supabase } from '@/integrations/supabase/client';
import { debug } from '@/utils/debug';
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
      <SubpageHeader title="Unterlagen" onBack={handleBack} className="w-full max-w-2xl" />

      {/* Main Content */}
      <main className="w-full max-w-2xl space-y-8 sm:py-12 sm:px-6 pt-8 px-4 pb-8">
        {/* Progress Section */}
        {checklistItems.length > 0 && (() => {
        const requiredItems = checklistItems.filter(item => item.required);
        const completedRequired = requiredItems.filter(item => item.uploaded).length;
        const totalRequired = requiredItems.length;
        const allOptional = totalRequired === 0;
        const totalCompleted = checklistItems.filter(item => item.uploaded).length;
        const progressPercent = allOptional ? totalCompleted / checklistItems.length * 100 : completedRequired / totalRequired * 100;
        return <div className="bg-slate-50 rounded-xl p-4 ring-1 ring-slate-200/60">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-sm font-medium text-slate-700">
                    {allOptional ? 'Dokumente' : 'Pflichtdokumente'}
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {allOptional ? `${totalCompleted} von ${checklistItems.length} hochgeladen` : completedRequired === totalRequired ? 'Alle Pflichtdokumente vorhanden' : `Noch ${totalRequired - completedRequired} erforderlich`}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-semibold text-slate-900 tabular-nums">
                    {allOptional ? totalCompleted : completedRequired}/{allOptional ? checklistItems.length : totalRequired}
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div className={cn("h-1.5 rounded-full transition-all duration-500 ease-out", progressPercent === 100 ? "bg-green-500" : "bg-blue-600")} style={{
              width: `${Math.max(2, progressPercent)}%`
            }} role="progressbar" />
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
              <Button onClick={handleForceGeneration} className="bg-[#1D64FF] hover:bg-[#1D64FF]/90 text-white" disabled={isLoading}>
                {isLoading ? "Wird geladen..." : "Checkliste jetzt generieren"}
              </Button>
            </div> : Object.entries(categorizedItems).map(([category, items]) => {
          const isComplete = isCategoryComplete(category);
          const isOpen = openCategories[category];
          const Icon = categoryIcons[category];
          const categoryDescription = getCategoryDescription(category, items);
          return <Collapsible key={category} open={isOpen} onOpenChange={open => {
            setOpenCategories(prev => ({
              ...prev,
              [category]: open
            }));
          }}>
                  {/* Collapsed State - Calm, receded */}
                  {!isOpen ? <CollapsibleTrigger className="group relative w-full rounded-lg transition-colors duration-150 hover:bg-slate-50">
                      <div className="w-full py-3 px-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", isComplete ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400")}>
                            {isComplete ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : <Icon className="w-3.5 h-3.5" />}
                          </div>
                          <span className={cn("text-sm", isComplete ? "text-slate-400 font-normal" : "text-slate-500 font-medium")}>
                            {categoryMap[category]}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors" strokeWidth={1.5} />
                      </div>
                    </CollapsibleTrigger> : (/* Expanded State */
            <div className="relative w-full bg-white rounded-xl ring-1 ring-slate-200 shadow-lg shadow-slate-200/50 overflow-hidden">
                      {/* Header */}
                      <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between border-b border-slate-100 bg-white">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full text-white flex items-center justify-center bg-sidebar-primary">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-slate-900">
                              {categoryMap[category]}
                            </span>
                            <span className="block text-xs text-slate-500">
                              {items.filter(i => i.uploaded).length} von {items.length} erledigt
                            </span>
                          </div>
                        </div>
                        <ChevronUp className="w-4 h-4 text-slate-500" strokeWidth={1.5} />
                      </CollapsibleTrigger>

                      {/* Content Area */}
                      <CollapsibleContent className="p-4 bg-slate-50/50">
                        <div className="space-y-4">
                          {items.map(item => {
                    const itemFiles = getUserDocumentsForItem(item.id);
                    const hasUnassignedDocs = (unassignedDocsCounts[item.id] || 0) > 0;
                    return <div key={item.id} className="bg-white rounded-lg p-4 ring-1 ring-slate-100">
                                {/* Document Header */}
                                <div className="flex items-start justify-between gap-3">
                                  <h3 className="text-sm font-medium text-slate-800">
                                    {item.title}
                                  </h3>
                                  {!item.uploaded && item.required && <span className="shrink-0 text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                                      Pflicht
                                    </span>}
                                </div>
                                
                                {/* Description - only when not uploaded */}
                                {!item.uploaded && item.description && <p className="text-xs text-slate-400 leading-relaxed mt-1 mb-4">
                                    {item.description}
                                  </p>}
                                
                                {/* Uploaded State */}
                                {item.uploaded && itemFiles.length > 0 && <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                                    <div className="flex items-center gap-1.5 text-green-600">
                                      <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                                      <span className="text-xs font-medium">
                                        {itemFiles.length} {itemFiles.length === 1 ? 'Datei' : 'Dateien'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <button onClick={() => handleViewDocuments(item.id, 0)} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                                        Ansehen
                                      </button>
                                      <button onClick={() => handleDocumentDeleted(itemFiles[0]?.id, item.id)} className="text-xs text-slate-400 hover:text-red-500 transition-colors">
                                        Entfernen
                                      </button>
                                    </div>
                                  </div>}
                                
                                {/* Action Buttons */}
                                {!item.uploaded && <div className="flex items-center gap-4">
                                    {/* Primary Upload Button */}
                                    <button onClick={() => handleUploadDocument(item.id)} className="flex items-center justify-center gap-2 bg-gradient-to-b from-blue-500 to-blue-600 text-white font-medium py-2 px-5 rounded-lg transition-all hover:from-blue-600 hover:to-blue-700 active:scale-[0.98] text-sm shadow-sm shadow-blue-500/25">
                                      <CloudUpload className="w-4 h-4" strokeWidth={1.5} />
                                      Hochladen
                                    </button>
                                    
                                    {/* Secondary: Use existing document - styled like social login buttons */}
                                    {hasUnassignedDocs && <button onClick={() => setAssignmentModal({
                          open: true,
                          item
                        })} className="bg-gradient-to-b from-slate-50 to-slate-100 text-slate-600 border-t border-white/80 rounded-lg py-2 px-4 flex items-center justify-center gap-2 shadow-[0_2px_8px_0_rgba(100,116,139,0.12)] hover:shadow-[0_4px_12px_rgba(100,116,139,0.18)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 text-sm font-medium">
                                        Zuweisen
                                      </button>}
                                  </div>}
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
      <AlertDialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <FileCheck className="w-8 h-8 text-emerald-600" />
            </div>
            <AlertDialogTitle className="text-xl font-semibold text-slate-800">
              Alle Unterlagen vollständig!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 mt-2">
              Du hast alle benötigten Unterlagen hochgeladen. Möchtest du jetzt deine Steuererklärung erstellen lassen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <AlertDialogCancel className="w-full sm:w-auto border-slate-200 text-slate-700 hover:bg-slate-50">
              Später
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate('/payment')} className="w-full sm:w-auto bg-[#1D64FF] hover:bg-[#1D64FF]/90 text-white">
              Ja, jetzt erstellen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
};
export default DocumentChecklist;