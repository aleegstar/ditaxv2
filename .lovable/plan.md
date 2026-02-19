

## Problem

In der Edge Function `create-payment` (Zeile 462) steht:

```typescript
const paymentMethodTypes = ["card"];
```

Nur Kreditkarten werden an Stripe uebergeben. Klarna (und TWINT) fehlen komplett, unabhaengig von den Dashboard-Einstellungen.

## Loesung

Die Liste der Zahlungsmethoden um `"klarna"` erweitern.

## Technische Details

### Datei: `supabase/functions/create-payment/index.ts`

**Zeile 462 aendern von:**
```typescript
const paymentMethodTypes = ["card"];
```

**zu:**
```typescript
const paymentMethodTypes = ["card", "klarna"];
```

Den Kommentar in Zeile 461 ("TWINT temporarily disabled") entsprechend aktualisieren.

### Voraussetzungen

- Klarna muss im Stripe Dashboard aktiviert sein (ist laut dir bereits der Fall)
- Die Waehrung muss von Klarna unterstuetzt werden (CHF wird unterstuetzt)

### UI-Anpassung: `src/components/PaymentSection.tsx`

Klarna als zusaetzliche Zahlungsmethode im "Zahlungsmethoden"-Bereich anzeigen (neben TWINT, Visa, Mastercard), damit Nutzer sehen, dass Klarna verfuegbar ist.

