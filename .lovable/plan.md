

# Fix: Payment-Deeplink wird auf Hauptseite statt /payment-success geleitet

## Problem

Der Despia-Deeplink `ditax://oauth/payment-success?params` ignoriert den Pfad (`payment-success`) und navigiert die WebView zu `/?session_id=xxx&tax_year=xxx`. Der User landet auf dem Dashboard -- die Payment-Success-Logik wird nie ausgefuehrt.

Das steht sogar im eigenen Code dokumentiert (`src/lib/despia.ts`, Zeile 44-46):

```text
IMPORTANT: Deeplink must be exactly ditax://oauth (not ditax://oauth/auth)
because that's what's registered in Android. The path param is ignored.
Despia will navigate WebView to /?params when receiving this deeplink.
```

Fuer OAuth funktioniert das zufaellig, weil `App.tsx` die Token-Parameter (`at`/`rt`) auf JEDER Seite erkennt und die Session setzt. Fuer Payment-Params (`session_id`, `tax_year`) gibt es keine solche Erkennung.

## Loesung

In `App.tsx` bei der URL-Initialisierung pruefen, ob Payment-spezifische Parameter (`session_id` + `tax_year`) vorhanden sind. Falls ja, sofort zu `/payment-success` weiterleiten.

```text
Despia Deeplink: ditax://oauth/payment-success?session_id=xxx&tax_year=2025
--> WebView navigiert zu: /?session_id=xxx&tax_year=2025
--> App.tsx erkennt Payment-Params
--> Redirect zu: /payment-success?session_id=xxx&tax_year=2025
--> Payment-Success-Logik laeuft korrekt
```

## Aenderungen

### 1. `src/App.tsx` - Payment-Parameter-Erkennung hinzufuegen

In der `initialize`-Funktion (dort wo bereits `at`/`rt` Token-Params behandelt werden), eine zusaetzliche Pruefung einbauen:

```typescript
// Handle payment-success params (Despia ignores deeplink path)
const sessionId = url.searchParams.get('session_id');
const taxYear = url.searchParams.get('tax_year');
if (sessionId && taxYear && !window.location.pathname.includes('payment-success')) {
  const taxReturnId = url.searchParams.get('tax_return_id') || '';
  const params = new URLSearchParams({ session_id: sessionId, tax_year: taxYear });
  if (taxReturnId) params.set('tax_return_id', taxReturnId);
  window.location.href = `/payment-success?${params.toString()}`;
  return; // Stop further initialization
}
```

Diese Pruefung kommt VOR dem `setIsInitialized(true)`, sodass der Redirect sofort passiert bevor irgendeine Route gerendert wird.

## Betroffene Dateien

1. **`src/App.tsx`** -- Payment-Param-Erkennung und Redirect hinzufuegen (ca. 8 Zeilen)

Das ist alles. Keine anderen Dateien muessen geaendert werden. Die `payment-redirect` Edge Function und `PaymentSuccess.tsx` bleiben wie sie sind.

