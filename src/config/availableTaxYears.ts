/**
 * Tax year availability is system-managed.
 *
 * Base years: 2024 + 2025 are always available.
 * Each future year Y becomes available starting 01.01.(Y+1).
 * (e.g. 2026 unlocks on 01.01.2026.)
 *
 * Users cannot add tax years themselves anymore.
 */
export const getAvailableTaxYears = (now: Date = new Date()): string[] => {
  const base = [2024, 2025];
  const currentYear = now.getFullYear();
  const years = new Set<number>(base);
  // Add every year from 2026 up to currentYear (inclusive).
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
