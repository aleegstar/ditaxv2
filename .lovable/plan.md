

# Fix: Zahlung wird nicht als bezahlt markiert und In-App Browser schliesst nicht

## Problem-Analyse

### Problem 1: Webhook erreicht die Edge Function nicht
- Die `stripe-webhook` Edge Function hat **keine Logs** -- sie wird von Stripe nie aufgerufen
- In der `payment_events` Tabelle gibt es seit November 2025 kein einziges `checkout.session.completed` Event
- Die Steuererklarung 2030 hat `payment_status: pending` trotz erfolgter Zahlung
- **Ursache**: Der Stripe Webhook-Endpunkt ist vermutlich nicht korrekt in Stripe konfiguriert, oder die Edge Function antwortet nicht korrekt

### Problem 2: In-App Browser schliesst nicht und Status wird nie aktualisiert
- Nach der Zahlung leitet Stripe zu `https://app.ditax.ch/payment-success` weiter
- Diese URL wird **im In-App Browser** geladen, nicht in der App
- Der `appUrlOpen` Deep Link feuert nicht, da es kein Custom URL Scheme ist
- Der `browserFinished` Listener prueft die DB, findet aber `pending` (weil Webhook fehlt)
- **Ergebnis**: User bleibt im Browser-Tab stecken, Zahlung wird nie als bezahlt markiert

## Loesung

### Teil 1: Polling-Mechanismus in PaymentSection (statt nur browserFinished)

Nach `Browser.open()` wird ein Polling-Intervall gestartet, das alle 3 Sekunden den `payment_status` in der Datenbank prueft. Sobald der Status `paid` ist (via Webhook oder PaymentSuccess-Seite), wird der Browser geschlossen und zur Erfolgsseite navigiert.

```text
Browser.open(stripeUrl)
        |
        v
  Start Polling (alle 3s)
        |
        v
  payment_status === 'paid'?
   /            \
  Ja             Nein
  |              |
  Browser.close()  Weiter Polling
  Navigate to     (max 5 Min)
  /payment-success
```

**Aenderungen in `src/components/PaymentSection.tsx`:**
- Nach `Browser.open()`: Starte ein Polling-Intervall (alle 3 Sekunden)
- Polling prueft `tax_returns.payment_status` fuer die aktuelle `taxReturnId`
- Bei `payment_status === 'paid'`: Browser schliessen, zu Erfolgsseite navigieren
- Timeout nach 5 Minuten (Polling stoppen)
- `browserFinished` Listener bleibt als Fallback, prueft aber mit 3 Retries und Verzoegerung

### Teil 2: PaymentSuccess-Seite auch im In-App Browser funktionsfaehig machen

Falls der User die Erfolgsseite im In-App Browser sieht, soll diese Seite:
- Den `payment_status` in der DB aktualisieren (das tut sie bereits)
- **Neu**: Versuchen, den In-App Browser zu schliessen via `Browser.close()` auf Capacitor
- **Neu**: Eine Nachricht anzeigen, dass der User den Browser manuell schliessen kann, falls `Browser.close()` nicht funktioniert

**Aenderungen in `src/pages/PaymentSuccess.tsx`:**
- Nach erfolgreicher Status-Aktualisierung: `Browser.close()` aufrufen (wenn Capacitor)
- Fallback-Hinweis anzeigen: "Bitte schliesse diesen Tab, um zur App zurueckzukehren"

### Teil 3: Webhook-Konfiguration pruefen

Der Webhook scheint nicht zu feuern. Moegliche Ursachen:
- Webhook URL in Stripe nicht korrekt konfiguriert
- Die URL muss sein: `https://gqbhilftduwxjszznnzy.supabase.co/functions/v1/stripe-webhook`
- Events die konfiguriert sein muessen: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.succeeded`, `payment_intent.payment_failed`

**Hinweis**: Die Webhook-Konfiguration muss im Stripe Dashboard geprueft werden. Dies kann nicht automatisch gemacht werden.

## Betroffene Dateien

1. `src/components/PaymentSection.tsx` -- Polling-Mechanismus nach Browser.open()
2. `src/pages/PaymentSuccess.tsx` -- Browser.close() Versuch + Fallback-Hinweis

## Technische Details

### Polling-Implementierung (PaymentSection.tsx)

```typescript
// Nach Browser.open():
const pollInterval = setInterval(async () => {
  if (!taxReturnId) return;
  const { data } = await supabase
    .from('tax_returns')
    .select('payment_status')
    .eq('id', taxReturnId)
    .maybeSingle();
  
  if (data?.payment_status === 'paid') {
    clearInterval(pollInterval);
    const { Browser } = await import('@capacitor/browser');
    try { await Browser.close(); } catch {}
    navigate(`/payment-success?session_id=polling&tax_year=${year}&tax_return_id=${taxReturnId}`);
  }
}, 3000);

// Timeout nach 5 Minuten
setTimeout(() => clearInterval(pollInterval), 300000);
```

### PaymentSuccess Browser-Close (PaymentSuccess.tsx)

```typescript
// Nach erfolgreicher Aktualisierung:
if (Capacitor.isNativePlatform()) {
  try {
    const { Browser } = await import('@capacitor/browser');
    await Browser.close();
  } catch {
    // Browser.close() fehlgeschlagen - Hinweis anzeigen
  }
}
```

## Wichtig: Stripe Webhook pruefen

Du musst im Stripe Dashboard pruefen, ob der Webhook korrekt konfiguriert ist:
1. Gehe zu https://dashboard.stripe.com/webhooks
2. Pruefe ob ein Endpoint fuer `https://gqbhilftduwxjszznnzy.supabase.co/functions/v1/stripe-webhook` existiert
3. Falls nicht, erstelle einen neuen Webhook mit dieser URL
4. Aktiviere die Events: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.succeeded`, `payment_intent.payment_failed`
5. Kopiere das Webhook Secret und stelle sicher, dass es mit dem `STRIPE_WEBHOOK_SECRET` in den Edge Function Secrets uebereinstimmt

