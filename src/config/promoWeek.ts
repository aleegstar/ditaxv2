/**
 * Aktionswoche 11.05.2026 – 17.05.2026 (Europe/Zurich, CEST = UTC+2).
 *
 * Während dieses Zeitfensters kostet eine Steuererklärung pauschal CHF 100
 * (10'000 Rappen) und der Express-Service pauschal CHF 20 (2'000 Rappen).
 *
 * Wird gleichzeitig im Frontend (`priceCalculator.ts`, `ResultStep.tsx`) und
 * serverseitig in der Edge Function `create-payment` durchgesetzt. Beim
 * Edge-Function-Pendant müssen Start/End-Konstanten dupliziert werden, da
 * Edge Functions nicht auf `src/` zugreifen können.
 */

// Mai liegt fix in Sommerzeit (CEST, UTC+2) – kein DST-Wechsel innerhalb der Woche.
export const PROMO_WEEK_START_UTC = Date.UTC(2026, 4, 10, 22, 0, 0); // 11.05.2026 00:00 CEST
export const PROMO_WEEK_END_UTC = Date.UTC(2026, 4, 17, 21, 59, 59); // 17.05.2026 23:59:59 CEST

export const PROMO_WEEK_BASE_PRICE = 9900; // 99 CHF in Rappen
export const PROMO_WEEK_EXPRESS_PRICE = 2900; // 29 CHF in Rappen

export const PROMO_WEEK_LABEL = 'Aktionswoche bis 17.05.2026';

export const isPromoWeekActive = (date: Date = new Date()): boolean => {
  const t = date.getTime();
  return t >= PROMO_WEEK_START_UTC && t <= PROMO_WEEK_END_UTC;
};
