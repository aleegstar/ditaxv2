import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { FormProvider, useFormContext } from '../contexts';
import { ChecklistItem } from '../types';
import { Sphere } from "@/components/ui/sphere";
import { Button } from "@/components/ui/button";
import { SubpageHeader } from "@/components/ui/subpage-header";
import EnhancedDocumentUploader from '@/components/EnhancedDocumentUploader';
import { ScanLine, CheckCircle2 } from 'lucide-react';
import { LohnausweisOcrSheet } from '@/components/forms/lohnausweis/LohnausweisOcrSheet';
import type { LohnausweisFields } from '@/services/LohnausweisOcrService';
import { toast } from '@/hooks/use-toast';
// Standard document definitions for fallback
const STANDARD_DOCUMENTS: Record<string, Omit<ChecklistItem, 'uploaded'>> = {
  'tax-cover-sheet': {
    id: 'tax-cover-sheet',
    title: 'Deckblatt der Steuererklärung',
    description: 'Das offizielle Deckblatt deiner Steuererklärung vom Steueramt',
    category: 'general',
    required: true
  },
  'employment-income': {
    id: 'employment-income',
    title: 'Lohnausweis',
    description: 'Dein jährlicher Lohnausweis von deinem Arbeitgeber',
    category: 'income',
    required: true
  },
  'rental-income': {
    id: 'rental-income',
    title: 'Mieteinnahmen-Belege',
    description: 'Belege und Aufstellungen über deine Mieteinnahmen',
    category: 'income',
    required: true
  },
  'dividend-statement': {
    id: 'dividend-statement',
    title: 'Dividenden-Bescheinigung',
    description: 'Bescheinigungen über erhaltene Dividenden und Kapitalerträge',
    category: 'income',
    required: true
  },
  'freelance-income': {
    id: 'freelance-income',
    title: 'Selbständigeneinkommen',
    description: 'Belege und Aufstellungen deines selbständigen Einkommens',
    category: 'income',
    required: true
  },
  'pension-statement': {
    id: 'pension-statement',
    title: 'Rentenausweis',
    description: 'Bescheinigung über erhaltene Renten aus Sozialversicherungen',
    category: 'income',
    required: true
  },
  'gift-inheritance': {
    id: 'gift-inheritance',
    title: 'Schenkungen/Erbschaften-Belege',
    description: 'Belege über erhaltene Schenkungen und Erbschaften',
    category: 'income',
    required: true
  },
  'pension-payout': {
    id: 'pension-payout',
    title: 'Pensionskassenauszahlung',
    description: 'Belege über Auszahlungen aus der Pensionskasse',
    category: 'income',
    required: true
  },
  'other-income': {
    id: 'other-income',
    title: 'Weitere Einkommen',
    description: 'Belege für weitere Einkommen (Taggelder, Stipendien, etc.)',
    category: 'income',
    required: true
  },
  'bank-account-statement': {
    id: 'bank-account-statement',
    title: 'Zins- und Saldobescheinigung der Bankkonten',
    description: 'Bescheinigung über Zinserträge und Kontostände aller Bankkonten per Jahresende',
    category: 'assets',
    required: true
  },
  'deposit-account': {
    id: 'deposit-account',
    title: 'Depotauszug',
    description: 'Auszug deines Depotkontos per Jahresende',
    category: 'assets',
    required: true
  },
  'crypto-portfolio': {
    id: 'crypto-portfolio',
    title: 'Kryptowährungsnachweis',
    description: 'Nachweis über Kryptowährungsbestände per Jahresende',
    category: 'assets',
    required: true
  },
  'mortgage-statement': {
    id: 'mortgage-statement',
    title: 'Hypotheken-Dokumente',
    description: 'Belege über bestehende Hypotheken und Zinszahlungen',
    category: 'assets',
    required: true
  },
  'debt-statements': {
    id: 'debt-statements',
    title: 'Schuldscheine',
    description: 'Belege über bestehende Schulden und Darlehen',
    category: 'assets',
    required: true
  },
  'other-assets': {
    id: 'other-assets',
    title: 'Andere Vermögenswerte',
    description: 'Belege über weitere Vermögenswerte',
    category: 'assets',
    required: true
  },
  'pillar3a-certificate': {
    id: 'pillar3a-certificate',
    title: 'Säule 3a Bescheinigung',
    description: 'Bestätigung über deine Säule 3a Beiträge',
    category: 'deductions',
    required: true
  },
  'bvg-purchase': {
    id: 'bvg-purchase',
    title: 'BVG-Einkauf',
    description: 'Belege über BVG-Einkäufe',
    category: 'deductions',
    required: true
  },
  'education-expenses': {
    id: 'education-expenses',
    title: 'Belege für Bildungskosten',
    description: 'Belege für Aus- und Weiterbildungskosten',
    category: 'deductions',
    required: true
  },
  'donation-receipts': {
    id: 'donation-receipts',
    title: 'Spendenbelege',
    description: 'Bescheinigungen über gemeinnützige Spenden',
    category: 'deductions',
    required: true
  },
  'maintenance-receipts': {
    id: 'maintenance-receipts',
    title: 'Liegenschaftsunterhalt',
    description: 'Belege über Unterhaltskosten für Liegenschaften',
    category: 'deductions',
    required: true
  },
  'childcare-expenses': {
    id: 'childcare-expenses',
    title: 'Kinderbetreuungskosten',
    description: 'Belege für Kinderbetreuungskosten',
    category: 'deductions',
    required: true
  },
  'supported-persons': {
    id: 'supported-persons',
    title: 'Unterstützte Personen',
    description: 'Nachweise über unterstützte Personen',
    category: 'deductions',
    required: true
  },
  'maintenance-payments': {
    id: 'maintenance-payments',
    title: 'Unterhaltszahlungen',
    description: 'Belege über geleistete oder erhaltene Unterhaltszahlungen',
    category: 'deductions',
    required: true
  },
  'other-deductions': {
    id: 'other-deductions',
    title: 'Andere Abzüge',
    description: 'Belege für weitere Abzüge',
    category: 'deductions',
    required: true
  }
};
const DocumentUploadPageContent: React.FC = () => {
  const {
    itemId
  } = useParams<{
    itemId: string;
  }>();
  const navigate = useNavigate();
  const {
    checklistItems,
    formDataLoaded,
    isDataLoading,
    taxYear,
    formData,
    updateFormData,
  } = useFormContext();
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [ocrOpen, setOcrOpen] = useState(false);
  const isLohnausweis = itemId === 'employment-income';
  const existingOcr: LohnausweisFields | undefined =
    (formData?.income as any)?.employers?.find((e: any) => e?.lohnausweis)?.lohnausweis;

  const handleOcrConfirm = (fields: LohnausweisFields) => {
    const employers = Array.isArray((formData?.income as any)?.employers)
      ? [...(formData.income as any).employers]
      : [];
    if (employers.length === 0) {
      employers.push({
        id: Math.random().toString(36).slice(2, 11),
        workLocation: '',
        workload: 100,
        workDays: 5,
        commute: 'public',
        lohnausweis: fields,
      });
    } else {
      employers[0] = { ...employers[0], lohnausweis: fields };
    }
    updateFormData('income', { ...(formData.income as any), employers });
    toast({
      title: 'Lohnausweis-Daten übernommen',
      description: 'Die erkannten Werte wurden für deine Steuererklärung gespeichert.',
    });
    setOcrOpen(false);
  };
  useEffect(() => {
    console.log('🔍 DocumentUploadPage effect:', {
      itemId,
      checklistItemsCount: checklistItems.length,
      formDataLoaded,
      isDataLoading
    });
    if (!itemId) {
      setIsLoading(false);
      return;
    }

    // Wait until form data is loaded before trying to find or create checklist items
    if (!formDataLoaded || isDataLoading) {
      console.log('⏳ Waiting for form data to load...');
      return;
    }

    // Try to find the item in the generated checklist
    let item = checklistItems.find(item => item.id === itemId);

    // If not found, create a fallback item for standard documents
    if (!item && STANDARD_DOCUMENTS[itemId]) {
      console.log(`📄 Creating fallback item for: ${itemId}`);
      item = {
        ...STANDARD_DOCUMENTS[itemId],
        uploaded: false
      };
    }
    console.log('✅ Selected item:', item);
    setSelectedItem(item || null);
    setIsLoading(false);
  }, [itemId, checklistItems, formDataLoaded, isDataLoading]);
  const handleBack = () => {
    navigate(`/form?section=unterlagen&year=${taxYear}`);
  };
  const handleDocumentSubmitted = () => {
    // Document was successfully uploaded
    console.log('Document submitted successfully');
  };
  // Show loading state while waiting for form data or processing
  if (isLoading || isDataLoading || !formDataLoaded) {
    return <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-6 pb-24 md:pb-6">
        <div className="mb-6">
          <Sphere size="medium" />
        </div>
        <div className="mb-8 text-center">
          <h1 className="text-slate-800 text-2xl font-medium mb-3">Dokument wird geladen...</h1>
          <p className="text-lg text-slate-500">
            Bitte warten Sie einen Moment.
          </p>
        </div>
      </div>;
  }

  // Show error state only if item really not found after loading is complete
  if (!selectedItem) {
    return <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-6 pb-24 md:pb-6">
        <div className="mb-6">
          <Sphere size="medium" />
        </div>
        <div className="mb-8 text-center">
          <h1 className="text-slate-800 text-2xl font-medium mb-3">Dokument nicht gefunden</h1>
          <p className="text-lg text-slate-500">
            Das angeforderte Dokument "{itemId}" konnte nicht gefunden werden.
          </p>
        </div>
        <Button onClick={handleBack} className="bg-[#1D64FF] hover:bg-[#1D64FF]/90 text-white border-0 rounded-full shadow-sm font-medium">
          Zurück zur Checkliste
        </Button>
      </div>;
  }
  return <div className="min-h-screen bg-transparent">
      <SubpageHeader title={selectedItem.title} onBack={handleBack} />
      
      <div className="flex flex-col items-center p-4 pb-24 md:pb-6">
        <div className="w-full max-w-3xl mb-3">
          <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-center">
            <p className="text-sm text-slate-600">
              {selectedItem.description}
            </p>
          </div>
        </div>

        {isLohnausweis && (
          <div className="w-full max-w-3xl mb-4">
            <button
              type="button"
              onClick={() => setOcrOpen(true)}
              className="w-full flex items-center justify-between gap-3 rounded-2xl border border-[#1D64FF]/30 bg-white px-4 py-3 text-left hover:bg-[#1D64FF]/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#1D64FF]/10">
                  {existingOcr ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <ScanLine className="w-4 h-4 text-[#1D64FF]" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {existingOcr ? 'Lohnausweis-Daten erfasst' : 'Daten automatisch erfassen'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {existingOcr
                      ? 'Tippe um die erkannten Werte zu prüfen oder zu ändern.'
                      : 'Wir lesen Ziff. 8, BVG, Quellensteuer sowie Felder F & G aus.'}
                  </div>
                </div>
              </div>
              <span className="text-xs font-semibold text-[#1D64FF]">
                {existingOcr ? 'Ändern' : 'Scannen'}
              </span>
            </button>
          </div>
        )}

        {/* Upload card */}
        <div className="w-full max-w-3xl rounded-[24px] overflow-hidden bg-transparent border-slate-200 p-0 border-0">
          <EnhancedDocumentUploader checklistItem={selectedItem} onBack={handleBack} onDocumentSubmitted={handleDocumentSubmitted} hideBackButton={true} hideHeader={true} />
        </div>
      </div>

      {isLohnausweis && (
        <LohnausweisOcrSheet
          open={ocrOpen}
          onOpenChange={setOcrOpen}
          onConfirm={handleOcrConfirm}
        />
      )}
    </div>;
};
const DocumentUploadPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const year = searchParams.get('year') || new Date().getFullYear().toString();
  return <FormProvider taxYear={year}>
      <DocumentUploadPageContent />
    </FormProvider>;
};
export default DocumentUploadPage;