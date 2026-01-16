import React, { useState } from 'react';
import { FormData, UploadedDocument } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileIcon, Eye, Copy, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import DocumentPreview from './DocumentPreview';
import FormDataPdfDownloader from './FormDataPdfDownloader';
interface FormDataDisplayProps {
  formData: FormData;
  documents: UploadedDocument[];
  selectedYear: string;
  userId: string;
  userName: string;
  isAdmin?: boolean;
}
const FormDataDisplay: React.FC<FormDataDisplayProps> = ({
  formData,
  documents,
  selectedYear,
  userId,
  userName,
  isAdmin = false
}) => {
  const [previewDocument, setPreviewDocument] = useState<UploadedDocument | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copiedFields, setCopiedFields] = useState<Set<string>>(new Set());
  const handleDocumentPreview = (document: UploadedDocument) => {
    setPreviewDocument(document);
    setPreviewOpen(true);
  };

  const handleCopy = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFields(prev => new Set(prev).add(fieldId));
      toast.success('In die Zwischenablage kopiert');
      setTimeout(() => {
        setCopiedFields(prev => {
          const newSet = new Set(prev);
          newSet.delete(fieldId);
          return newSet;
        });
      }, 2000);
    } catch (err) {
      toast.error('Kopieren fehlgeschlagen');
    }
  };

  // German field mappings
  const getFieldLabel = (key: string): string => {
    const labelMap: Record<string, string> = {
      // Contact Info
      firstName: 'Vorname',
      lastName: 'Nachname',
      email: 'E-Mail',
      phone: 'Telefon',
      address: 'Adresse',
      postalCode: 'PLZ',
      city: 'Ort',
      birthDate: 'Geburtsdatum',
      maritalStatus: 'Zivilstand',
      hasChildren: 'Kinder',
      religion: 'Konfession',
      kanton: 'Kanton',
      firefighterService: 'Feuerwehrdienst',
      spouseFirstName: 'Vorname',
      spouseLastName: 'Nachname',
      spouseReligion: 'Konfession',
      adressnummer: 'Adressnummer',
      // Income
      hasSalary: 'Lohneinkommen',
      hasRental: 'Mieteinnahmen',
      hasDividends: 'Dividenden',
      hasFreelance: 'Selbständigerwerbseinkommen',
      hasPension: 'Renten/Pensionen',
      hasGiftInheritance: 'Schenkungen/Erbschaften',
      hasPensionPayout: 'Pensionskassenauszahlung',
      hasOtherIncome: 'Andere Einkünfte',
      // Employer fields
      workLocation: 'Arbeitsort',
      workload: 'Pensum',
      workDays: 'Arbeitstage',
      commute: 'Arbeitsweg',
      carReason: 'Grund für Autonutzung',
      // Assets
      hasVehicle: 'Fahrzeuge',
      hasProperty: 'Liegenschaften',
      hasMortgage: 'Hypotheken',
      hasDebt: 'Schulden',
      hasDepositAccount: 'Bankkonten',
      hasCrypto: 'Kryptowährungen',
      hasOtherAssets: 'Andere Vermögenswerte',
      // Vehicle fields
      name: 'Bezeichnung',
      purchasePrice: 'Kaufpreis',
      purchaseYear: 'Kaufjahr',
      // Deductions
      hasPillar3a: 'Säule 3a',
      hasBVGPurchase: 'BVG-Einkauf',
      hasEducationExpenses: 'Ausbildungskosten',
      hasDonations: 'Spenden',
      hasPropertyMaintenance: 'Liegenschaftsunterhalt',
      hasOtherDeductions: 'Andere Abzüge',
      hasSupportedPersons: 'Unterstützte Personen',
      hasMaintenancePayments: 'Unterhaltszahlungen',
      hasWorkRelatedExpenses: 'Berufskosten',
      hasChildcare: 'Kinderbetreuung'
    };
    return labelMap[key] || key;
  };
  const getValueLabel = (key: string, value: any): string => {
    if (typeof value === 'boolean') {
      return value ? 'Ja' : 'Nein';
    }
    if (key === 'maritalStatus') {
      const statusMap: Record<string, string> = {
        'ledig': 'Ledig',
        'verheiratet': 'Verheiratet',
        'verwitwet': 'Verwitwet'
      };
      return statusMap[value] || value;
    }
    if (key === 'religion' || key === 'spouseReligion') {
      const religionMap: Record<string, string> = {
        'römisch-katholisch': 'Römisch-katholisch',
        'reformiert': 'Reformiert',
        'christkatolisch': 'Christkatholisch',
        'andere/keine': 'Andere/Keine'
      };
      return religionMap[value] || value;
    }
    if (key === 'kanton') {
      const kantonMap: Record<string, string> = {
        'ZH': 'Zürich',
        'AG': 'Aargau',
        'ZG': 'Zug',
        'SZ': 'Schwyz'
      };
      return kantonMap[value] || value;
    }
    if (Array.isArray(value)) {
      return value.length > 0 ? `${value.length} Einträge` : 'Keine Einträge';
    }
    return String(value);
  };
  const findDocumentsForField = (fieldKey: string): UploadedDocument[] => {
    // Map field keys to checklist item IDs with corrected mappings
    const fieldToChecklistMap: Record<string, string[]> = {
      hasSalary: ['employment-income', 'salary-statement'],
      hasRental: ['rental-income'],
      hasDividends: ['dividend-statement'],
      hasFreelance: ['freelance-income', 'self-employment'],
      hasPension: ['pension-statement'],
      hasVehicle: ['vehicle-documents', 'vehicle-registration'],
      hasProperty: ['property-documents'],
      hasMortgage: ['mortgage-statement'],
      hasDebt: ['debt-statements', 'debt-statement'],
      hasDepositAccount: ['deposit-account', 'bank-statement'],
      hasCrypto: ['crypto-portfolio', 'crypto-statement'],
      hasPillar3a: ['pillar3a-certificate', 'pillar3a-statement'],
      hasBVGPurchase: ['bvg-purchase'],
      hasEducationExpenses: ['education-expenses'],
      hasDonations: ['donation-receipts'],
      hasPropertyMaintenance: ['maintenance-receipts'],
      hasWorkRelatedExpenses: ['work-expenses'],
      hasChildcare: ['childcare-expenses'],
      hasOtherIncome: ['other-income']
    };
    const checklistIds = fieldToChecklistMap[fieldKey] || [];
    const foundDocuments = documents.filter(doc => doc.checklistItemId && checklistIds.includes(doc.checklistItemId));
    return foundDocuments;
  };
  const renderFieldWithDocuments = (key: string, value: any) => {
    // Show all meaningful fields, including false boolean values
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const relatedDocs = findDocumentsForField(key);
    const displayValue = getValueLabel(key, value);
    const fieldId = `${key}-${displayValue}`;
    
    return <div key={key} className="group flex justify-between items-center text-sm py-3 px-4 rounded-lg bg-white/3 border border-white/10 hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground font-medium min-w-0 flex-shrink-0">{getFieldLabel(key)}:</span>
          {relatedDocs.length > 0 && <div className="flex gap-1">
              {relatedDocs.map(doc => <Badge key={doc.id} variant="outline" onClick={() => handleDocumentPreview(doc)} className="text-xs px-2 py-0.5 bg-primary/10 border-primary/20 text-primary cursor-pointer hover:bg-primary/20 transition-colors">
                  <FileIcon className="w-3 h-3 mr-1" />
                  {doc.fileName}
                  <Eye className="w-3 h-3 ml-1" />
                </Badge>)}
            </div>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-foreground font-semibold">{displayValue}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCopy(displayValue, fieldId)}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-white/10"
          >
            {copiedFields.has(fieldId) ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>;
  };

  // Render repeater field details
  const renderRepeaterDetails = (items: any[], title: string) => {
    if (!items || items.length === 0) return null;
    return <div className="mt-3 space-y-2">
        <h4 className="font-medium text-sm text-black">{title}:</h4>
        {items.map((item, index) => <div key={index} className="bg-white/5 rounded-lg p-3 space-y-1 text-xs">
            {Object.entries(item).map(([key, value]) => {
          if (key === 'id' || !value) return null;
          return <div key={key} className="flex justify-between">
                  <span className="text-black">{getFieldLabel(key)}:</span>
                  <span className="text-foreground">{String(value)}</span>
                </div>;
        })}
          </div>)}
      </div>;
  };
  const renderContactInfo = () => {
    if (!formData.contactInfo) return null;
    const {
      contactInfo
    } = formData;
    return <Card className="border-0 shadow-none bg-white/5 backdrop-blur-sm rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
               <CardTitle className="text-foreground text-lg flex items-center gap-2">
                Kontaktinformationen
                <Badge variant="outline" className="text-xs bg-white/10 border-white/20 text-black ">
                  {selectedYear}
                </Badge>
              </CardTitle>
            </div>
            <FormDataPdfDownloader userId={userId} taxYear={selectedYear} userName={userName} />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Name and birth date at the top */}
            <div className="space-y-3">
              <div className="group flex justify-between items-center py-3 px-4 rounded-lg bg-white/3 border border-white/10 hover:bg-white/5 transition-colors">
                <span className="text-muted-foreground font-medium">Benutzername:</span>
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-semibold">{contactInfo.firstName} {contactInfo.lastName}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(`${contactInfo.firstName} ${contactInfo.lastName}`, 'username')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-white/10"
                  >
                    {copiedFields.has('username') ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="group flex justify-between items-center py-3 px-4 rounded-lg bg-white/3 border border-white/10 hover:bg-white/5 transition-colors">
                <span className="text-muted-foreground font-medium">Geburtsdatum:</span>
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-semibold">
                    {contactInfo.birthDate ? new Date(contactInfo.birthDate).toLocaleDateString('de-DE') : 'Nicht verfügbar'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(contactInfo.birthDate ? new Date(contactInfo.birthDate).toLocaleDateString('de-DE') : 'Nicht verfügbar', 'birthdate')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-white/10"
                  >
                    {copiedFields.has('birthdate') ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Address section */}
            <div className="border-t border-white/10 pt-4 mt-4 space-y-3">
              {contactInfo.adressnummer && <div className="group flex justify-between items-center py-3 px-4 rounded-lg bg-white/3 border border-white/10 hover:bg-white/5 transition-colors">
                  <span className="text-muted-foreground font-medium">Adressnummer:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-foreground font-semibold">{contactInfo.adressnummer}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(contactInfo.adressnummer, 'adressnummer')}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-white/10"
                    >
                      {copiedFields.has('adressnummer') ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>}
              <div className="group flex justify-between items-center py-3 px-4 rounded-lg bg-white/3 border border-white/10 hover:bg-white/5 transition-colors">
                <span className="text-muted-foreground font-medium">Adresse:</span>
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-semibold">{contactInfo.address || 'Nicht verfügbar'}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(contactInfo.address || 'Nicht verfügbar', 'address')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-white/10"
                  >
                    {copiedFields.has('address') ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="group flex justify-between items-center py-3 px-4 rounded-lg bg-white/3 border border-white/10 hover:bg-white/5 transition-colors">
                <span className="text-muted-foreground font-medium">PLZ/Ort:</span>
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-semibold">{contactInfo.postalCode} {contactInfo.city}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(`${contactInfo.postalCode} ${contactInfo.city}`, 'plzort')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-white/10"
                  >
                    {copiedFields.has('plzort') ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="group flex justify-between items-center py-3 px-4 rounded-lg bg-white/3 border border-white/10 hover:bg-white/5 transition-colors">
                <span className="text-muted-foreground font-medium">Kanton:</span>
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-semibold">{getValueLabel('kanton', contactInfo.kanton)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(getValueLabel('kanton', contactInfo.kanton), 'kanton')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-white/10"
                  >
                    {copiedFields.has('kanton') ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Contact details */}
            <div className="border-t border-white/10 pt-4 mt-4 space-y-3">
              <div className="group flex justify-between items-center py-3 px-4 rounded-lg bg-white/3 border border-white/10 hover:bg-white/5 transition-colors">
                <span className="text-muted-foreground font-medium">Telefonnummer:</span>
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-semibold">{contactInfo.phone || 'Nicht verfügbar'}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(contactInfo.phone || 'Nicht verfügbar', 'phone')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-white/10"
                  >
                    {copiedFields.has('phone') ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="group flex justify-between items-center py-3 px-4 rounded-lg bg-white/3 border border-white/10 hover:bg-white/5 transition-colors">
                <span className="text-muted-foreground font-medium">E-Mail-Adresse:</span>
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-semibold">{contactInfo.email || 'Nicht verfügbar'}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(contactInfo.email || 'Nicht verfügbar', 'email')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-white/10"
                  >
                    {copiedFields.has('email') ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Personal information */}
            <div className="border-t border-white/10 pt-4 mt-4 space-y-3">
              <div className="group flex justify-between items-center py-3 px-4 rounded-lg bg-white/3 border border-white/10 hover:bg-white/5 transition-colors">
                <span className="text-muted-foreground font-medium">Zivilstand:</span>
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-semibold">{getValueLabel('maritalStatus', contactInfo.maritalStatus)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(getValueLabel('maritalStatus', contactInfo.maritalStatus), 'maritalStatus')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-white/10"
                  >
                    {copiedFields.has('maritalStatus') ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="group flex justify-between items-center py-3 px-4 rounded-lg bg-white/3 border border-white/10 hover:bg-white/5 transition-colors">
                <span className="text-muted-foreground font-medium">Konfession:</span>
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-semibold">{getValueLabel('religion', contactInfo.religion)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(getValueLabel('religion', contactInfo.religion), 'religion')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-white/10"
                  >
                    {copiedFields.has('religion') ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Spouse information */}
            {contactInfo.maritalStatus === 'verheiratet' && (contactInfo.spouseFirstName || contactInfo.spouseLastName) && <div className="border-t border-white/10 pt-3 space-y-2">
                <h4 className="text-foreground/90 font-medium text-sm">Ehepartner</h4>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground w-24">Name:</span>
                  <span className="text-foreground font-medium">{contactInfo.spouseFirstName} {contactInfo.spouseLastName}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground w-24">Konfession:</span>
                  <span className="text-foreground font-medium">{getValueLabel('spouseReligion', contactInfo.spouseReligion)}</span>
                </div>
              </div>}

            {/* Children information */}
            {contactInfo.hasChildren && contactInfo.children && contactInfo.children.length > 0 && <div className="border-t border-white/10 pt-3 space-y-2">
                <h4 className="text-foreground/90 font-medium text-sm">Kinder</h4>
                {contactInfo.children.map((child, index) => <div key={index} className="bg-white/5 rounded-lg p-2 space-y-1 text-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground w-24">Name:</span>
                      <span className="text-foreground font-medium">{child.lastName}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground w-24">Geburtsdatum:</span>
                      <span className="text-foreground font-medium">
                        {child.birthDate ? new Date(child.birthDate).toLocaleDateString('de-DE') : '-'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground w-24">Konfession:</span>
                      <span className="text-foreground font-medium">{getValueLabel('religion', child.religion)}</span>
                    </div>
                  </div>)}
              </div>}
          </div>
        </CardContent>
      </Card>;
  };
  const renderSection = (title: string, data: any, excludeRepeaters: string[] = []) => {
    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    // Show ALL fields with data, not just "true" boolean values
    const relevantFields = Object.entries(data).filter(([key, value]) => {
      // Skip repeater fields that we handle separately
      if (excludeRepeaters.includes(key)) return false;

      // Handle complex boolean fields like { _type: "boolean", value: true }
      if (value && typeof value === 'object' && '_type' in value && value._type === 'boolean') {
        const boolValue = (value as any).value;
        return boolValue === true || boolValue === 'true';
      }

      // Show ALL meaningful data, including true AND false boolean values
      if (typeof value === 'boolean') return true; // Show both true and false
      if (Array.isArray(value)) return false; // We handle arrays separately
      if (typeof value === 'string') return value.trim() !== '';
      if (typeof value === 'number') return value !== 0;
      return value !== null && value !== undefined;
    });
    const repeaterFields = Object.entries(data).filter(([key, value]) => excludeRepeaters.includes(key) && Array.isArray(value) && value.length > 0);
    if (relevantFields.length === 0 && repeaterFields.length === 0) {
      return null;
    }
    return <Card key={title} className="border-0 shadow-none bg-white/5 backdrop-blur-sm rounded-xl">
        <CardHeader className="pb-3">
           <CardTitle className="text-foreground text-lg flex items-center gap-2">
            {title}
            <Badge variant="outline" className="text-xs bg-white/10 border-white/20 text-black ">
              {selectedYear}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {relevantFields.map(([key, value]) => renderFieldWithDocuments(key, value))}
          </div>
          
          {/* Render repeater field details */}
          {repeaterFields.map(([key, value]) => {
          const titles: Record<string, string> = {
            'employers': 'Arbeitgeber',
            'vehicles': 'Fahrzeuge',
            'properties': 'Liegenschaften',
            'debts': 'Schulden',
            'supportedPersons': 'Unterstützte Personen',
            'maintenancePayments': 'Unterhaltszahlungen'
          };
          return renderRepeaterDetails(value as any[], titles[key] || key);
        })}
        </CardContent>
      </Card>;
  };

  // Bank statement documents
  const bankStatementDocs = documents.filter(doc => doc.checklistItemId.includes('bank-statement') || doc.checklistItemId.includes('interest-statement') || doc.checklistItemId.includes('bank-account-statement') || doc.checklistItemId === 'bank-account-statement');

  // Check if we have any data to display
  const hasAnyData = formData.contactInfo || formData.income || formData.deductions || formData.assets || bankStatementDocs.length > 0;
  return <>
      <div className="space-y-4">
        {/* 1. Kontaktinformationen - Custom layout */}
        {renderContactInfo()}
        
        {/* 2. Einkommen */}
        {renderSection('Einkommen', formData.income, ['employers'])}
        
        {/* 3. Abzüge */}
        {renderSection('Abzüge', formData.deductions, ['supportedPersons', 'maintenancePayments'])}
        
        {/* 4. Vermögen (including Zins- und Saldobescheinigung) */}
        {(formData.assets || bankStatementDocs.length > 0) && <Card className="border-0 shadow-none bg-white/5 backdrop-blur-sm rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-foreground text-lg flex items-center gap-2">
                Vermögen
                <Badge variant="outline" className="text-xs bg-white/10 border-white/20 text-black ">
                  {selectedYear}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1">
                {/* Zins- und Saldobescheinigung - Always show in assets */}
                <div className="flex justify-between items-center text-sm py-1.5 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-black font-medium">Zins- und Saldobescheinigung</span>
                    {bankStatementDocs.length > 0 && <div className="flex gap-1">
                        {bankStatementDocs.map(doc => <Badge key={doc.id} variant="outline" onClick={() => handleDocumentPreview(doc)} className="text-xs px-2 py-0.5 bg-white/10 border-white/20 text-black cursor-pointer hover:bg-white/20 transition-colors">
                            <FileIcon className="w-3 h-3 mr-1" />
                            {doc.fileName}
                            <Eye className="w-3 h-3 ml-1" />
                          </Badge>)}
                      </div>}
                  </div>
                  <span className="text-foreground font-medium">
                    {bankStatementDocs.length > 0 ? 'Ja' : 'Noch nicht hochgeladen'}
                  </span>
                </div>
                
                {/* Other asset fields */}
                {formData.assets && Object.entries(formData.assets).filter(([key, value]) => {
              // Skip repeater fields
              if (['vehicles', 'properties', 'debts'].includes(key)) return false;
              if (typeof value === 'boolean') return value === true;
              if (Array.isArray(value)) return value.length > 0;
              if (typeof value === 'string') return value.trim() !== '';
              if (typeof value === 'number') return value !== 0;
              return value !== null && value !== undefined;
            }).map(([key, value]) => renderFieldWithDocuments(key, value))}
              </div>
              
              {/* Asset repeater fields */}
              {formData.assets?.vehicles && formData.assets.vehicles.length > 0 && renderRepeaterDetails(formData.assets.vehicles, "Fahrzeuge")}
              {formData.assets?.properties && formData.assets.properties.length > 0 && renderRepeaterDetails(formData.assets.properties, "Liegenschaften")}
              {formData.assets?.debts && formData.assets.debts.length > 0 && renderRepeaterDetails(formData.assets.debts, "Schulden")}
            </CardContent>
          </Card>}
        
        {/* Show message if no data available for selected year */}
        {!hasAnyData && <Card className="border-0 shadow-none bg-white/5 backdrop-blur-sm rounded-xl">
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">
                <p>Keine Daten für das Jahr {selectedYear} verfügbar</p>
                <p className="text-sm mt-1">Wählen Sie ein anderes Jahr aus oder die Daten wurden noch nicht erfasst.</p>
              </div>
            </CardContent>
          </Card>}
      </div>

      {/* Document Preview Dialog */}
      <DocumentPreview document={previewDocument} open={previewOpen} onOpenChange={setPreviewOpen} userId={userId} isAdmin={isAdmin} />
    </>;
};
export default FormDataDisplay;