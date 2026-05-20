/**
 * Tax year availability is system-managed.
 *
 * DOCUMENT COLLECTION SCOPE (getAvailableTaxYears):
 *   Base 2024 + 2025; each future year Y unlocks on 01.01.Y (e.g. 2026 since 01.01.2026).
 *   Used in /documents so users can already collect documents for the upcoming year.
 *
 * FILING / DASHBOARD SCOPE (getFilingTaxYears):
 *   Only years for which the actual tax return can be filed. 2026 is NOT yet
 *   activated for filing on the main dashboard — it remains documents-only.
 *
 * Users cannot add tax years themselves.
 */
export const getAvailableTaxYears = (now: Date = new Date()): string[] => {
  const base = [2024, 2025];
  const currentYear = now.getFullYear();
  const years = new Set<number>(base);
  for (let y = 2026; y <= currentYear; y++) {
    years.add(y);
  }
  return Array.from(years)
    .sort((a, b) => a - b)
    .map((y) => y.toString());
};

export const isTaxYearAvailable = (year: string, now: Date = new Date()): boolean =>
  getAvailableTaxYears(now).includes(year);

export const getLatestAvailableTaxYear = (now: Date = new Date()): string => {
  const years = getAvailableTaxYears(now);
  return years[years.length - 1];
};

/**
 * Years available for the main filing flow (dashboard, tax-returns page).
 * 2026 is intentionally excluded — only documents collection is active for 2026.
 */
export const getFilingTaxYears = (_now: Date = new Date()): string[] => {
  return ['2024', '2025'];
};

export const isFilingYearAvailable = (year: string, now: Date = new Date()): boolean =>
  getFilingTaxYears(now).includes(year);

export const getLatestFilingTaxYear = (now: Date = new Date()): string => {
  const years = getFilingTaxYears(now);
  return years[years.length - 1];
};
