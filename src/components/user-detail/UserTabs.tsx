import React, { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, FileIcon, Briefcase, Wallet, Receipt, Upload, FolderOpen } from 'lucide-react';
import { User, TaxReturn } from '@/types';
import { defaultFormData } from '@/contexts/form/defaults';
import FormDataTableView from './FormDataTableView';
import SimpleChatWindow from '@/components/chat/SimpleChatWindow';
import AdminNotesCard from './AdminNotesCard';
import DocumentsPdfDownloader from './DocumentsPdfDownloader';
import DocumentCard from './DocumentCard';
import FormDataPdfDownloader from './FormDataPdfDownloader';
import DocumentPreview from './DocumentPreview';
import CompletedTaxReturnManager from './CompletedTaxReturnManager';
import { UserDefinitiveTaxBill } from './UserDefinitiveTaxBill';

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

    // Always include current year and surrounding years for admin convenience
    const currentYear = new Date().getFullYear();
    // Include 3 years back and 2 years forward to ensure 2024 is always visible
    for (let i = -3; i <= 2; i++) {
      years.add(String(currentYear + i));
    }
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [taxReturns, allFormData, completedTaxReturns]);

  // Transform and filter form data for selected year
  const formDataForSelectedYear = useMemo(() => {
    // Filter form data by selected year first
    const yearFilteredData = allFormData.filter(item => {
      return String(item.tax_year) === String(selectedYear);
    });

    // Transform array into structured FormData object
    const transformedData = {
      ...defaultFormData
    };
    yearFilteredData.forEach(item => {
      if (item.form_type && item.data) {
        transformedData[item.form_type as keyof typeof transformedData] = {
          ...transformedData[item.form_type as keyof typeof transformedData],
          ...item.data
        };
      }
    });
    return transformedData;
  }, [allFormData, selectedYear]);

  // Filter documents by selected year
  const documentsForSelectedYear = useMemo(() => {
    if (!user.documents) return [];

    // Filter documents by tax_year if available, otherwise show all
    return user.documents.filter(doc => {
      // If document has tax_year property, filter by it
      if ((doc as any).tax_year) {
        return String((doc as any).tax_year) === String(selectedYear);
      }
      // For documents without tax_year, show them for current year for now
      return true;
    });
  }, [user.documents, selectedYear]);

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
        {/* Tab Navigation - Segment Style */}
        <div className="relative">
          <TabsList className="relative z-10 h-11 w-auto p-1 bg-muted/40 border border-border/50 rounded-t-xl rounded-b-none">
            <TabsTrigger 
              value="info" 
              className="relative data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-b-background data-[state=inactive]:text-muted-foreground px-5 py-2 rounded-lg rounded-b-none text-sm font-medium transition-all"
            >
              Formularangaben
            </TabsTrigger>
            <TabsTrigger 
              value="documents" 
              className="relative data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=inactive]:text-muted-foreground px-5 py-2 rounded-lg rounded-b-none text-sm font-medium transition-all"
            >
              Dokumente
            </TabsTrigger>
            <TabsTrigger 
              value="tax-returns" 
              className="relative data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=inactive]:text-muted-foreground px-5 py-2 rounded-lg rounded-b-none text-sm font-medium transition-all"
            >
              Steuererklärung
            </TabsTrigger>
            <TabsTrigger 
              value="definitive-bills" 
              className="relative data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=inactive]:text-muted-foreground px-5 py-2 rounded-lg rounded-b-none text-sm font-medium transition-all"
            >
              Definitive Rechnungen
            </TabsTrigger>
            <TabsTrigger 
              value="messages" 
              className="relative data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=inactive]:text-muted-foreground px-5 py-2 rounded-lg rounded-b-none text-sm font-medium transition-all"
            >
              Nachrichten
            </TabsTrigger>
            <TabsTrigger 
              value="admin-notes" 
              className="relative data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=inactive]:text-muted-foreground px-5 py-2 rounded-lg rounded-b-none text-sm font-medium transition-all"
            >
              Admin-Notizen
            </TabsTrigger>
          </TabsList>
          
          {/* Content Container - Connected to Tabs */}
          <div className="relative -mt-px bg-background border border-border/50 border-t-0 rounded-b-xl rounded-tr-xl shadow-sm">
            <div className="p-5">
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
              <Card className="border-border/30 shadow-sm">
                <CardContent className="py-10">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                      <FileIcon className="h-6 w-6 text-muted-foreground/60" />
                    </div>
                    <p className="text-muted-foreground font-medium text-sm">Keine Formulardaten für {selectedYear}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Der Mandant hat noch keine Angaben gemacht
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
              </TabsContent>

              <TabsContent value="documents" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <Card className="border-border/30 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Hochgeladene Dokumente</CardTitle>
                <CardDescription className="text-xs">
                  Vom Mandanten eingereichte Unterlagen für {selectedYear}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {documentsForSelectedYear.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 rounded-xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                      <FolderOpen className="h-7 w-7 text-muted-foreground/60" />
                    </div>
                    <p className="text-muted-foreground font-medium">Keine Dokumente hochgeladen</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      Für das Steuerjahr {selectedYear} wurden noch keine Unterlagen eingereicht
                    </p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Einkommen */}
                    {groupedDocuments.income.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-5 w-5 text-primary" />
                          <h3 className="text-lg font-semibold">Einkommen</h3>
                          <Badge variant="outline">{groupedDocuments.income.length}</Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {groupedDocuments.income.map(doc => (
                            <DocumentCard 
                              key={doc.id} 
                              document={doc} 
                              onPreview={handleDocumentPreview} 
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Vermögen */}
                    {groupedDocuments.assets.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-5 w-5 text-primary" />
                          <h3 className="text-lg font-semibold">Vermögen</h3>
                          <Badge variant="outline">{groupedDocuments.assets.length}</Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {groupedDocuments.assets.map(doc => (
                            <DocumentCard 
                              key={doc.id} 
                              document={doc} 
                              onPreview={handleDocumentPreview} 
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Abzüge */}
                    {groupedDocuments.deductions.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Receipt className="h-5 w-5 text-primary" />
                          <h3 className="text-lg font-semibold">Abzüge</h3>
                          <Badge variant="outline">{groupedDocuments.deductions.length}</Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {groupedDocuments.deductions.map(doc => (
                            <DocumentCard 
                              key={doc.id} 
                              document={doc} 
                              onPreview={handleDocumentPreview} 
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Allgemein */}
                    {groupedDocuments.general.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <FileIcon className="h-5 w-5 text-primary" />
                          <h3 className="text-lg font-semibold">Allgemein</h3>
                          <Badge variant="outline">{groupedDocuments.general.length}</Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {groupedDocuments.general.map(doc => (
                            <DocumentCard 
                              key={doc.id} 
                              document={doc} 
                              onPreview={handleDocumentPreview} 
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Nicht zugewiesen */}
                    {groupedDocuments.unassigned.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Upload className="h-5 w-5 text-muted-foreground" />
                          <h3 className="text-lg font-semibold text-muted-foreground">Nicht zugewiesen</h3>
                          <Badge variant="secondary">{groupedDocuments.unassigned.length}</Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {groupedDocuments.unassigned.map(doc => (
                            <DocumentCard 
                              key={doc.id} 
                              document={doc} 
                              onPreview={handleDocumentPreview} 
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
              </TabsContent>

              <TabsContent value="tax-returns" className="mt-0 focus-visible:outline-none focus-visible:ring-0 space-y-6">
            {/* Year Selector */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-50 rounded-full px-4 py-2 border border-slate-200">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <Select value={selectedYear} onValueChange={handleYearChange}>
                    <SelectTrigger className="border-0 bg-transparent p-0 h-auto w-auto min-w-[60px] focus:ring-0 shadow-none">
                      <SelectValue placeholder="Jahr" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {availableYears.map(year => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(getYearDataStatus.hasTaxReturn || getYearDataStatus.hasCompletedReturn) && (
                  <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    Daten verfügbar
                  </span>
                )}
              </div>
            </div>

            {/* In Processing Section */}
            {taxReturns.filter(taxReturn => String(taxReturn.taxYear) === String(selectedYear)).length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-slate-900">In Bearbeitung</h3>
                  <span className="flex items-center justify-center h-6 min-w-6 px-2 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                    {taxReturns.filter(taxReturn => String(taxReturn.taxYear) === String(selectedYear)).length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {taxReturns.filter(taxReturn => String(taxReturn.taxYear) === String(selectedYear)).map(taxReturn => (
                    <div 
                      key={taxReturn.id} 
                      className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer" 
                      onClick={() => onTaxReturnClick(taxReturn)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center border border-amber-200/50">
                          <FileIcon className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">Steuererklärung {taxReturn.taxYear}</h4>
                          <p className="text-sm text-slate-500">Status: {taxReturn.status}</p>
                        </div>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${
                        taxReturn.status === 'success' ? 'bg-emerald-500' : 
                        taxReturn.status === 'processing' ? 'bg-amber-500' : 'bg-slate-300'
                      }`} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed Returns Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-slate-900">Fertige Steuererklärungen</h3>
                <span className="flex items-center justify-center h-6 min-w-6 px-2 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                  {completedTaxReturns.filter(ctr => String(ctr.tax_year) === String(selectedYear)).length}
                </span>
              </div>
              <CompletedTaxReturnManager 
                userId={userId} 
                userName={`${user.firstName} ${user.lastName}`} 
                completedTaxReturns={completedTaxReturns.filter(ctr => String(ctr.tax_year) === String(selectedYear))} 
                onRefresh={onCompletedTaxReturnsRefresh} 
              />
            </div>

            {/* Empty State */}
            {!getYearDataStatus.hasTaxReturn && !getYearDataStatus.hasCompletedReturn && completedTaxReturns.filter(ctr => String(ctr.tax_year) === String(selectedYear)).length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <FileIcon className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-slate-500 font-medium">Keine Steuererklärung für {selectedYear}</p>
                <p className="text-slate-400 text-sm mt-1">Laden Sie eine fertige Steuererklärung hoch</p>
              </div>
            )}
              </TabsContent>
          
              <TabsContent value="definitive-bills" className="mt-0 focus-visible:outline-none focus-visible:ring-0 space-y-6">
                <UserDefinitiveTaxBill userId={userId} isAdmin={true} />
              </TabsContent>
          
              <TabsContent value="messages" className="mt-0 focus-visible:outline-none focus-visible:ring-0 space-y-6">
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-xl">
                      Nachrichten mit {user.firstName} {user.lastName}
                    </CardTitle>
                    <CardDescription>
                      Direkter Chat mit dem Benutzer
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="h-[600px] rounded-lg overflow-hidden">
                      <SimpleChatWindow selectedUserId={userId} isAdmin={true} fullWidth={true} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="admin-notes" className="mt-0 focus-visible:outline-none focus-visible:ring-0 space-y-6">
                <AdminNotesCard userId={userId} initialNotes={initialNotes} />
              </TabsContent>
            </div>
          </div>
        </div>
      </Tabs>

      <DocumentPreview 
        document={previewDocument} 
        open={previewOpen} 
        onOpenChange={setPreviewOpen} 
        userId={userId} 
        isAdmin={true} 
      />
    </div>
  );
};

export default UserTabs;
