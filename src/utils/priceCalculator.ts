import { FormData } from "@/types";

export interface PriceBreakdown {
  basePrice: number;
  incomeAdditional: number;
  deductionsDiscount: number;
  assetsAdditional: number;
  expressService: number;
  totalPrice: number;
  items: { label: string; amount: number }[];
}

// TEST MODE: Set to true for 1.00 CHF pricing, false for production pricing
const TEST_MODE = false;

export const calculatePrice = (formData: FormData, expressService: boolean = false): PriceBreakdown => {
  // TEST MODE: Use 100 cents (1.00 CHF) as base price instead of 150 CHF
  const basePrice = TEST_MODE ? 100 : 15000; // 100 cents vs 150 CHF in cents
  let totalPrice = basePrice;
  const items: { label: string; amount: number }[] = [
    { label: "Grundpreis", amount: basePrice }
  ];

  // In TEST MODE, skip all additional charges to keep price at 1.00 CHF
  if (TEST_MODE) {
    const expressServiceFee = expressService ? 100 : 0; // 1.00 CHF in test mode
    if (expressService) {
      items.push({ label: "Express-Service (10 Tage)", amount: expressServiceFee });
    }
    return {
      basePrice,
      incomeAdditional: 0,
      deductionsDiscount: 0,
      assetsAdditional: 0,
      expressService: expressServiceFee,
      totalPrice: basePrice + expressServiceFee,
      items
    };
  }

  // PRODUCTION MODE: Keep all existing calculation logic
  // Einkommen Zuschläge
  let incomeAdditional = 0;

  // Arbeitnehmer +30 CHF (+ 20 CHF für jedes wiederholbare Feld)
  if (formData.income.hasSalary) {
    incomeAdditional += 3000; // 30 CHF in Cents
    items.push({ label: "Arbeitnehmer", amount: 3000 });
    
    // +20 CHF für jeden zusätzlichen Arbeitgeber nach dem ersten
    const additionalEmployers = Math.max(0, formData.income.employers.length - 1);
    if (additionalEmployers > 0) {
      const additionalFee = additionalEmployers * 2000; // 20 CHF pro zusätzlichem Arbeitgeber
      incomeAdditional += additionalFee;
      items.push({ 
        label: `Zusätzliche Arbeitgeber (${additionalEmployers})`, 
        amount: additionalFee 
      });
    }
  }

  // Selbständigerwerbend +50 CHF
  if (formData.income.hasFreelance) {
    incomeAdditional += 5000;
    items.push({ label: "Selbständigerwerbend", amount: 5000 });
  }

  // Rente +50 CHF
  if (formData.income.hasPension) {
    incomeAdditional += 5000;
    items.push({ label: "Renten", amount: 5000 });
  }

  // Schenkung +30 CHF
  if (formData.income.hasGiftInheritance) {
    incomeAdditional += 3000;
    items.push({ label: "Schenkung/Erbvorbezug", amount: 3000 });
  }

  // Kapitalauszahlung +30 CHF
  if (formData.income.hasPensionPayout) {
    incomeAdditional += 3000;
    items.push({ label: "Kapitalauszahlung", amount: 3000 });
  }

  // Weitere Einkommen +30 CHF
  if (formData.income.hasOtherIncome) {
    incomeAdditional += 3000;
    items.push({ label: "Weitere Einkommen", amount: 3000 });
  }

  // Abzüge Reduktionen
  let deductionsDiscount = 0;

  // Säule 3a +10 CHF
  if (formData.deductions.hasPillar3a) {
    deductionsDiscount += 1000;
    items.push({ label: "Säule 3a", amount: 1000 });
  }

  // BVG +10 CHF
  if (formData.deductions.hasBVGPurchase) {
    deductionsDiscount += 1000;
    items.push({ label: "BVG-Einkauf", amount: 1000 });
  }

  // Weiterbildungkosten +30 CHF
  if (formData.deductions.hasEducationExpenses) {
    deductionsDiscount += 3000;
    items.push({ label: "Weiterbildungskosten", amount: 3000 });
  }

  // Spenden +20 CHF
  if (formData.deductions.hasDonations) {
    deductionsDiscount += 2000;
    items.push({ label: "Spenden", amount: 2000 });
  }

  // Liegenschaftsunterhalt +30 CHF
  if (formData.deductions.hasPropertyMaintenance) {
    deductionsDiscount += 3000;
    items.push({ label: "Liegenschaftsunterhalt", amount: 3000 });
  }

  // Weitere Abzüge +10 CHF
  if (formData.deductions.hasOtherDeductions) {
    deductionsDiscount += 1000;
    items.push({ label: "Weitere Abzüge", amount: 1000 });
  }

  // Unterstützungsbedürftige Personen +10 CHF
  if (formData.deductions.hasSupportedPersons) {
    deductionsDiscount += 1000;
    items.push({ label: "Unterstützungsbedürftige Personen", amount: 1000 });
  }

  // Unterhaltskosten +10 CHF
  if (formData.deductions.hasMaintenancePayments) {
    deductionsDiscount += 1000;
    items.push({ label: "Unterhaltskosten", amount: 1000 });
  }

  // Kinderbetreuungskosten +10 CHF
  if (formData.deductions.hasChildcare) {
    deductionsDiscount += 1000;
    items.push({ label: "Kinderbetreuungskosten", amount: 1000 });
  }

  // Vermögen Zuschläge
  let assetsAdditional = 0;

  // Fahrzeug +10 CHF (+10 CHF pro Fahrzeug)
  if (formData.assets.hasVehicle) {
    assetsAdditional += 1000;
    items.push({ label: "Fahrzeug", amount: 1000 });
    
    // Zusatzkosten für jedes Fahrzeug
    const additionalFee = formData.assets.vehicles.length * 1000; // 10 CHF pro Fahrzeug
    if (additionalFee > 0) {
      assetsAdditional += additionalFee;
      items.push({ 
        label: `Zusätzliche Fahrzeuge (${formData.assets.vehicles.length})`, 
        amount: additionalFee 
      });
    }
  }

  // Liegenschaft +20 CHF (+20 CHF pro Liegenschaft)
  if (formData.assets.hasProperty) {
    assetsAdditional += 2000;
    items.push({ label: "Liegenschaft", amount: 2000 });
    
    // Zusatzkosten für jede Liegenschaft
    const additionalFee = formData.assets.properties.length * 2000; // 20 CHF pro Liegenschaft
    if (additionalFee > 0) {
      assetsAdditional += additionalFee;
      items.push({ 
        label: `Zusätzliche Liegenschaften (${formData.assets.properties.length})`, 
        amount: additionalFee 
      });
    }
  }

  // Hypothek +10 CHF
  if (formData.assets.hasMortgage) {
    assetsAdditional += 1000;
    items.push({ label: "Hypothek", amount: 1000 });
  }

  // Schulden +10 CHF
  if (formData.assets.hasDebt) {
    assetsAdditional += 1000;
    items.push({ label: "Schulden", amount: 1000 });
  }

  // Depotkonto +20 CHF
  if (formData.assets.hasSecuritiesAccount) {
    assetsAdditional += 2000;
    items.push({ label: "Depotkonto", amount: 2000 });
  }

  // Krypto +20 CHF
  if (formData.assets.hasCrypto) {
    assetsAdditional += 2000;
    items.push({ label: "Kryptowährungen", amount: 2000 });
  }

  // Weitere Vermögenswerte +10 CHF
  if (formData.assets.hasOtherAssets) {
    assetsAdditional += 1000;
    items.push({ label: "Weitere Vermögenswerte", amount: 1000 });
  }

  // Express Service Zuschlag
  const expressServiceFee = expressService ? 10000 : 0; // 100 CHF in Cents
  if (expressService) {
    items.push({ label: "Express-Service (10 Tage)", amount: expressServiceFee });
  }

  // Gesamtpreis berechnen
  totalPrice = basePrice + incomeAdditional + deductionsDiscount + assetsAdditional + expressServiceFee;

  return {
    basePrice,
    incomeAdditional,
    deductionsDiscount,
    assetsAdditional,
    expressService: expressServiceFee,
    totalPrice,
    items
  };
};
