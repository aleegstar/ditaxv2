import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { FormProvider, useFormContext } from '../contexts';
import { ChecklistItem } from '../types';
import { Sphere } from "@/components/ui/sphere";
import { Button } from "@/components/ui/button";
import { SubpageHeader } from "@/components/ui/subpage-header";
import EnhancedDocumentUploader from '@/components/EnhancedDocumentUploader';
// Standard document definitions for fallback
const STANDARD_DOCUMENTS: Record<string, Omit<ChecklistItem, 'uploaded'>> = {
  'tax-cover-sheet': {
    id: 'tax-cover-sheet',
    title: 'Deckblatt der Steuererklärung',
    description: 'Das Deckblatt Ihrer Steuererklärung wird benötigt, da keine Adressnummer angegeben wurde',
    category: 'general',
    required: true
  },
  'employment-income': {
    id: 'employment-income',
    title: 'Lohnausweis',
    description: 'Ihr jährlicher Lohnausweis von Ihrem Arbeitgeber',
    category: 'income',
    required: true
  },
  'rental-income': {
    id: 'rental-income',
    title: 'Mieteinnahmen-Belege',
    description: 'Belege und Aufstellungen über Ihre Mieteinnahmen',
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
    description: 'Belege und Aufstellungen Ihres selbständigen Einkommens',
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
    description: 'Auszug Ihres Depotkontos per Jahresende',
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
    description: 'Bestätigung über Ihre Säule 3a Beiträge',
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
    taxYear
  } = useFormContext();
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
    return <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 pb-24 md:pb-6">
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
    return <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 pb-24 md:pb-6">
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
  return <div className="min-h-screen bg-white">
      <SubpageHeader title="Dokument hochladen" onBack={handleBack} />
      
      <div className="flex flex-col items-center justify-center p-6 pb-24 md:pb-6">
        <div className="mb-8 text-center">
          
          <p className="text-base text-slate-500">
            {selectedItem.description}
          </p>
        </div>

        {/* Upload card */}
        <div className="w-full max-w-4xl rounded-[24px] overflow-hidden bg-white border-slate-200 p-4 border-0">
          <EnhancedDocumentUploader checklistItem={selectedItem} onBack={handleBack} onDocumentSubmitted={handleDocumentSubmitted} hideBackButton={true} hideHeader={true} />
        </div>
      </div>
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