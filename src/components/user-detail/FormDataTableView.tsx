import React, { useState } from 'react';
import { FormData, UploadedDocument } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Briefcase, 
  Wallet, 
  Receipt, 
  Copy, 
  Check, 
  Eye, 
  FileIcon,
  Heart,
  Baby,
  Building2,
  Car,
  Home,
  CreditCard,
  PiggyBank,
  GraduationCap,
  HandHeart,
  Wrench
} from 'lucide-react';
import { toast } from 'sonner';
import DocumentPreview from './DocumentPreview';
import FormDataPdfDownloader from './FormDataPdfDownloader';

interface FormDataTableViewProps {
  formData: FormData;
  documents: UploadedDocument[];
  selectedYear: string;
  userId: string;
  userName: string;
  isAdmin?: boolean;
}

// Helper to render copy button
const CopyButton = ({ text, fieldId, copiedFields, onCopy }: { 
  text: string; 
  fieldId: string; 
  copiedFields: Set<string>; 
  onCopy: (text: string, fieldId: string) => void;
}) => (
  <Button
    variant="ghost"
    size="sm"
    onClick={() => onCopy(text, fieldId)}
    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
  >
    {copiedFields.has(fieldId) ? (
      <Check className="h-3 w-3 text-green-500" />
    ) : (
      <Copy className="h-3 w-3 text-muted-foreground" />
    )}
  </Button>
);

const FormDataTableView: React.FC<FormDataTableViewProps> = ({
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
      toast.success('Kopiert');
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

  // Label mappings
  const getValueLabel = (key: string, value: any): string => {
    if (typeof value === 'boolean') return value ? 'Ja' : 'Nein';
    if (key === 'maritalStatus') {
      const map: Record<string, string> = { 'ledig': 'Ledig', 'verheiratet': 'Verheiratet', 'verwitwet': 'Verwitwet' };
      return map[value] || value;
    }
    if (key === 'religion' || key === 'spouseReligion') {
      const map: Record<string, string> = { 'römisch-katholisch': 'Röm.-kath.', 'reformiert': 'Reformiert', 'christkatolisch': 'Christkath.', 'andere/keine': 'Andere/Keine' };
      return map[value] || value;
    }
    if (key === 'kanton') {
      const map: Record<string, string> = { 'ZH': 'Zürich', 'AG': 'Aargau', 'ZG': 'Zug', 'SZ': 'Schwyz' };
      return map[value] || value;
    }
    if (key === 'deduction') {
      const map: Record<string, string> = { 
        'higher-income-father': 'Vater erzielt höheres Einkommen', 
        'higher-income-mother': 'Mutter erzielt höheres Einkommen', 
        'child-self-sufficient': 'Kind ist selbstständig erwerbstätig',
        'child-different-household': 'Kind lebt in anderem Haushalt'
      };
      return map[value] || value;
    }
    return String(value);
  };

  const findDocumentsForField = (fieldKey: string): UploadedDocument[] => {
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
      hasChildcare: ['childcare-expenses']
    };
    const checklistIds = fieldToChecklistMap[fieldKey] || [];
    return documents.filter(doc => doc.checklistItemId && checklistIds.includes(doc.checklistItemId));
  };

  const contactInfo = formData.contactInfo;
  const income = formData.income;
  const assets = formData.assets;
  const deductions = formData.deductions;

  // Bank statement documents
  const bankStatementDocs = documents.filter(doc => 
    doc.checklistItemId && (
      doc.checklistItemId.includes('bank-statement') || 
      doc.checklistItemId.includes('interest-statement') || 
      doc.checklistItemId.includes('bank-account-statement')
    )
  );

  return (
    <>
      <div className="space-y-6">
        {/* Section 1: Persönliche Daten - Two Column Layout */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Persönliche Daten</CardTitle>
                  <p className="text-sm text-muted-foreground">Kontakt- und Stammdaten</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{selectedYear}</Badge>
                <FormDataPdfDownloader userId={userId} taxYear={selectedYear} userName={userName} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {contactInfo ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Personalien
                  </h4>
                  <Table>
                    <TableBody>
                      <TableRow className="group hover:bg-muted/50">
                        <TableCell className="font-medium text-muted-foreground w-40">Name</TableCell>
                        <TableCell className="font-semibold">
                          {contactInfo.firstName} {contactInfo.lastName}
                          <CopyButton text={`${contactInfo.firstName} ${contactInfo.lastName}`} fieldId="name" copiedFields={copiedFields} onCopy={handleCopy} />
                        </TableCell>
                      </TableRow>
                      <TableRow className="group hover:bg-muted/50">
                        <TableCell className="font-medium text-muted-foreground">Geburtsdatum</TableCell>
                        <TableCell>
                          {contactInfo.birthDate ? new Date(contactInfo.birthDate).toLocaleDateString('de-CH') : '-'}
                          <CopyButton text={contactInfo.birthDate ? new Date(contactInfo.birthDate).toLocaleDateString('de-CH') : ''} fieldId="birthDate" copiedFields={copiedFields} onCopy={handleCopy} />
                        </TableCell>
                      </TableRow>
                      <TableRow className="group hover:bg-muted/50">
                        <TableCell className="font-medium text-muted-foreground">Zivilstand</TableCell>
                        <TableCell>{getValueLabel('maritalStatus', contactInfo.maritalStatus)}</TableCell>
                      </TableRow>
                      <TableRow className="group hover:bg-muted/50">
                        <TableCell className="font-medium text-muted-foreground">Konfession</TableCell>
                        <TableCell>{getValueLabel('religion', contactInfo.religion)}</TableCell>
                      </TableRow>
                      {contactInfo.adressnummer && (
                        <TableRow className="group hover:bg-muted/50 bg-primary/5">
                          <TableCell className="font-medium text-muted-foreground">Adressnummer</TableCell>
                          <TableCell className="font-bold text-primary">
                            {contactInfo.adressnummer}
                            <CopyButton text={contactInfo.adressnummer} fieldId="adressnummer" copiedFields={copiedFields} onCopy={handleCopy} />
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Kontakt & Adresse
                  </h4>
                  <Table>
                    <TableBody>
                      <TableRow className="group hover:bg-muted/50">
                        <TableCell className="font-medium text-muted-foreground w-40">Adresse</TableCell>
                        <TableCell>
                          {contactInfo.address || '-'}
                          <CopyButton text={contactInfo.address || ''} fieldId="address" copiedFields={copiedFields} onCopy={handleCopy} />
                        </TableCell>
                      </TableRow>
                      <TableRow className="group hover:bg-muted/50">
                        <TableCell className="font-medium text-muted-foreground">PLZ / Ort</TableCell>
                        <TableCell>
                          {contactInfo.postalCode} {contactInfo.city}
                          <CopyButton text={`${contactInfo.postalCode} ${contactInfo.city}`} fieldId="plzort" copiedFields={copiedFields} onCopy={handleCopy} />
                        </TableCell>
                      </TableRow>
                      <TableRow className="group hover:bg-muted/50">
                        <TableCell className="font-medium text-muted-foreground">Kanton</TableCell>
                        <TableCell>{getValueLabel('kanton', contactInfo.kanton)}</TableCell>
                      </TableRow>
                      <TableRow className="group hover:bg-muted/50">
                        <TableCell className="font-medium text-muted-foreground">Telefon</TableCell>
                        <TableCell>
                          {contactInfo.phone || '-'}
                          <CopyButton text={contactInfo.phone || ''} fieldId="phone" copiedFields={copiedFields} onCopy={handleCopy} />
                        </TableCell>
                      </TableRow>
                      <TableRow className="group hover:bg-muted/50">
                        <TableCell className="font-medium text-muted-foreground">E-Mail</TableCell>
                        <TableCell className="break-all">
                          {contactInfo.email || '-'}
                          <CopyButton text={contactInfo.email || ''} fieldId="email" copiedFields={copiedFields} onCopy={handleCopy} />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Spouse - Full Width */}
                {contactInfo.maritalStatus === 'verheiratet' && (contactInfo.spouseFirstName || contactInfo.spouseLastName) && (
                  <div className="lg:col-span-2 pt-2 border-t">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
                      <Heart className="h-4 w-4" />
                      Ehepartner/in
                    </h4>
                    <div className="grid grid-cols-2 gap-4 bg-muted/30 rounded-lg p-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Name</p>
                        <p className="font-medium">{contactInfo.spouseFirstName} {contactInfo.spouseLastName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Konfession</p>
                        <p className="font-medium">{getValueLabel('spouseReligion', contactInfo.spouseReligion)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Children - Full Width */}
                {contactInfo.hasChildren && contactInfo.children && contactInfo.children.length > 0 && (
                  <div className="lg:col-span-2 pt-2 border-t">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
                      <Baby className="h-4 w-4" />
                      Kinder ({contactInfo.children.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {contactInfo.children.map((child, index) => (
                        <div key={index} className="bg-muted/30 rounded-lg p-4">
                          <p className="font-semibold text-base">{child.firstName} {child.lastName}</p>
                          <div className="mt-2 space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Geburtsdatum:</span>
                              <span>{child.birthDate ? new Date(child.birthDate).toLocaleDateString('de-CH') : '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Konfession:</span>
                              <span>{getValueLabel('religion', child.religion)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Abzug:</span>
                              <span className="text-right">{getValueLabel('deduction', child.deduction) || '-'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Keine persönlichen Daten vorhanden
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Einkommen */}
        {income && Object.keys(income).some(k => income[k as keyof typeof income]) && (
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Einkommen</CardTitle>
                  <p className="text-sm text-muted-foreground">Einkommensquellen und Beschäftigung</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/3">Einkommensart</TableHead>
                    <TableHead className="w-1/6">Status</TableHead>
                    <TableHead>Dokumente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { key: 'hasSalary', label: 'Lohneinkommen', icon: Building2 },
                    { key: 'hasRental', label: 'Mieteinnahmen', icon: Home },
                    { key: 'hasDividends', label: 'Dividenden', icon: PiggyBank },
                    { key: 'hasFreelance', label: 'Selbständigkeit', icon: Briefcase },
                    { key: 'hasPension', label: 'Renten/Pensionen', icon: Wallet },
                    { key: 'hasGiftInheritance', label: 'Schenkungen/Erbschaften', icon: HandHeart },
                    { key: 'hasPensionPayout', label: 'PK-Auszahlung', icon: CreditCard },
                    { key: 'hasOtherIncome', label: 'Andere Einkünfte', icon: Receipt },
                  ].filter(item => income[item.key as keyof typeof income] === true).map(item => {
                    const Icon = item.icon;
                    const docs = findDocumentsForField(item.key);
                    return (
                      <TableRow key={item.key} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            {item.label}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className="bg-green-500/20 text-green-700 hover:bg-green-500/30">
                            Ja
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {docs.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {docs.map(doc => (
                                <Badge 
                                  key={doc.id} 
                                  variant="outline" 
                                  className="cursor-pointer hover:bg-primary/10"
                                  onClick={() => handleDocumentPreview(doc)}
                                >
                                  <FileIcon className="h-3 w-3 mr-1" />
                                  {doc.fileName.length > 20 ? doc.fileName.substring(0, 20) + '...' : doc.fileName}
                                  <Eye className="h-3 w-3 ml-1" />
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Kein Dokument</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Employers */}
              {income.employers && income.employers.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-semibold text-muted-foreground mb-3">Arbeitgeber Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {income.employers.map((employer, index) => (
                      <div key={index} className="bg-muted/30 rounded-lg p-3">
                        <p className="font-medium">{employer.workLocation || `Arbeitgeber ${index + 1}`}</p>
                        <div className="text-sm text-muted-foreground grid grid-cols-2 gap-x-4 mt-1">
                          {employer.workload && <span>Pensum: {employer.workload}%</span>}
                          {employer.workDays && <span>Tage/Woche: {Array.isArray(employer.workDays) ? employer.workDays.length : employer.workDays}</span>}
                          {employer.commute && <span>Arbeitsweg: {employer.commute}</span>}
                          {employer.commuteDistance && <span>Distanz: {employer.commuteDistance} km</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Section 3: Vermögen */}
        {(assets || bankStatementDocs.length > 0) && (
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Vermögen</CardTitle>
                  <p className="text-sm text-muted-foreground">Vermögenswerte und Verbindlichkeiten</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/3">Vermögensart</TableHead>
                    <TableHead className="w-1/6">Status</TableHead>
                    <TableHead>Dokumente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Bank Statement - Always show */}
                  <TableRow className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        Zins- und Saldobescheinigung
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={bankStatementDocs.length > 0 ? 'default' : 'secondary'} className={bankStatementDocs.length > 0 ? 'bg-green-500/20 text-green-700' : ''}>
                        {bankStatementDocs.length > 0 ? 'Ja' : 'Ausstehend'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {bankStatementDocs.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {bankStatementDocs.map(doc => (
                            <Badge 
                              key={doc.id} 
                              variant="outline" 
                              className="cursor-pointer hover:bg-primary/10"
                              onClick={() => handleDocumentPreview(doc)}
                            >
                              <FileIcon className="h-3 w-3 mr-1" />
                              {doc.fileName.length > 20 ? doc.fileName.substring(0, 20) + '...' : doc.fileName}
                              <Eye className="h-3 w-3 ml-1" />
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Kein Dokument</span>
                      )}
                    </TableCell>
                  </TableRow>

                  {assets && [
                    { key: 'hasDepositAccount', label: 'Bankkonten', icon: Building2 },
                    { key: 'hasVehicle', label: 'Fahrzeuge', icon: Car },
                    { key: 'hasProperty', label: 'Liegenschaften', icon: Home },
                    { key: 'hasMortgage', label: 'Hypotheken', icon: CreditCard },
                    { key: 'hasDebt', label: 'Schulden', icon: CreditCard },
                    { key: 'hasCrypto', label: 'Kryptowährungen', icon: Wallet },
                    { key: 'hasOtherAssets', label: 'Andere Vermögenswerte', icon: Wallet },
                  ].filter(item => assets[item.key as keyof typeof assets] === true).map(item => {
                    const Icon = item.icon;
                    const docs = findDocumentsForField(item.key);
                    return (
                      <TableRow key={item.key} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            {item.label}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className="bg-green-500/20 text-green-700 hover:bg-green-500/30">
                            Ja
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {docs.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {docs.map(doc => (
                                <Badge 
                                  key={doc.id} 
                                  variant="outline" 
                                  className="cursor-pointer hover:bg-primary/10"
                                  onClick={() => handleDocumentPreview(doc)}
                                >
                                  <FileIcon className="h-3 w-3 mr-1" />
                                  {doc.fileName.length > 20 ? doc.fileName.substring(0, 20) + '...' : doc.fileName}
                                  <Eye className="h-3 w-3 ml-1" />
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Kein Dokument</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Vehicles */}
              {assets?.vehicles && assets.vehicles.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-semibold text-muted-foreground mb-3">Fahrzeuge Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {assets.vehicles.map((vehicle, index) => (
                      <div key={index} className="bg-muted/30 rounded-lg p-3">
                        <p className="font-medium">{vehicle.name || `Fahrzeug ${index + 1}`}</p>
                        <p className="text-sm text-muted-foreground">
                          {vehicle.purchaseYear && `Jahr: ${vehicle.purchaseYear}`}
                          {vehicle.purchasePrice && ` • CHF ${vehicle.purchasePrice.toLocaleString()}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Properties */}
              {assets?.properties && assets.properties.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-semibold text-muted-foreground mb-3">Liegenschaften Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {assets.properties.map((property, index) => (
                      <div key={index} className="bg-muted/30 rounded-lg p-3">
                        <p className="font-medium">{property.address || `Liegenschaft ${index + 1}`}</p>
                        <p className="text-sm text-muted-foreground">
                          {property.taxValue && `Steuerwert: CHF ${property.taxValue.toLocaleString()}`}
                          {property.rentalValue && ` • Eigenmietwert: CHF ${property.rentalValue.toLocaleString()}`}
                          {property.type && ` • ${property.type}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Section 4: Abzüge */}
        {deductions && Object.keys(deductions).some(k => deductions[k as keyof typeof deductions]) && (
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Abzüge</CardTitle>
                  <p className="text-sm text-muted-foreground">Steuerliche Abzugsmöglichkeiten</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/3">Abzugsart</TableHead>
                    <TableHead className="w-1/6">Status</TableHead>
                    <TableHead>Dokumente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { key: 'hasPillar3a', label: 'Säule 3a', icon: PiggyBank },
                    { key: 'hasBVGPurchase', label: 'BVG-Einkauf', icon: CreditCard },
                    { key: 'hasWorkRelatedExpenses', label: 'Berufskosten', icon: Briefcase },
                    { key: 'hasEducationExpenses', label: 'Ausbildungskosten', icon: GraduationCap },
                    { key: 'hasDonations', label: 'Spenden', icon: HandHeart },
                    { key: 'hasPropertyMaintenance', label: 'Liegenschaftsunterhalt', icon: Wrench },
                    { key: 'hasChildcare', label: 'Kinderbetreuung', icon: Baby },
                    { key: 'hasSupportedPersons', label: 'Unterstützte Personen', icon: Heart },
                    { key: 'hasMaintenancePayments', label: 'Unterhaltszahlungen', icon: CreditCard },
                    { key: 'hasOtherDeductions', label: 'Andere Abzüge', icon: Receipt },
                  ].filter(item => deductions[item.key as keyof typeof deductions] === true).map(item => {
                    const Icon = item.icon;
                    const docs = findDocumentsForField(item.key);
                    return (
                      <TableRow key={item.key} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            {item.label}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className="bg-green-500/20 text-green-700 hover:bg-green-500/30">
                            Ja
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {docs.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {docs.map(doc => (
                                <Badge 
                                  key={doc.id} 
                                  variant="outline" 
                                  className="cursor-pointer hover:bg-primary/10"
                                  onClick={() => handleDocumentPreview(doc)}
                                >
                                  <FileIcon className="h-3 w-3 mr-1" />
                                  {doc.fileName.length > 20 ? doc.fileName.substring(0, 20) + '...' : doc.fileName}
                                  <Eye className="h-3 w-3 ml-1" />
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Kein Dokument</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Supported Persons */}
              {deductions.supportedPersons && (deductions.supportedPersons as any[]).length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-semibold text-muted-foreground mb-3">Unterstützte Personen</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(deductions.supportedPersons as any[]).map((person, index) => (
                      <div key={index} className="bg-muted/30 rounded-lg p-3">
                        <p className="font-medium">{person.name || `Person ${index + 1}`}</p>
                        <p className="text-sm text-muted-foreground">{person.relationship}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!contactInfo && !income && !assets && !deductions && (
          <Card className="border-border/50 shadow-sm">
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <FileIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Keine Daten für {selectedYear}</p>
                <p className="text-sm mt-1">Wählen Sie ein anderes Jahr oder die Daten wurden noch nicht erfasst.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Document Preview Dialog */}
      <DocumentPreview 
        document={previewDocument} 
        open={previewOpen} 
        onOpenChange={setPreviewOpen} 
        userId={userId} 
        isAdmin={isAdmin} 
      />
    </>
  );
};

export default FormDataTableView;
