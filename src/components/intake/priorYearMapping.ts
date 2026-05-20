import type { ChecklistItem, ItemCategory } from "@/hooks/usePriorYearChecklist";

type Flag = string;

const INCOME_RULES: Array<{ kw: RegExp; flag: Flag }> = [
  // Employment income (incl. Nebenerwerb / unselbständig) → Lohnausweis
  { kw: /unselbst[äa]nd|arbeitgeb|lohn|gehalt|sal[äa]r|anstellung|nebenerwerb/i, flag: "hasSalary" },
  { kw: /miet|verm[iy]et|rental/i, flag: "hasRental" },
  // Wertschriftenertrag is covered by the Wertschriften-/Depot-Verzeichnis (assets) — no separate doc.
  { kw: /\bdividend/i, flag: "hasDividends" },
  // Only true self-employment, not the substring "selbst" in "unselbständig"
  { kw: /selbst[äa]ndig(?!keit\s+der|er\s+neben)|freelance|honorar/i, flag: "hasFreelance" },
  { kw: /\brente\b|ahv|iv\b|pension/i, flag: "hasPension" },
  { kw: /schenkung|erbschaft|erbe\b/i, flag: "hasGiftInheritance" },
  { kw: /kapitalauszahl|s[äa]ule\s*3|pillar\s*3|austritt.*pensionskasse/i, flag: "hasPensionPayout" },
  { kw: /lotto|toto|gewinn|sonstige?\s*eink|andere?\s*eink|[üu]brige?\s*eink|familien(zulag|mutterschaft)/i, flag: "hasOtherIncome" },
];

const ASSETS_RULES: Array<{ kw: RegExp; flag: Flag }> = [
  { kw: /liegenschaft|immobil|haus|wohnung|grundst/i, flag: "hasProperty" },
  // Wertschriften/Depot zuerst — sonst greift die allgemeine Bank-Regel
  { kw: /wertschrift|depot/i, flag: "hasSecuritiesAccount" },
  { kw: /bank|konto|raiffeisen|sparkonto|guthaben/i, flag: "hasDepositAccount" },
  { kw: /krypto|bitcoin|ethereum|crypto/i, flag: "hasCrypto" },
  { kw: /hypothek|mortgage/i, flag: "hasMortgage" },
  { kw: /schuld|darlehen|kredit/i, flag: "hasDebt" },
  { kw: /fahrzeug|auto\b|schmuck|sammlung|andere\s*verm/i, flag: "hasOtherAssets" },
];

const DEDUCTIONS_RULES: Array<{ kw: RegExp; flag: Flag }> = [
  { kw: /s[äa]ule\s*3a|pillar\s*3a|\b3a\b/i, flag: "hasPillar3a" },
  { kw: /bvg|einkauf.*pensionskasse|pensionskasseneinkauf/i, flag: "hasBVGPurchase" },
  { kw: /weiterbild|ausbild|schul|kurs/i, flag: "hasEducationExpenses" },
  { kw: /spende|gemeinn/i, flag: "hasDonations" },
  { kw: /liegenschaftsunterhalt|unterhalt\s*liegenschaft|reparatur|renov/i, flag: "hasPropertyMaintenance" },
  { kw: /kinderbetreu|kita|krippe|tagesmutter/i, flag: "hasChildcare" },
  { kw: /unterst[üu]tz/i, flag: "hasSupportedPersons" },
  { kw: /aliment|unterhaltsbeitr/i, flag: "hasMaintenancePayments" },
  { kw: /andere?\s*abz/i, flag: "hasOtherDeductions" },
];

const RULES: Record<Exclude<ItemCategory, "contact" | "other">, typeof INCOME_RULES> = {
  income: INCOME_RULES,
  assets: ASSETS_RULES,
  deductions: DEDUCTIONS_RULES,
};

export interface PriorYearMappingResult {
  income: Record<string, boolean>;
  assets: Record<string, boolean>;
  deductions: Record<string, boolean>;
}

/**
 * Convert confirmed prior-year checklist items into formData has-flags.
 * Items with change_status === 'removed' are excluded.
 */
export function mapPriorYearToFormFlags(items: ChecklistItem[]): PriorYearMappingResult {
  // Start with every known flag explicitly `false` so re-runs clear old values.
  const seed = (rules: typeof INCOME_RULES) =>
    Object.fromEntries(rules.map(r => [r.flag, false]));
  const result: PriorYearMappingResult = {
    income: seed(INCOME_RULES),
    assets: seed(ASSETS_RULES),
    deductions: seed(DEDUCTIONS_RULES),
  };

  for (const it of items) {
    if (it.change_status === "removed") continue;
    const cat = it.category;
    if (cat !== "income" && cat !== "assets" && cat !== "deductions") continue;
    const rules = RULES[cat];
    const text = `${it.label} ${it.source_value ?? ""}`;
    for (const { kw, flag } of rules) {
      if (kw.test(text)) result[cat][flag] = true;
    }
  }
  return result;
}
