/**
 * Mapping: existing Ditax form_data (previous year) → prior-year checklist items.
 *
 * Used by seedPriorYearChecklistFromInternal to mirror the structure that the
 * OCR/AI flow produces from a PDF upload — so the user sees the same
 * confirmation UI either way.
 */

import type { ItemCategory } from "@/hooks/usePriorYearChecklist";

type SectionData = Record<string, any> | null | undefined;

export interface MappedItem {
  category: ItemCategory;
  label: string;
}

const truncate = (s: string, n = 120) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

const labelFromArrayItem = (
  prefix: string,
  fallback: string,
  pickers: Array<(it: any) => string | undefined | null>,
  it: any,
): string => {
  for (const pick of pickers) {
    const v = pick(it);
    if (v && String(v).trim()) return truncate(`${prefix} – ${String(v).trim()}`);
  }
  return `${prefix} – ${fallback}`;
};

const flagItem = (cond: any, label: string): MappedItem | null =>
  cond ? { category: categoryForLabel(label), label } : null;

// helper to satisfy TS; we set the category explicitly in the calling code
function categoryForLabel(_label: string): ItemCategory {
  return "other";
}

export function mapIncomeToItems(income: SectionData): MappedItem[] {
  if (!income) return [];
  const items: MappedItem[] = [];

  const employers = Array.isArray(income.employers) ? income.employers : [];
  employers.forEach((e: any, i: number) => {
    items.push({
      category: "income",
      label: labelFromArrayItem(
        "Lohnausweis",
        `Arbeitgeber ${i + 1}`,
        [
          (x) => x?.employerName,
          (x) => x?.name,
          (x) => x?.company,
          (x) => x?.workLocation,
        ],
        e,
      ),
    });
  });

  const rentals = Array.isArray(income.rentalIncomes) ? income.rentalIncomes : [];
  rentals.forEach((r: any, i: number) => {
    items.push({
      category: "income",
      label: labelFromArrayItem(
        "Mieteinnahmen",
        `Liegenschaft ${i + 1}`,
        [(x) => x?.property, (x) => x?.address],
        r,
      ),
    });
  });

  const dividends = Array.isArray(income.dividends) ? income.dividends : [];
  dividends.forEach((d: any, i: number) => {
    items.push({
      category: "income",
      label: labelFromArrayItem(
        "Wertschriften / Dividenden",
        `Position ${i + 1}`,
        [(x) => x?.company, (x) => x?.institution, (x) => x?.name],
        d,
      ),
    });
  });

  const freelance = Array.isArray(income.freelanceIncome) ? income.freelanceIncome : [];
  freelance.forEach((f: any, i: number) => {
    items.push({
      category: "income",
      label: labelFromArrayItem(
        "Selbständige Tätigkeit",
        `Auftraggeber ${i + 1}`,
        [(x) => x?.clientName, (x) => x?.description],
        f,
      ),
    });
  });

  // Flags
  if (income.hasPension) items.push({ category: "income", label: "Renten-Abrechnung (AHV / IV / Pensionskasse)" });
  if (income.hasPensionPayout) items.push({ category: "income", label: "Kapitalbezug Vorsorge" });
  if (income.hasGiftInheritance) items.push({ category: "income", label: "Schenkung / Erbschaft – Belege" });
  if (income.hasOtherIncome) items.push({
    category: "income",
    label: truncate(`Übriges Einkommen${income.otherIncomeString ? ` – ${income.otherIncomeString}` : ""}`),
  });

  return items;
}

export function mapAssetsToItems(assets: SectionData): MappedItem[] {
  if (!assets) return [];
  const items: MappedItem[] = [];

  const properties = Array.isArray(assets.properties) ? assets.properties : [];
  properties.forEach((p: any, i: number) => {
    items.push({
      category: "assets",
      label: labelFromArrayItem(
        "Liegenschaft",
        `Objekt ${i + 1}`,
        [(x) => x?.address, (x) => x?.location],
        p,
      ),
    });
  });

  const vehicles = Array.isArray(assets.vehicles) ? assets.vehicles : [];
  vehicles.forEach((v: any, i: number) => {
    items.push({
      category: "assets",
      label: labelFromArrayItem(
        "Fahrzeug",
        `Fahrzeug ${i + 1}`,
        [(x) => x?.name, (x) => [x?.make, x?.model].filter(Boolean).join(" ")],
        v,
      ),
    });
  });

  const debts = Array.isArray(assets.debts) ? assets.debts : [];
  debts.forEach((d: any, i: number) => {
    items.push({
      category: "assets",
      label: labelFromArrayItem(
        "Schuld",
        `Schuld ${i + 1}`,
        [(x) => x?.description, (x) => x?.type],
        d,
      ),
    });
  });

  if (assets.hasDepositAccount) items.push({ category: "assets", label: "Bankauszüge per 31.12." });
  if (assets.hasSecuritiesAccount) items.push({ category: "assets", label: "Wertschriften­verzeichnis / Depot-Auszug" });
  if (assets.hasCrypto) items.push({ category: "assets", label: "Krypto-Bestände per 31.12." });
  if (assets.hasMortgage) items.push({ category: "assets", label: "Hypothekarausweis" });
  if (assets.hasOtherAssets) items.push({
    category: "assets",
    label: truncate(`Übrige Vermögenswerte${assets.otherAssetsString ? ` – ${assets.otherAssetsString}` : ""}`),
  });

  return items;
}

export function mapDeductionsToItems(deductions: SectionData): MappedItem[] {
  if (!deductions) return [];
  const items: MappedItem[] = [];

  const supported = Array.isArray(deductions.supportedPersons) ? deductions.supportedPersons : [];
  supported.forEach((s: any, i: number) => {
    items.push({
      category: "deductions",
      label: labelFromArrayItem(
        "Unterstützungs-Nachweis",
        `Person ${i + 1}`,
        [(x) => [x?.firstName, x?.lastName].filter(Boolean).join(" ")],
        s,
      ),
    });
  });

  const maintenance = Array.isArray(deductions.maintenancePayments) ? deductions.maintenancePayments : [];
  maintenance.forEach((m: any, i: number) => {
    items.push({
      category: "deductions",
      label: labelFromArrayItem(
        "Alimente",
        `Empfänger ${i + 1}`,
        [(x) => x?.recipient],
        m,
      ),
    });
  });

  if (deductions.hasWorkRelatedExpenses) items.push({ category: "deductions", label: "Berufskosten-Belege" });
  if (deductions.hasPillar3a) items.push({ category: "deductions", label: "Säule 3a – Bescheinigung" });
  if (deductions.hasBVGPurchase) items.push({ category: "deductions", label: "BVG-Einkauf – Bescheinigung" });
  if (deductions.hasChildcare) items.push({ category: "deductions", label: "Kinderbetreuung – Belege" });
  if (deductions.hasEducationExpenses) items.push({ category: "deductions", label: "Weiterbildungs-Belege" });
  if (deductions.hasDonations) items.push({ category: "deductions", label: "Spendenbescheinigungen" });
  if (deductions.hasPropertyMaintenance) items.push({ category: "deductions", label: "Liegenschafts-Unterhaltskosten" });
  if (deductions.healthInsurance || deductions.medicalExpenses) {
    items.push({ category: "deductions", label: "Krankheits- / Versicherungs-Belege" });
  }
  if (deductions.hasOtherDeductions) items.push({
    category: "deductions",
    label: truncate(`Übrige Abzüge${deductions.otherDeductions ? ` – ${deductions.otherDeductions}` : ""}`),
  });

  return items;
}

export interface PriorYearFormSnapshot {
  income?: SectionData;
  assets?: SectionData;
  deductions?: SectionData;
}

export function buildItemsFromPriorYearFormData(snapshot: PriorYearFormSnapshot): MappedItem[] {
  return [
    ...mapIncomeToItems(snapshot.income),
    ...mapAssetsToItems(snapshot.assets),
    ...mapDeductionsToItems(snapshot.deductions),
  ];
}
