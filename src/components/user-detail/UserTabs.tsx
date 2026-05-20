import React, { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, FileText, Briefcase, Wallet, Receipt, Upload, FolderOpen, Files, FileCheck, MessageCircle, StickyNote, ClipboardList } from 'lucide-react';
import { User, TaxReturn } from '@/types';
import { defaultFormData } from '@/contexts/form/defaults';
import FormDataTableView from './FormDataTableView';
import SimpleChatWindow from '@/components/chat/SimpleChatWindow';
import AdminNotesCard from './AdminNotesCard';
import DocumentsPdfDownloader from './DocumentsPdfDownloader';
import DocumentCard from './DocumentCard';
import FormDataPdfDownloader from './FormDataPdfDownloader';
import DocumentPreview from './DocumentPreview';
import ErrorBoundary from '@/components/ErrorBoundary';
import CompletedTaxReturnManager from './CompletedTaxReturnManager';
import { UserDefinitiveTaxBill } from './UserDefinitiveTaxBill';
import { PriorYearReturnCard } from './PriorYearReturnCard';

// Category mapping for checklist items
const CHECKLIST_CATEGORY_MAP: Record<string, 'income' | 'assets' | 'deductions' | 'general'> = {
  // Income
  'employment-income': 'income',
  'rental-income': 'income',
  'dividend-statement': 'income',
  'freelance-income': 'income',
  'pension-statement': 'income',
  'gift-inheritance': 'income',
  'pension-payout': 'income',
  'other-income': 'income',
  
  // Assets
  'bank-account-statement': 'assets',
  'deposit-account': 'assets',
  'crypto-portfolio': 'assets',
  'mortgage-statement': 'assets',
  'debt-statements': 'assets',
  'other-assets': 'assets',
  'property-purchase-contract': 'assets',
  
  // Deductions
  'pillar3a-certificate': 'deductions',
  'bvg-purchase': 'deductions',
  'education-expenses': 'deductions',
  'donation-receipts': 'deductions',
  'maintenance-receipts': 'deductions',
  'childcare-expenses': 'deductions',
  'supported-persons': 'deductions',
  'maintenance-payments': 'deductions',
  'other-deductions': 'deductions',
  
  // General
  'tax-cover-sheet': 'general',
};
interface UserTabsProps {
  user: User;
  taxReturns: TaxReturn[];
  onTaxReturnClick: (taxReturn: TaxReturn) => void;
  onUploadClick: () => void;
  userId: string;
  allFormData: any[];
  onYearChange: (year: string) => void;
  initialNotes: string;
  selectedYear: string;
  selectedTaxFilerId: string | null;
  completedTaxReturns?: any[];
  onCompletedTaxReturnsRefresh?: () => void;
}

const UserTabs: React.FC<UserTabsProps> = ({
  user,
  taxReturns,
  onTaxReturnClick,
  onUploadClick,
  userId,
  allFormData,
  onYearChange,
  initialNotes,
  selectedYear,
  selectedTaxFilerId,
  completedTaxReturns = [],
  onCompletedTaxReturnsRefresh = () => {}
}) => {
  const [previewDocument, setPreviewDocument] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Enhanced available years logic that includes ALL years with any kind of data
  const availableYears = useMemo(() => {
    const years = new Set<string>();

    // Add years from tax returns - ensure string conversion
    taxReturns.forEach(tr => {
      if (tr.taxYear) {
        years.add(String(tr.taxYear));
      }
    });

    // Add years from ALL form data (not just current user's form data) - ensure string conversion
    allFormData.forEach(fd => {
      if (fd.tax_year) {
        years.add(String(fd.tax_year));
      }
    });

    // Add years from completed tax returns - ensure string conversion
    completedTaxReturns.forEach(ctr => {
      if (ctr.tax_year) {
        years.add(String(ctr.tax_year));
      }
    });

    // Add years from uploaded documents - ensures documents with different years are visible
    if (user.documents) {
      user.documents.forEach(doc => {
        if ((doc as any).tax_year) {
          years.add(String((doc as any).tax_year));
        }
      });
    }

    // Always include current year and surrounding years for admin convenience
    const currentYear = new Date().getFullYear();
    // Include 3 years back and 2 years forward to ensure 2024 is always visible
    for (let i = -3; i <= 2; i++) {
      years.add(String(currentYear + i));
    }
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [taxReturns, allFormData, completedTaxReturns, user.documents]);

  // Transform and filter form data for selected year AND tax_filer_id
  const formDataForSelectedYear = useMemo(() => {
    // Filter form data by selected year AND tax_filer_id
    const filteredData = allFormData.filter(item => {
      const yearMatch = String(item.tax_year) === String(selectedYear);
      const filerMatch = !selectedTaxFilerId || item.tax_filer_id === selectedTaxFilerId;
      return yearMatch && filerMatch;
    });

    // Transform array into structured FormData object
    const transformedData = {
      ...defaultFormData
    };
    filteredData.forEach(item => {
      if (item.form_type && item.data) {
        transformedData[item.form_type as keyof typeof transformedData] = {
          ...transformedData[item.form_type as keyof typeof transformedData],
          ...item.data
        };
      }
    });
    return transformedData;
  }, [allFormData, selectedYear, selectedTaxFilerId]);

  // Filter documents by selected year AND tax_filer_id
  const documentsForSelectedYear = useMemo(() => {
    if (!user.documents) return [];

    // Filter documents by tax_year AND tax_filer_id
    return user.documents.filter(doc => {
      const yearMatch = (doc as any).tax_year 
        ? String((doc as any).tax_year) === String(selectedYear)
        : true;
      const filerMatch = !selectedTaxFilerId || (doc as any).tax_filer_id === selectedTaxFilerId;
      return yearMatch && filerMatch;
    });
  }, [user.documents, selectedYear, selectedTaxFilerId]);

  // Group documents by category based on checklist item
  const groupedDocuments = useMemo(() => {
    const groups: {
      income: typeof documentsForSelectedYear;
      assets: typeof documentsForSelectedYear;
      deductions: typeof documentsForSelectedYear;
      general: typeof documentsForSelectedYear;
      unassigned: typeof documentsForSelectedYear;
    } = {
      income: [],
      assets: [],
      deductions: [],
      general: [],
      unassigned: [],
    };

    documentsForSelectedYear.forEach(doc => {
      const checklistId = (doc as any).checklist_item_id || (doc as any).checklistItemId;
      
      if (!checklistId) {
        groups.unassigned.push(doc);
        return;
      }

      // Direct match
      if (CHECKLIST_CATEGORY_MAP[checklistId]) {
        groups[CHECKLIST_CATEGORY_MAP[checklistId]].push(doc);
        return;
      }

      // Handle dynamic IDs like 'property-purchase-contract-{uuid}'
      const parts = checklistId.split('-');
      // Try progressively shorter prefixes
      for (let i = parts.length - 1; i >= 2; i--) {
        const prefix = parts.slice(0, i).join('-');
        if (CHECKLIST_CATEGORY_MAP[prefix]) {
          groups[CHECKLIST_CATEGORY_MAP[prefix]].push(doc);
          return;
        }
      }

      // If no category found, put in general
      groups.general.push(doc);
    });

    return groups;
  }, [documentsForSelectedYear]);

  // Check if we have actual form data for the selected year
  const hasActualFormData = useMemo(() => {
    // Check if any form data exists for this specific year
    const hasYearData = allFormData.some(item => String(item.tax_year) === String(selectedYear));

    // Also check if the transformed data has meaningful content
    const hasTransformedData = formDataForSelectedYear && Object.values(formDataForSelectedYear).some(sectionData => {
      if (!sectionData || typeof sectionData !== 'object') return false;
      return Object.keys(sectionData).length > 0;
    });
    return hasYearData || hasTransformedData;
  }, [allFormData, selectedYear, formDataForSelectedYear]);

  // Get data status for selected year
  const getYearDataStatus = useMemo(() => {
    const hasFormData = hasActualFormData;
    const hasTaxReturn = taxReturns.some(tr => String(tr.taxYear) === String(selectedYear));
    const hasCompletedReturn = completedTaxReturns.some(ctr => String(ctr.tax_year) === String(selectedYear));
    const hasDocuments = documentsForSelectedYear.length > 0;
    return {
      hasFormData,
      hasTaxReturn,
      hasCompletedReturn,
      hasDocuments,
      hasAnyData: hasFormData || hasTaxReturn || hasCompletedReturn
    };
  }, [selectedYear, hasActualFormData, taxReturns, completedTaxReturns, documentsForSelectedYear]);

  const handleYearChange = (year: string) => {
    onYearChange(year);
  };

  const handleDocumentPreview = (document: any) => {
    setPreviewDocument(document);
    setPreviewOpen(true);
  };

    return (
    <div className="w-full">
      <Tabs defaultValue="info" className="w-full">
        {/* Tab Navigation - Glassmorphic Segmented Control */}
        <div className="relative">
          <TabsList className="relative z-10 inline-flex h-auto items-center gap-1 p-1 sm:p-1.5 rounded-full bg-foreground/[0.045] mb-0 overflow-x-auto max-w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              { value: 'info', label: 'Formularangaben' },
              { value: 'documents', label: 'Dokumente' },
              { value: 'tax-returns', label: 'Steuererklärung' },
              { value: 'definitive-bills', label: 'Definitive Rechnungen' },
              { value: 'messages', label: 'Nachrichten' },
              { value: 'admin-notes', label: 'Admin-Notizen' },
            ].map(({ value, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="shrink-0 px-4 sm:px-6 h-9 sm:h-11 rounded-full text-sm sm:text-base transition-all duration-200 active:scale-[0.97] text-muted-foreground/65 font-medium hover:text-foreground/85 data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:shadow-[0_1px_2px_rgba(15,27,61,0.06),0_4px_10px_-3px_rgba(15,27,61,0.1)]"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          
          {/* Content Container */}
          <div className="relative mt-4">
            <div>
              <TabsContent value="info" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            {getYearDataStatus.hasFormData ? (
              <FormDataTableView 
                formData={formDataForSelectedYear} 
                documents={documentsForSelectedYear} 
                selectedYear={selectedYear} 
                userId={userId} 
                userName={`${user.firstName} ${user.lastName}`} 
                isAdmin={true} 
              />
            ) : (
              <div className="bg-card border border-border rounded-2xl py-12">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                    <FileText className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
                  </div>
                  <p className="text-foreground font-medium text-sm">Keine Formulardaten für {selectedYear}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Der Mandant hat noch keine Angaben gemacht
                  </p>
                </div>
              </div>
            )}
              </TabsContent>

              <TabsContent value="documents" className="mt-0 focus-visible:outline-none focus-visible:ring-0 space-y-4">
            <PriorYearReturnCard taxFilerId={selectedTaxFilerId} taxYear={selectedYear} />
            <div className="bg-card border border-border rounded-2xl p-5 sm:p-6">
              <div className="mb-5">
                <h2 className="text-sm font-semibold text-foreground">Hochgeladene Dokumente</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Vom Mandanten eingereichte Unterlagen für {selectedYear}
                </p>
              </div>
              <div>
                {documentsForSelectedYear.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                      <FolderOpen className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <p className="text-sm font-medium text-foreground">Keine Dokumente hochgeladen</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Für das Steuerjahr {selectedYear} wurden noch keine Unterlagen eingereicht
                    </p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Einkommen */}
                    {groupedDocuments.income.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <Briefcase className="h-3.5 w-3.5 text-primary" strokeWidth={1.8} />
                          </div>
                          <h3 className="text-sm font-semibold text-foreground">Einkommen</h3>
                          <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">{groupedDocuments.income.length}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {groupedDocuments.income.map(doc => (
                            <DocumentCard 
                              key={doc.id} 
                              document={doc} 
                              onPreview={handleDocumentPreview} userId={userId} isAdmin={true} 
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Vermögen */}
                    {groupedDocuments.assets.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <Wallet className="h-3.5 w-3.5 text-primary" strokeWidth={1.8} />
                          </div>
                          <h3 className="text-sm font-semibold text-foreground">Vermögen</h3>
                          <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">{groupedDocuments.assets.length}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {groupedDocuments.assets.map(doc => (
                            <DocumentCard 
                              key={doc.id} 
                              document={doc} 
                              onPreview={handleDocumentPreview} userId={userId} isAdmin={true} 
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Abzüge */}
                    {groupedDocuments.deductions.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <Receipt className="h-3.5 w-3.5 text-primary" strokeWidth={1.8} />
                          </div>
                          <h3 className="text-sm font-semibold text-foreground">Abzüge</h3>
                          <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">{groupedDocuments.deductions.length}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {groupedDocuments.deductions.map(doc => (
                            <DocumentCard 
                              key={doc.id} 
                              document={doc} 
                              onPreview={handleDocumentPreview} userId={userId} isAdmin={true} 
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Allgemein */}
                    {groupedDocuments.general.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-muted/30 flex items-center justify-center">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.8} />
                          </div>
                          <h3 className="text-sm font-semibold text-foreground">Allgemein</h3>
                          <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">{groupedDocuments.general.length}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {groupedDocuments.general.map(doc => (
                            <DocumentCard 
                              key={doc.id} 
                              document={doc} 
                              onPreview={handleDocumentPreview} userId={userId} isAdmin={true} 
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Nicht zugewiesen */}
                    {groupedDocuments.unassigned.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-muted/20 flex items-center justify-center">
                            <Upload className="h-3.5 w-3.5 text-muted-foreground/60" strokeWidth={1.8} />
                          </div>
                          <h3 className="text-sm font-semibold text-muted-foreground">Nicht zugewiesen</h3>
                          <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">{groupedDocuments.unassigned.length}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {groupedDocuments.unassigned.map(doc => (
                            <DocumentCard 
                              key={doc.id} 
                              document={doc} 
                              onPreview={handleDocumentPreview} userId={userId} isAdmin={true} 
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
              </TabsContent>

              <TabsContent value="tax-returns" className="mt-0 focus-visible:outline-none focus-visible:ring-0 space-y-6">
            {/* Year Selector — segmented pill matching main app */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="inline-flex items-center gap-1 p-1 rounded-full bg-foreground/[0.045] overflow-x-auto max-w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {availableYears.slice(0, 6).map(year => {
                  const active = String(selectedYear) === String(year);
                  return (
                    <button
                      key={year}
                      onClick={() => handleYearChange(year)}
                      className={`shrink-0 px-4 h-8 rounded-full text-xs font-medium tabular-nums transition-all duration-200 active:scale-[0.97] ${
                        active
                          ? 'bg-gradient-to-b from-[#1E3A5F] to-[#0F1B3D] text-white font-semibold shadow-[0_1px_2px_rgba(15,27,61,0.15)]'
                          : 'text-muted-foreground/70 hover:text-foreground/85'
                      }`}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
              {(getYearDataStatus.hasTaxReturn || getYearDataStatus.hasCompletedReturn) && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Daten verfügbar
                </span>
              )}
            </div>


            {/* In Processing Section - filtered by year AND tax_filer_id */}
            {taxReturns.filter(taxReturn => {
              const yearMatch = String(taxReturn.taxYear) === String(selectedYear);
              const filerMatch = !selectedTaxFilerId || (taxReturn as any).tax_filer_id === selectedTaxFilerId;
              return yearMatch && filerMatch;
            }).length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">In Bearbeitung</h3>
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">
                    {taxReturns.filter(taxReturn => {
                      const yearMatch = String(taxReturn.taxYear) === String(selectedYear);
                      const filerMatch = !selectedTaxFilerId || (taxReturn as any).tax_filer_id === selectedTaxFilerId;
                      return yearMatch && filerMatch;
                    }).length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {taxReturns.filter(taxReturn => {
                    const yearMatch = String(taxReturn.taxYear) === String(selectedYear);
                    const filerMatch = !selectedTaxFilerId || (taxReturn as any).tax_filer_id === selectedTaxFilerId;
                    return yearMatch && filerMatch;
                  }).map(taxReturn => (
                    <div 
                      key={taxReturn.id} 
                      className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border hover:border-foreground/20 hover:shadow-[0_4px_16px_-4px_rgba(15,27,61,0.08)] transition-all cursor-pointer" 
                      onClick={() => onTaxReturnClick(taxReturn)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-primary" strokeWidth={1.5} />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-foreground">Steuererklärung {taxReturn.taxYear}</h4>
                          <p className="text-xs text-muted-foreground">Status: {taxReturn.status}</p>
                        </div>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${
                        taxReturn.status === 'success' ? 'bg-emerald-500' : 
                        taxReturn.status === 'processing' ? 'bg-amber-500' : 'bg-muted-foreground/30'
                      }`} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed Returns Section - filtered by year AND tax_filer_id */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">Fertige Steuererklärungen</h3>
                <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">
                  {completedTaxReturns.filter(ctr => {
                    const yearMatch = String(ctr.tax_year) === String(selectedYear);
                    const filerMatch = !selectedTaxFilerId || ctr.tax_filer_id === selectedTaxFilerId;
                    return yearMatch && filerMatch;
                  }).length}
                </span>
              </div>
              <CompletedTaxReturnManager 
                userId={userId} 
                userName={`${user.firstName} ${user.lastName}`} 
                completedTaxReturns={completedTaxReturns.filter(ctr => {
                  const yearMatch = String(ctr.tax_year) === String(selectedYear);
                  const filerMatch = !selectedTaxFilerId || ctr.tax_filer_id === selectedTaxFilerId;
                  return yearMatch && filerMatch;
                })} 
                onRefresh={onCompletedTaxReturnsRefresh}
                selectedTaxFilerId={selectedTaxFilerId}
              />
            </div>
              </TabsContent>
          
              <TabsContent value="definitive-bills" className="mt-0 focus-visible:outline-none focus-visible:ring-0 space-y-6">
                <UserDefinitiveTaxBill 
                  userId={userId} 
                  isAdmin={true} 
                  selectedTaxFilerId={selectedTaxFilerId}
                  selectedYear={selectedYear}
                />
              </TabsContent>
          
              <TabsContent value="messages" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(15,27,61,0.03)]">
                  <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-border">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-foreground/[0.045] border border-border flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="h-4 w-4 text-foreground/70" strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-[14px] font-semibold text-foreground tracking-[-0.008em] truncate">
                          Nachrichten mit {user.firstName} {user.lastName}
                        </h2>
                        <p className="text-[11.5px] text-muted-foreground mt-0.5">
                          Direkter Chat mit dem Benutzer
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="h-[600px] bg-background">
                    <SimpleChatWindow selectedUserId={userId} isAdmin={true} fullWidth={true} />
                  </div>
                </div>
              </TabsContent>


              <TabsContent value="admin-notes" className="mt-0 focus-visible:outline-none focus-visible:ring-0 space-y-6">
                <AdminNotesCard userId={userId} initialNotes={initialNotes} taxFilerId={selectedTaxFilerId} />
              </TabsContent>
            </div>
          </div>
        </div>
      </Tabs>

      <ErrorBoundary
        fallback={
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto bg-card border border-border rounded-2xl p-6 max-w-md shadow-lg">
              <p className="text-sm font-medium text-foreground mb-2">Vorschau konnte nicht geladen werden</p>
              <p className="text-xs text-muted-foreground mb-4">Bitte versuche es erneut oder lade das Dokument herunter.</p>
              <button
                onClick={() => { setPreviewOpen(false); setPreviewDocument(null); }}
                className="text-xs font-medium text-primary hover:underline"
              >
                Schliessen
              </button>
            </div>
          </div>
        }
      >
        <DocumentPreview
          document={previewDocument}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          userId={userId}
          isAdmin={true}
        />
      </ErrorBoundary>
    </div>
  );
};

export default UserTabs;
