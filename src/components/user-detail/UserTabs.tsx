import React, { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileIcon, Calendar, Info, Briefcase, Wallet, Receipt, Upload } from 'lucide-react';
import { User, TaxReturn } from '@/types';
import { defaultFormData } from '@/contexts/form/defaults';
import FormDataTableView from './FormDataTableView';
import SimpleChatWindow from '@/components/chat/SimpleChatWindow';
import AdminNotesCard from './AdminNotesCard';
import DocumentsPdfDownloader from './DocumentsPdfDownloader';
import DocumentCard from './DocumentCard';
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
    <Card className="shadow-sm border-border/50">
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="m-6 mb-6 h-12 w-auto p-1 bg-muted/50">
          <TabsTrigger 
            value="info" 
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-6 py-2"
          >
            Formularangaben
          </TabsTrigger>
          <TabsTrigger 
            value="documents" 
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-6 py-2"
          >
            Dokumente
          </TabsTrigger>
          <TabsTrigger 
            value="tax-returns" 
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-6 py-2"
          >
            Steuererklärung
          </TabsTrigger>
          <TabsTrigger 
            value="definitive-bills" 
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-6 py-2"
          >
            Definitive Rechnungen
          </TabsTrigger>
          <TabsTrigger 
            value="messages" 
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-6 py-2"
          >
            Nachrichten
          </TabsTrigger>
          <TabsTrigger 
            value="admin-notes" 
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-6 py-2"
          >
            Admin-Notizen
          </TabsTrigger>
        </TabsList>
        
        <div className="px-6 pb-6">
          <TabsContent value="info" className="space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl">Ausgefüllte Formularangaben</CardTitle>
                    <CardDescription>
                      Nur relevante Angaben mit "Ja" werden angezeigt
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <Select value={selectedYear} onValueChange={handleYearChange}>
                        <SelectTrigger className="w-36">
                          <SelectValue placeholder="Jahr wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableYears.map(year => {
                            const yearHasData = allFormData.some(fd => String(fd.tax_year) === String(year));
                            return (
                              <SelectItem key={year} value={year}>
                                <div className="flex items-center gap-2">
                                  {year}
                                  {yearHasData && <div className="w-2 h-2 rounded-full bg-green-500" />}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getYearDataStatus.hasFormData ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-sm text-muted-foreground">
                        {getYearDataStatus.hasFormData ? 'Daten vorhanden' : 'Keine Daten'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
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
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                      <FileIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground mb-2">Keine Formulardaten für {selectedYear} vorhanden</p>
                    <p className="text-sm text-muted-foreground">
                      Wählen Sie ein anderes Jahr oder erstellen Sie neue Daten
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl">Hochgeladene Dokumente</CardTitle>
                    <CardDescription>
                      Alle vom Benutzer hochgeladenen Dokumente für {selectedYear}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <Select value={selectedYear} onValueChange={handleYearChange}>
                        <SelectTrigger className="w-36">
                          <SelectValue placeholder="Jahr wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableYears.map(year => (
                            <SelectItem key={year} value={year}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <DocumentsPdfDownloader 
                      userId={userId} 
                      taxYear={selectedYear} 
                      userName={`${user.firstName} ${user.lastName}`} 
                      documentCount={documentsForSelectedYear.length} 
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {documentsForSelectedYear.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                      <FileIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground mb-2">Keine Dokumente für {selectedYear} hochgeladen</p>
                    <p className="text-sm text-muted-foreground">
                      Dokumente werden hier angezeigt, sobald sie hochgeladen wurden
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

          <TabsContent value="tax-returns" className="space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl">Steuererklärung {selectedYear}</CardTitle>
                    <CardDescription>
                      {getYearDataStatus.hasTaxReturn || getYearDataStatus.hasCompletedReturn ? 
                        'Daten verfügbar' : 'Keine Daten vorhanden'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <Select value={selectedYear} onValueChange={handleYearChange}>
                        <SelectTrigger className="w-36">
                          <SelectValue placeholder="Jahr wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableYears.map(year => (
                            <SelectItem key={year} value={year}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* In Processing Section */}
                {taxReturns.filter(taxReturn => String(taxReturn.taxYear) === String(selectedYear)).length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-lg font-semibold">In Bearbeitung</h3>
                      <Badge variant="outline" className="text-xs">
                        {taxReturns.filter(taxReturn => String(taxReturn.taxYear) === String(selectedYear)).length}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm mb-4">
                      Steuererklärungen, die noch bearbeitet werden
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {taxReturns.filter(taxReturn => String(taxReturn.taxYear) === String(selectedYear)).map(taxReturn => (
                        <Card 
                          key={taxReturn.id} 
                          className="cursor-pointer hover:shadow-md transition-all duration-200 border-border/50 hover:border-primary/20" 
                          onClick={() => onTaxReturnClick(taxReturn)}
                        >
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Steuererklärung {taxReturn.taxYear}</CardTitle>
                            <CardDescription>
                              Status: {taxReturn.status}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between">
                              <Badge variant="secondary">
                                {taxReturn.taxYear}
                              </Badge>
                              <div className={`w-2 h-2 rounded-full ${
                                taxReturn.status === 'success' ? 'bg-green-500' : 
                                taxReturn.status === 'processing' ? 'bg-yellow-500' : 'bg-gray-300'
                              }`} />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed Returns Section */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-lg font-semibold">Fertige Steuererklärungen</h3>
                    <Badge variant="outline" className="text-xs">
                      {completedTaxReturns.filter(ctr => String(ctr.tax_year) === String(selectedYear)).length}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4">
                    Vom Admin hochgeladene, fertige Steuererklärungen
                  </p>
                  <CompletedTaxReturnManager 
                    userId={userId} 
                    userName={`${user.firstName} ${user.lastName}`} 
                    completedTaxReturns={completedTaxReturns.filter(ctr => String(ctr.tax_year) === String(selectedYear))} 
                    onRefresh={onCompletedTaxReturnsRefresh} 
                  />
                </div>
                {!getYearDataStatus.hasTaxReturn && !getYearDataStatus.hasCompletedReturn && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                      <FileIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground mb-2">Keine Steuererklärung für {selectedYear} vorhanden</p>
                    <p className="text-sm text-muted-foreground">
                      Erstellen Sie eine neue Steuererklärung oder laden Sie eine fertige hoch
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="definitive-bills" className="space-y-6">
            <UserDefinitiveTaxBill userId={userId} />
          </TabsContent>
          
          <TabsContent value="messages" className="space-y-6">
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

          <TabsContent value="admin-notes" className="space-y-6">
            <AdminNotesCard userId={userId} initialNotes={initialNotes} />
          </TabsContent>
        </div>
      </Tabs>

      <DocumentPreview 
        document={previewDocument} 
        open={previewOpen} 
        onOpenChange={setPreviewOpen} 
        userId={userId} 
        isAdmin={true} 
      />
    </Card>
  );
};

export default UserTabs;
