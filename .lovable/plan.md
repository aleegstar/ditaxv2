## Aktionswoche 11.05.–17.05.2026

### Ziel
Während der Aktionswoche (Mo 11.05.2026 00:00 – So 17.05.2026 23:59, Europe/Zurich) gilt für jede neue Steuererklärung ein Pauschalpreis von **CHF 100**, unabhängig von Einkommen, Abzügen, Vermögen oder Anzahl Felder. Der **Express-Service** kostet in derselben Woche pauschal **CHF 20** statt CHF 100.

### Umfang
1. **Zentrale Promo-Konfiguration** (neue Datei `src/config/promoWeek.ts`)
   - Konstanten: Startzeitpunkt, Endzeitpunkt (Europe/Zurich), Basispreis (10'000 Rp.), Express (2'000 Rp.).
   - Helper `isPromoWeekActive(date?: Date)` – berechnet Schweizer Zeit korrekt (auch wenn Browser/Server in anderer Zone).
   - Re-Export einer Deno-kompatiblen Variante für Edge Functions (Konstanten dupliziert in `supabase/functions/_shared/promoWeek.ts` oder inline in `create-payment`, da Edge Functions nicht auf `src/` zugreifen können).

2. **Frontend-Preisberechnung** (`src/utils/priceCalculator.ts`)
   - Vor der bestehenden Logik prüfen: ist `isPromoWeekActive()` true?
   - Wenn ja: Rückgabe eines `PriceBreakdown` mit `basePrice = 10'000`, alle Zuschläge/Abzüge = 0, `expressService = 2'000` falls aktiviert, einziges Item „Aktionswoche – Pauschalpreis" + optional „Express-Service Aktion".
   - Alle bestehenden Konsumenten (`ResultStep`, `usePriceCalculator`, `TaxReturnActions`, `UserTaxReturns`) erhalten dadurch automatisch den korrigierten Preis.

3. **UI-Hinweis im Preisrechner** (`src/components/price-calculator/ResultStep.tsx`)
   - Glassmorpher Banner oben (semantische Tokens), nur sichtbar wenn `isPromoWeekActive()`.
   - Text: „Aktionswoche bis 17.05.2026 – Steuererklärung pauschal CHF 100, Express CHF 20."
   - Dezent, im bestehenden Stil (rounded-2xl, `bg-white/60 backdrop-blur-xl border border-white/40`).
   - Kein Banner auf Dashboard / anderen Seiten.

4. **Server-seitige Erzwingung** (`supabase/functions/create-payment/index.ts`)
   - Direkt nach Eingangsvalidierung: Wenn `isPromoWeekActive()` für `new Date()` true ist, **überschreibt** die Function den vom Client gesendeten `amount`:
     - `enforcedAmount = 10'000 + (expressService ? 2'000 : 0)` Rappen.
     - Auch `items` werden serverseitig durch zwei feste Items ersetzt, damit Quittung/Stripe-Description konsistent bleibt.
     - Loggt einen Hinweis `Promo week price enforced`.
   - Verhindert clientseitige Manipulation: selbst wenn der Browser einen anderen Betrag schickt, wird der Aktionspreis verwendet.
   - Promo-Codes (Referral 20 CHF Rabatt) werden nach der Pauschalisierung normal verrechnet – Reihenfolge wird beibehalten, damit Rabatt = `min(promoAmount, enforcedAmount)`.

5. **Memory-Update**
   - Eintrag `mem://features/promo-week-may-2026` mit Eckdaten und Server-Enforcement-Hinweis, plus Verweis im Index.

### Technische Details

**Zeitfenster-Logik (Europe/Zurich)**
```ts
const START_UTC = Date.UTC(2026, 4, 10, 22, 0, 0); // 11.05.2026 00:00 CEST (UTC+2)
const END_UTC   = Date.UTC(2026, 4, 17, 21, 59, 59); // 17.05.2026 23:59:59 CEST
export const isPromoWeekActive = (d = new Date()) => {
  const t = d.getTime();
  return t >= START_UTC && t <= END_UTC;
};
```
(Mai = Sommerzeit CEST = UTC+2, daher fix kodiert – kein DST-Edge-Case innerhalb der Woche.)

**Promo-Breakdown**
```ts
{
  basePrice: 10000,
  incomeAdditional: 0,
  deductionsDiscount: 0,
  assetsAdditional: 0,
  expressService: expressService ? 2000 : 0,
  totalPrice: 10000 + (expressService ? 2000 : 0),
  items: [
    { label: "Steuererklärung (Aktionswoche)", amount: 10000 },
    ...(expressService ? [{ label: "Express-Service (Aktionswoche)", amount: 2000 }] : []),
  ],
}
```

**Edge Function Override (Pseudocode nach Zod-Validation)**
```ts
if (isPromoWeekActive()) {
  const enforced = 10000 + (expressService ? 2000 : 0);
  if (amount !== enforced) logStep("Promo week price enforced", { sent: amount, enforced });
  amount = enforced;
  items = [
    { label: "Steuererklärung (Aktionswoche)", amount: 10000 },
    ...(expressService ? [{ label: "Express-Service (Aktionswoche)", amount: 2000 }] : []),
  ];
}
```

### Nicht enthalten
- Keine Änderung an bereits bezahlten Steuererklärungen (rückwirkend gibt es keine Anpassung).
- Kein Banner auf Dashboard, Tax Year Cards oder Marketing-Seiten.
- Kein Admin-Toggle – Zeitfenster ist fix im Code.
