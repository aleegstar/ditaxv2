

# Fix: PaymentSuccess wird im In-App Browser zum Login umgeleitet

## Problem

Die Route `/payment-success` ist mit `ProtectedRoute` geschuetzt (Zeile 266 in `App.tsx`). Wenn Stripe nach der Zahlung zur Erfolgsseite weiterleitet, geschieht das **im In-App Browser** -- dort existiert keine Supabase Auth-Session. Der `ProtectedRoute`-Guard leitet deshalb sofort zu `/auth` weiter, bevor die PaymentSuccess-Seite ihre Logik ausfuehren kann.

## Loesung

### Schritt 1: `ProtectedRoute` von `/payment-success` entfernen

In `src/App.tsx` wird die Route von:
```
<Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
```
geaendert zu:
```
<Route path="/payment-success" element={<PaymentSuccess />} />
```

### Schritt 2: PaymentSuccess-Seite fuer den In-App Browser anpassen

In `src/pages/PaymentSuccess.tsx` wird die Logik angepasst:

- Wenn auf einer nativen Plattform (Capacitor) und **keine Auth-Session** vorhanden ist:
  - Sofort versuchen, den In-App Browser via `Browser.close()` zu schliessen
  - Keine DB-Aktualisierung versuchen (das uebernimmt der Webhook oder das Polling in PaymentSection)
  - Falls `Browser.close()` fehlschlaegt: Hinweis anzeigen "Bitte schliesse diesen Tab"
- Wenn Auth-Session vorhanden ist (normaler Web-Browser): Wie bisher DB aktualisieren und Erfolgsseite anzeigen

### Warum das funktioniert

```text
Stripe Zahlung abgeschlossen
        |
        v
  Redirect zu /payment-success (im In-App Browser)
        |
        v
  Kein ProtectedRoute mehr --> PaymentSuccess laedt
        |
        v
  Capacitor erkannt + keine Auth?
   /            \
  Ja             Nein (Web-Browser mit Auth)
  |              |
  Browser.close()  DB Update wie bisher
  |              |
  Polling in      Erfolgsseite anzeigen
  PaymentSection
  erkennt 'paid'
  --> navigiert zu
  /payment-success
  (in der App, mit Auth)
```

## Betroffene Dateien

1. **`src/App.tsx`** -- `ProtectedRoute` von `/payment-success` Route entfernen (1 Zeile)
2. **`src/pages/PaymentSuccess.tsx`** -- Fruehe Browser-Schliessung wenn keine Auth auf nativer Plattform

## Technische Details

### PaymentSuccess.tsx - Neue Logik am Anfang von `updatePaymentStatus`:

```typescript
// On native platform without auth, just close the browser
// The polling in PaymentSection will handle navigation
if (Capacitor.isNativePlatform()) {
  const user = await waitForAuth(2); // Quick check, only 2 retries
  if (!user) {
    // No auth in in-app browser - just close it
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.close();
    } catch {
      setShowBrowserCloseHint(true);
      setLoading(false);
    }
    return; // Don't try DB update without auth
  }
}
```

Dies stellt sicher, dass:
- Der In-App Browser sich sofort schliesst nach der Zahlung
- Das Polling in PaymentSection den Status erkennt und zur Erfolgsseite navigiert (innerhalb der App, mit Auth)
- Im normalen Web-Browser alles wie bisher funktioniert

