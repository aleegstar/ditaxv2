import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFormContext } from '../contexts';
import { ChecklistItem } from '../types';
import { FileUp, Check, X, ChevronDown, ChevronUp, RefreshCw, AlertTriangle, Eye, FileText, Folder, Upload, Trash2, User, Briefcase, Home, Calculator, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from '@/hooks/use-mobile';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from '@/hooks/use-toast';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNavigate } from 'react-router-dom';
import { useDocuments } from '@/hooks/use-documents';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { DocumentMetadata } from '@/services/DocumentService';

import { Sphere } from "@/components/ui/sphere";
import { BorderBeam } from "@/components/ui/border-beam";

import { motion } from 'framer-motion';
import { FramerButton } from "@/components/ui/framer-button";
import DocumentViewer from './DocumentViewer';
import DocumentAssignmentModal from '@/components/documents/DocumentAssignmentModal';
import { supabase } from '@/integrations/supabase/client';
import { debug } from '@/utils/debug';
import { ElementsIcon } from '@/components/ui/ElementsIcon';
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
  const [spherePulse, setSpherePulse] = useState(false);
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
        counts[item.id] = data?.length || 0; // For now, show all unassigned docs for each item
      });
      setUnassignedDocsCounts(counts);
    } catch (error) {
      debug.error('Error in loadUnassignedDocsCount:', error);
    }
  }, [userId, taxYear, checklistItems]);
  const hasLoadedCountsRef = useRef(false);
  
  useEffect(() => {
    // Only load if we have necessary data and haven't loaded yet
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
      
      // Reset flag after generation completes
      setTimeout(() => {
        hasGeneratedRef.current = false;
      }, 2000);
    }
  }, [shouldGenerateChecklist, generateChecklist, formData]);
  useEffect(() => {
    if (shouldGenerateChecklist) {
      console.log('🔄 Force generating checklist - no items found');
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
    setSpherePulse(true);
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
  // Use the memoized categorized items instead of recalculating
  const categorizedItems = categorizedItemsMemo;

  // Calculate initial category status based on completion
  const calculateInitialCategoryStatus = useCallback(() => {
    const status: Record<string, boolean> = {};
    Object.keys(categorizedItems).forEach(category => {
      const items = categorizedItems[category] || [];
      const requiredItems = items.filter(item => item.required);

      // If no required items, close the category
      if (requiredItems.length === 0) {
        status[category] = false;
      } else {
        // Open if any required documents are missing
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
  const renderUploadedFiles = (itemId: string) => {
    const files = getUserDocumentsForItem(itemId);
    if (files.length === 0) return null;
    return <div className="p-6 pt-0 flex justify-center">
        <div className="inline-flex items-center gap-3 rounded-full px-6 py-3 bg-white max-w-full"
          style={{
            boxShadow: 'rgba(0, 0, 0, 0.15) 0px 32px 32px -12px'
          }}
        >
          <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-900 truncate" title={files[0]?.fileName}>
            {files[0]?.fileName}
          </span>
          <Button variant="ghost" size="sm" onClick={e => {
          e.stopPropagation();
          handleViewDocuments(itemId, 0);
        }} className="text-gray-600 hover:bg-gray-100 p-2 h-auto flex-shrink-0">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-gray-600 hover:bg-gray-100 p-2 h-auto flex-shrink-0" onClick={e => {
          e.stopPropagation();
          handleDocumentDeleted(files[0]?.id, files[0]?.checklistItemId);
        }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>;
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
    return <div className="w-full animate-fade-in p-6">
        <div className="flex flex-row items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2 bg-white/20" />
            <Skeleton className="h-4 w-80 bg-white/20" />
          </div>
        </div>
        <div className="p-0">
          <Skeleton className="h-32 w-full bg-white/20" />
        </div>
      </div>;
  }
  if (!isAuthValid) {
    return <div className="w-full animate-fade-in p-6">
        <Alert variant="destructive" className="mb-4 bg-red-500/10 border-red-500/20 backdrop-blur-md">
          <AlertTriangle className="h-4 w-4 text-red-300" />
          <AlertTitle className="text-red-300">Authentifizierung erforderlich</AlertTitle>
          <AlertDescription className="text-red-200">
            Du musst angemeldet sein, um deine Dokumente zu verwalten.
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={() => navigate('/auth', {
              state: {
                from: '/form'
              }
            })} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                Zur Anmeldung
              </Button>
              <Button size="sm" onClick={handleAuthRefresh} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <RefreshCw className="h-3 w-3 mr-1" />
                Session prüfen
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>;
  }
  if (!initialLoadComplete || isLoading && checklistItems.length === 0) {
    return <div className="w-full animate-fade-in p-6">
        <div className="flex flex-row items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2 bg-white/20" />
            <Skeleton className="h-4 w-80 bg-white/20" />
          </div>
        </div>
        <div className="p-0">
          <div className="space-y-6">
            {[1, 2, 3].map(item => <div key={item} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-40 bg-white/20" />
                  <Skeleton className="h-6 w-16 rounded-full bg-white/20" />
                </div>
                <Skeleton className="h-1 w-full my-2 bg-white/20" />
                <div className="space-y-3">
                  {[1, 2].map(subitem => <Skeleton key={subitem} className="h-24 w-full rounded-lg bg-white/20" />)}
                </div>
              </div>)}
          </div>
        </div>
      </div>;
  }
  return <div className="min-h-screen">
      <SubpageHeader title="Unterlagen" onBack={handleBack} />
      <div className="flex flex-col items-center justify-start p-6 pt-4 relative">
        <div className="w-full max-w-4xl">
        

        {error && <Alert variant="destructive" className="mb-4 bg-red-500/10 border-red-500/20 backdrop-blur-md">
            <AlertTriangle className="h-4 w-4 text-red-300" />
            <AlertTitle className="text-red-300">Fehler beim Laden der Dokumente</AlertTitle>
            <AlertDescription className="text-red-200">
              {error}
              <div className="mt-2">
                <Button size="sm" onClick={() => navigate('/auth', {
                state: {
                  from: '/form'
                }
              })} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  Zur Anmeldung
                </Button>
              </div>
            </AlertDescription>
          </Alert>}

        <div className="space-y-2.5">
          {Object.keys(categorizedItems).length === 0 ? <div className="text-center py-8">
              <p className="text-white/80 mb-4">
                Die Dokumenten-Checkliste wird basierend auf deinen Angaben erstellt.
                {!formDataLoaded && " Bitte warte, während deine Daten geladen werden."}
              </p>
              <Button onClick={handleForceGeneration} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading}>
                {isLoading ? <div className="flex items-center gap-2">
                    <span>Wird geladen...</span>
                  </div> : "Checkliste jetzt generieren"}
              </Button>
            </div> : Object.entries(categorizedItems).map(([category, items]) => {
            const isComplete = isCategoryComplete(category);
            const isOpen = openCategories[category];
            const Icon = categoryIcons[category];
            
            return <Collapsible key={category} open={isOpen} onOpenChange={open => {
              setOpenCategories(prev => ({
                ...prev,
                [category]: open
              }));
            }}>
                <div className="mb-2.5">
                  <CollapsibleTrigger className="group w-full flex items-center justify-between p-3 pl-4 rounded-2xl bg-white border border-slate-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:border-slate-200 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        "p-1.5 rounded-lg",
                        isComplete 
                          ? "bg-emerald-50 text-emerald-600"
                          : isOpen
                            ? "bg-[#1d64ff] text-white shadow-sm"
                            : "bg-slate-100 text-slate-500"
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={cn(
                        "text-sm transition-colors",
                        isComplete || isOpen ? "font-semibold text-slate-900" : "font-medium text-slate-700 group-hover:text-slate-900"
                      )}>
                        {categoryMap[category]}
                      </span>
                    </div>
                    <div className="pr-1">
                      {isComplete ? (
                        <Check className="w-5 h-5 text-emerald-500" strokeWidth={1.5} />
                      ) : isOpen ? (
                        <ChevronDown className="w-5 h-5 text-[#1d64ff] rotate-180 transition-transform" strokeWidth={1.5} />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-400" strokeWidth={1.5} />
                      )}
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="mt-6">
                    <div className="space-y-6 pl-4">{/* Add left padding for visual hierarchy */}
                      {items.map(item => {
                    const itemFiles = getUserDocumentsForItem(item.id);
                    const fileCount = itemFiles.length;
                        return <div 
                          key={item.id} 
                          className={cn(
                            "relative overflow-hidden rounded-[24px] p-6 text-white cursor-pointer hover:scale-[1.02] transition-all duration-300",
                            item.uploaded ? "cursor-default" : "cursor-pointer shadow-lg"
                          )}
                          style={{
                            background: item.uploaded 
                              ? 'rgb(244, 244, 244)'
                              : 'linear-gradient(to bottom right, #1d64ff, #1d64ff)'
                          }}
                        >
                          <BorderBeam 
                            size={120} 
                            duration={12} 
                            anchor={90} 
                            borderWidth={2} 
                            colorFrom={item.uploaded ? "rgb(244, 244, 244)" : "#ffffff"} 
                            colorTo={item.uploaded ? "rgb(244, 244, 244)" : "#ffffff"} 
                            delay={0} 
                            className="rounded-[24px]"
                          />
                          
                          {/* Content */}
                          <div className="relative z-10">
                            <div className="flex flex-col items-center justify-center p-6 space-y-4">
                              {/* Title Pill */}
                              {item.uploaded ? (
                                <div className="inline-flex items-center gap-3 rounded-full px-6 py-3 bg-white"
                                  style={{
                                    boxShadow: 'rgba(0, 0, 0, 0.15) 0px 32px 32px -12px'
                                  }}
                                >
                                  <Check className="w-5 h-5 text-green-600" />
                                  <span className="text-base font-semibold text-gray-900">
                                    {item.title}
                                  </span>
                                </div>
                              ) : (
                                <>
                                  <h4 className="font-semibold text-xl text-white text-center">{item.title}</h4>
                                  
                                  {/* Description - only show if not uploaded */}
                                  <p className="text-sm text-white/90 text-center max-w-md">{item.description}</p>
                                  
                                  {/* Badges - only show if not uploaded */}
                                  <div className="flex items-center gap-2 flex-wrap justify-center">
                                    {item.required && (
                                      <span className="inline-flex items-center rounded-full px-4 py-1.5 text-xs font-medium bg-white/20 text-white border border-white/30">
                                        Erforderlich
                                      </span>
                                    )}
                                    {fileCount > 0 && (
                                      <span className="inline-flex items-center rounded-full px-4 py-1.5 text-xs font-medium bg-white/20 text-white border border-white/30">
                                        {fileCount} Datei{fileCount !== 1 ? 'en' : ''}
                                      </span>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                            
                            {/* Uploaded Files Section */}
                            {item.uploaded && renderUploadedFiles(item.id)}
                            
                            {/* Upload/Actions Section */}
                            {!item.uploaded && <div className="p-6 pt-0">
                                <div className="space-y-4">
                                  {/* Assignment Button - Only show if there are unassigned documents */}
                                  {(unassignedDocsCounts[item.id] || 0) > 0 && (
                                    <>
                                      <div className="flex justify-center">
                                        <button 
                                          onClick={() => setAssignmentModal({
                                            open: true,
                                            item
                                          })} 
                                          className="inline-flex items-center gap-3 rounded-full px-6 py-3 bg-white hover:bg-white/95 transition-colors"
                                          style={{
                                            boxShadow: 'rgba(0, 0, 0, 0.15) 0px 32px 32px -12px'
                                          }}
                                        >
                                          {/* Outer blue circle with gradient */}
                                          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{
                                            background: 'linear-gradient(rgb(54, 132, 255) 0%, rgb(10, 105, 255) 100%)',
                                            boxShadow: 'rgba(255, 255, 255, 0.1) 0px 0.78125px 0px 0px inset'
                                          }}>
                                            {/* Folder icon in white */}
                                            <Folder className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                                          </div>
                                          <span className="text-base font-semibold text-gray-900">
                                            Zuordnen
                                          </span>
                                        </button>
                                      </div>
                                      
                                      {/* Separator with "oder" */}
                                      <div className="relative flex items-center">
                                        <div className="flex-grow border-t border-white/30"></div>
                                        <span className="flex-shrink mx-4 text-white/70 text-sm">oder</span>
                                        <div className="flex-grow border-t border-white/30"></div>
                                      </div>
                                    </>
                                  )}
                                  
                                  {/* Upload Button */}
                                  {/* Upload Button - Centered Pill */}
                                  <div className="flex justify-center">
                                    <button 
                                      onClick={() => handleUploadDocument(item.id)} 
                                      className="inline-flex items-center gap-3 rounded-full px-6 py-3 bg-white hover:bg-white/95 transition-colors"
                                      style={{
                                        boxShadow: 'rgba(0, 0, 0, 0.15) 0px 32px 32px -12px'
                                      }}
                                    >
                                      {/* Outer blue circle with gradient */}
                                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{
                                        background: 'linear-gradient(rgb(54, 132, 255) 0%, rgb(10, 105, 255) 100%)',
                                        boxShadow: 'rgba(255, 255, 255, 0.1) 0px 0.78125px 0px 0px inset'
                                      }}>
                                        {/* Plus icon */}
                                        <svg 
                                          width="14" 
                                          height="14" 
                                          viewBox="0 0 24 24" 
                                          fill="none" 
                                          xmlns="http://www.w3.org/2000/svg"
                                          className="text-white"
                                        >
                                          <path 
                                            d="M12 5V19M5 12H19" 
                                            stroke="currentColor" 
                                            strokeWidth="2.5" 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round"
                                          />
                                        </svg>
                                      </div>
                                      <span className="text-base font-semibold text-gray-900">
                                        Hochladen
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              </div>}
                          </div>
                        </div>;
                  })}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>;
            })}
        </div>

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
        </div>
      </div>
    </div>;
};
export default DocumentChecklist;