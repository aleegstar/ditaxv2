

# Fix: In-App Browser mit Despia-Funktionen oeffnen und schliessen

## Problem

Aktuell wird `Capacitor Browser.open()` verwendet, um Stripe Checkout zu oeffnen. Das funktioniert nicht zuverlaessig in der Despia-Umgebung, weil:
- `Browser.close()` hat keinen Effekt im Chrome Custom Tab
- `Capacitor.isNativePlatform()` gibt `false` zurueck in Despia
- Die `/payment-success` Seite im Browser hat keine Auth-Session
- Der User bleibt im Browser-Tab stecken

## Loesung: Despia OAuth-Mechanismus fuer Stripe nutzen

Despia hat bereits einen eingebauten Mechanismus fuer Browser-Sessions:
- `despia('oauth://?url=...')` oeffnet den sicheren Browser (ASWebAuthenticationSession auf iOS, Chrome Custom Tab auf Android)
- `{scheme}://oauth/{path}?params` schliesst den Browser automatisch und navigiert die WebView zu `/{path}?params`

Wir nutzen diesen Mechanismus fuer den Stripe-Payment-Flow:

```text
1. PaymentSection: despia('oauth://?url=stripeCheckoutUrl')
   --> Oeffnet Stripe in sicherem Browser

2. Nach Zahlung: Stripe redirected zu success_url
   --> success_url zeigt auf eine Edge Function (payment-redirect)

3. Edge Function: Redirected zu ditax://oauth/payment-success?params
   --> Browser schliesst automatisch
   --> WebView navigiert zu /payment-success?params

4. PaymentSuccess: Laedt IN der WebView (mit Auth!)
   --> Kann DB updaten, Erfolgsseite anzeigen
```

## Aenderungen

### 1. Neue Edge Function: `payment-redirect`

Eine minimale HTML-Seite (wie `auth-ios-bridge`), die:
- Die Query-Parameter (`session_id`, `tax_year`, `tax_return_id`) ausliest
- Zu `ditax://oauth/payment-success?session_id=xxx&tax_year=xxx&tax_return_id=xxx` redirected
- Dadurch den Browser schliesst und zur App zurueckkehrt

### 2. `supabase/functions/create-payment/index.ts`

Wenn der Request aus der Despia-App kommt (neuer Parameter `isDespia: true`), wird die `success_url` auf die Edge Function `payment-redirect` gesetzt statt direkt auf `/payment-success`:

- Despia: `success_url` = `https://...supabase.co/functions/v1/payment-redirect?session_id=...&tax_year=...&tax_return_id=...&scheme=ditax`
- Web: `success_url` bleibt wie bisher (`{origin}/payment-success?...`)

### 3. `src/components/PaymentSection.tsx`

Im Despia-Umfeld:
- `isDespia: true` im Request-Payload mitsenden
- `despia('oauth://?url=stripeUrl')` statt `Browser.open()` verwenden
- Polling bleibt als Fallback bestehen
- Kein `browserFinished` Listener noetig (Despia schliesst den Browser automatisch)

Im Web-Browser: Keine Aenderung (bleibt `window.location.href`).

### 4. `src/pages/PaymentSuccess.tsx`

- Entfernung der `Capacitor.isNativePlatform()` Logik (nicht mehr noetig)
- Die Seite laeuft jetzt immer in der WebView mit Auth-Session
- Normaler DB-Update-Flow wie im Web

## Betroffene Dateien

1. **`supabase/functions/payment-redirect/index.ts`** -- Neue Edge Function (wie auth-ios-bridge)
2. **`supabase/functions/create-payment/index.ts`** -- success_url anpassen wenn isDespia
3. **`src/components/PaymentSection.tsx`** -- Despia oauth:// statt Browser.open()
4. **`src/pages/PaymentSuccess.tsx`** -- Vereinfachen, Capacitor-Logik entfernen
5. **`supabase/config.toml`** -- payment-redirect Function registrieren

## Technische Details

### payment-redirect Edge Function

```typescript
// Liest query params und redirected zu Deeplink
const scheme = url.searchParams.get('scheme') || 'ditax';
const sessionId = url.searchParams.get('session_id') || '';
const taxYear = url.searchParams.get('tax_year') || '';
const taxReturnId = url.searchParams.get('tax_return_id') || '';

// HTML-Seite die zu Deeplink redirected
// ditax://oauth/payment-success?session_id=xxx&tax_year=xxx&tax_return_id=xxx
// --> Browser schliesst, WebView navigiert zu /payment-success?...
```

### PaymentSection.tsx - Despia Flow

```typescript
if (isDespiaNative()) {
  // Despia: open via oauth:// protocol
  toast.info("Zahlung wird geoeffnet...");
  triggerDespiaOAuth(paymentUrl);
  
  // Polling bleibt als Fallback
  startPolling(taxReturnId);
} else if (Capacitor.isNativePlatform()) {
  // Capacitor fallback (falls jemals ohne Despia)
  await Browser.open({ url: paymentUrl, ... });
} else {
  // Web
  window.location.href = paymentUrl;
}
```

### create-payment success_url

```typescript
// Wenn Despia, redirect ueber Edge Function
const successUrl = isDespia
  ? `${supabaseUrl}/functions/v1/payment-redirect?session_id={CHECKOUT_SESSION_ID}&tax_year=${taxYear}&tax_return_id=${taxReturnId}&scheme=ditax`
  : `${appOrigin}/payment-success?session_id={CHECKOUT_SESSION_ID}&tax_year=${taxYear}${taxReturnId ? `&tax_return_id=${taxReturnId}` : ''}`;
```

## Warum das funktioniert

- Despia erkennt den `oauth/` Prefix im Deeplink und schliesst den Browser automatisch
- Die WebView navigiert zu `/payment-success?params` -- dort existiert die Auth-Session
- Funktioniert auf iOS (ASWebAuthenticationSession) und Android (Chrome Custom Tabs)
- Kein manuelles Browser-Schliessen noetig
- Der gleiche Mechanismus wird bereits erfolgreich fuer OAuth Login verwendet

