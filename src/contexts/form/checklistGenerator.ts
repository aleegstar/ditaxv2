
import { FormData, FormProgressType } from "./types";
import { ChecklistItem } from "@/types";

// Basic documents that should always be shown
const getBasicDocuments = (): ChecklistItem[] => [
  {
    id: "bank-account-statement",
    title: "Zins- und Saldobescheinigung der Bankkonten",
    description: "Bescheinigung über Zinserträge und Kontostände aller Bankkonten per Jahresende",
    category: "general",
    uploaded: false,
    required: true
  }
];

export const generateChecklistItems = (
  formData: FormData, 
  formProgress: FormProgressType
): ChecklistItem[] => {
  console.log('🔧 Starting checklist generation with:', { 
    formData: JSON.stringify(formData, null, 2), 
    formProgress 
  });
  
  // Start with empty checklist - bank statement will be added to assets section
  const checklistItems: ChecklistItem[] = [];
  console.log('📋 Starting checklist generation...');
  
  // Check if tax cover sheet is needed (when no address number is provided)
  if (!formData.contactInfo?.adressnummer || formData.contactInfo.adressnummer.trim() === '') {
    checklistItems.push({
      id: "tax-cover-sheet",
      title: "Deckblatt der Steuererklärung",
      description: "Das Deckblatt deiner Steuererklärung wird benötigt, da keine Adressnummer angegeben wurde",
      category: "general",
      uploaded: false,
      required: true
    });
    console.log('✅ Added tax cover sheet (no address number)');
  }
  
  // Add income-related documents based on form data OR if income section has any progress
  if (formProgress.income || formData.income) {
    console.log('🏦 Processing income documents...');
    
    // Check for salary income
    if (formData.income?.hasSalary || formData.income?.employmentIncome > 0) {
      checklistItems.push({
        id: "employment-income",
        title: "Lohnausweis",
        description: "Dein jährlicher Lohnausweis von deinem Arbeitgeber",
        category: "income",
        uploaded: false,
        required: true
      });
      console.log('✅ Added salary document');
    }
    
    // Check for rental income
    if (formData.income?.hasRental || formData.income?.rentalIncome > 0) {
      checklistItems.push({
        id: "rental-income",
        title: "Mieteinnahmen-Belege",
        description: "Belege und Aufstellungen über deine Mieteinnahmen",
        category: "income",
        uploaded: false,
        required: true
      });
      console.log('✅ Added rental income document');
    }
    
    // Check for dividends
    if (formData.income?.hasDividends || formData.income?.capitalIncome > 0) {
      checklistItems.push({
        id: "dividend-statement",
        title: "Dividenden-Bescheinigung",
        description: "Bescheinigungen über erhaltene Dividenden und Kapitalerträge",
        category: "income",
        uploaded: false,
        required: true
      });
      console.log('✅ Added dividend document');
    }
    
    // Check for freelance income
    if (formData.income?.hasFreelance || formData.income?.selfEmploymentIncome > 0) {
      checklistItems.push({
        id: "freelance-income",
        title: "Selbständigeneinkommen",
        description: "Belege und Aufstellungen deines selbständigen Einkommens",
        category: "income",
        uploaded: false,
        required: true
      });
      console.log('✅ Added freelance document');
    }
    
    // Check for pension income
    if (formData.income?.hasPension || formData.income?.pensionIncome > 0) {
      checklistItems.push({
        id: "pension-statement",
        title: "Rentenausweis",
        description: "Bescheinigung über erhaltene Renten aus Sozialversicherungen",
        category: "income",
        uploaded: false,
        required: true
      });
      console.log('✅ Added pension document');
    }
    
    // Check for gift/inheritance
    if (formData.income?.hasGiftInheritance) {
      checklistItems.push({
        id: "gift-inheritance",
        title: "Schenkungen/Erbschaften-Belege",
        description: "Belege über erhaltene Schenkungen und Erbschaften",
        category: "income",
        uploaded: false,
        required: true
      });
      console.log('✅ Added gift/inheritance document');
    }
    
    // Check for pension payout
    if (formData.income?.hasPensionPayout) {
      checklistItems.push({
        id: "pension-payout",
        title: "Pensionskassenauszahlung",
        description: "Belege über Auszahlungen aus der Pensionskasse",
        category: "income",
        uploaded: false,
        required: true
      });
      console.log('✅ Added pension payout document');
    }
    
    // Check for other income
    if (formData.income?.hasOtherIncome || formData.income?.otherIncome > 0) {
      checklistItems.push({
        id: "other-income",
        title: "Weitere Einkommen",
        description: "Belege für weitere Einkommen (Taggelder, Stipendien, etc.)",
        category: "income",
        uploaded: false,
        required: true
      });
      console.log('✅ Added other income document');
    }
  }
  
  // Add assets-related documents (including bank account statement)
  if (formProgress.assets || formData.assets || true) { // Always process assets to include bank statement
    console.log('🏠 Processing assets documents...');
    
    // Always add bank account statement under assets category
    checklistItems.push({
      id: "bank-account-statement",
      title: "Zins- und Saldobescheinigung der Bankkonten",
      description: "Bescheinigung über Zinserträge und Kontostände aller Bankkonten per Jahresende",
      category: "assets",
      uploaded: false,
      required: true
    });
    console.log('✅ Added bank account statement to assets');
    
    // NOTE: Vehicles and properties are excluded as per user requirement
    // if (formData.assets?.hasVehicle) - EXCLUDED
    // Check for properties and add purchase contracts if purchased this year
    if (formData.assets?.hasProperty && formData.assets?.properties) {
      // Check if any property was purchased this year
      const propertiesPurchasedThisYear = formData.assets.properties.filter(
        property => property.purchasedThisYear === true
      );
      
      if (propertiesPurchasedThisYear.length > 0) {
        propertiesPurchasedThisYear.forEach((property, index) => {
          checklistItems.push({
            id: `property-purchase-contract-${property.id || index}`,
            title: "Kaufvertrag Immobilie",
            description: `Kaufvertrag für die Immobilie: ${property.address || 'Unbekannte Adresse'}`,
            category: "assets",
            uploaded: false,
            required: true
          });
          console.log(`✅ Added purchase contract for property: ${property.address}`);
        });
      }
    }
    
    if (formData.assets?.hasDepositAccount) {
      checklistItems.push({
        id: "deposit-account",
        title: "Depotauszug",
        description: "Auszug deines Depotkontos per Jahresende",
        category: "assets",
        uploaded: false,
        required: true
      });
      console.log('✅ Added deposit account document');
    }
    
    if (formData.assets?.hasCrypto) {
      checklistItems.push({
        id: "crypto-portfolio",
        title: "Kryptowährungsnachweis",
        description: "Nachweis über Kryptowährungsbestände per Jahresende",
        category: "assets",
        uploaded: false,
        required: true
      });
      console.log('✅ Added crypto document');
    }
    
    if (formData.assets?.hasMortgage) {
      checklistItems.push({
        id: "mortgage-statement",
        title: "Hypotheken-Dokumente",
        description: "Belege über bestehende Hypotheken und Zinszahlungen",
        category: "assets",
        uploaded: false,
        required: true
      });
      console.log('✅ Added mortgage document');
    }
    
    if (formData.assets?.hasDebt) {
      checklistItems.push({
        id: "debt-statements",
        title: "Schuldscheine",
        description: "Belege über bestehende Schulden und Darlehen",
        category: "assets",
        uploaded: false,
        required: true
      });
      console.log('✅ Added debt document');
    }
    
    if (formData.assets?.hasOtherAssets) {
      checklistItems.push({
        id: "other-assets",
        title: "Andere Vermögenswerte",
        description: "Belege über weitere Vermögenswerte",
        category: "assets",
        uploaded: false,
        required: true
      });
      console.log('✅ Added other assets document');
    }
  }
  
  // Add deductions-related documents
  if (formProgress.deductions || formData.deductions) {
    console.log('💰 Processing deductions documents...');
    
    if (formData.deductions?.hasPillar3a) {
      checklistItems.push({
        id: "pillar3a-certificate",
        title: "Säule 3a Bescheinigung",
        description: "Bestätigung über deine Säule 3a Beiträge",
        category: "deductions",
        uploaded: false,
        required: true
      });
      console.log('✅ Added pillar 3a document');
    }
    
    if (formData.deductions?.hasBVGPurchase) {
      checklistItems.push({
        id: "bvg-purchase",
        title: "BVG-Einkauf",
        description: "Belege über BVG-Einkäufe",
        category: "deductions",
        uploaded: false,
        required: true
      });
      console.log('✅ Added BVG purchase document');
    }
    
    if (formData.deductions?.hasEducationExpenses) {
      checklistItems.push({
        id: "education-expenses",
        title: "Belege für Bildungskosten",
        description: "Belege für Aus- und Weiterbildungskosten",
        category: "deductions",
        uploaded: false,
        required: true
      });
      console.log('✅ Added education expenses document');
    }
    
    if (formData.deductions?.hasDonations) {
      checklistItems.push({
        id: "donation-receipts",
        title: "Spendenbelege",
        description: "Bescheinigungen über gemeinnützige Spenden",
        category: "deductions",
        uploaded: false,
        required: true
      });
      console.log('✅ Added donation document');
    }
    
    if (formData.deductions?.hasPropertyMaintenance) {
      checklistItems.push({
        id: "maintenance-receipts",
        title: "Liegenschaftsunterhalt",
        description: "Belege über Unterhaltskosten für Liegenschaften",
        category: "deductions",
        uploaded: false,
        required: true
      });
      console.log('✅ Added property maintenance document');
    }
    
    // Professional expenses - documents not required as per user requirement
    // if (formData.deductions?.hasWorkRelatedExpenses) {
    //   checklistItems.push({
    //     id: "work-expenses",
    //     title: "Berufskosten",
    //     description: "Belege für berufsbedingte Auslagen",
    //     category: "deductions",
    //     uploaded: false,
    //     required: true
    //   });
    //   console.log('✅ Added work expenses document');
    // }
    
    if (formData.deductions?.hasChildcare) {
      checklistItems.push({
        id: "childcare-expenses",
        title: "Kinderbetreuungskosten",
        description: "Belege für Kinderbetreuungskosten",
        category: "deductions",
        uploaded: false,
        required: true
      });
      console.log('✅ Added childcare document');
    }
    
    if (formData.deductions?.hasSupportedPersons) {
      checklistItems.push({
        id: "supported-persons",
        title: "Unterstützte Personen",
        description: "Nachweise über unterstützte Personen",
        category: "deductions",
        uploaded: false,
        required: true
      });
      console.log('✅ Added supported persons document');
    }
    
    if (formData.deductions?.hasMaintenancePayments) {
      checklistItems.push({
        id: "maintenance-payments",
        title: "Unterhaltszahlungen",
        description: "Belege über geleistete oder erhaltene Unterhaltszahlungen",
        category: "deductions",
        uploaded: false,
        required: true
      });
      console.log('✅ Added maintenance payments document');
    }
    
    if (formData.deductions?.hasOtherDeductions) {
      checklistItems.push({
        id: "other-deductions",
        title: "Andere Abzüge",
        description: "Belege für weitere Abzüge",
        category: "deductions",
        uploaded: false,
        required: true
      });
      console.log('✅ Added other deductions document');
    }
  }
  
  console.log('🎯 Final generated checklist items:', checklistItems.length);
  console.log('🎯 Generated items by category:', {
    general: checklistItems.filter(item => item.category === 'general').length,
    income: checklistItems.filter(item => item.category === 'income').length,
    assets: checklistItems.filter(item => item.category === 'assets').length,
    deductions: checklistItems.filter(item => item.category === 'deductions').length
  });
  
  return checklistItems;
};

export default generateChecklistItems;
