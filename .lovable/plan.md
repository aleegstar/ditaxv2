

# Fix: In-App Browser schliesst nicht nach Stripe-Zahlung

## Problem

Wenn auf einem mobilen Geraet (Capacitor/Despia) die Zahlung ueber Stripe/TWINT abgeschlossen wird, oeffnet `Browser.open()` einen In-App-Browser-Tab. Nach erfolgreicher Zahlung leitet Stripe zur `payment-success` URL weiter -- aber diese URL wird **innerhalb des In-App-Browsers** geladen, statt den Browser zu schliessen und zurueck zur App zu navigieren.

Es gibt keinen Listener, der erkennt, wann der In-App-Browser zur Erfolgsseite navigiert, und ihn daraufhin schliesst.

## Loesung

Einen `browserPageLoaded` Listener in `PaymentSection.tsx` registrieren, der erkennt, wenn die URL `/payment-success` enthaelt, den In-App-Browser schliesst und zur Erfolgsseite innerhalb der App navigiert.

### Aenderungen in `src/components/PaymentSection.tsx`

Nach dem Aufruf von `Browser.open()` (Zeile 242-246) wird ein Listener registriert:

```typescript
if (Capacitor.isNativePlatform()) {
  toast.info("Zahlung wird im Browser geoeffnet...");
  await Browser.open({
    url: paymentUrl,
    presentationStyle: 'fullscreen',
    toolbarColor: '#2563eb'
  });
  
  // Listen for navigation to payment-success and close the in-app browser
  const listener = await Browser.addListener('browserPageLoaded', async () => {
    // No reliable URL access from browserPageLoaded, so we also listen for browserFinished
  });
  
  // When the in-app browser is closed manually, navigate to home
  const finishListener = await Browser.addListener('browserFinished', () => {
    listener.remove();
    finishListener.remove();
    // Check if we have a pending payment success by looking at the tax return
    navigate('/');
  });
}
```

**Problem**: Capacitor's Browser plugin hat keinen Zugang zur aktuellen URL im `browserPageLoaded` Event. Deshalb ist der bessere Ansatz:

### Besserer Ansatz: Custom Scheme / Universal Link

Die `success_url` im Edge Function auf ein Custom-URL-Schema setzen (z.B. `ditax://payment-success?...`), damit das Betriebssystem die App direkt oeffnet und der In-App-Browser sich schliesst.

**Da Custom Schemes native Konfiguration erfordern**, ist der pragmatischste Fix:

### Pragmatischer Fix: `appUrlOpen` Listener erweitern

In `src/App.tsx` den bestehenden Deep-Link-Listener erweitern, um auch `payment-success` URLs zu erkennen:

```typescript
await CapacitorApp.addListener('appUrlOpen', async (event) => {
  const url = new URL(event.url);
  
  // Existing auth handling...
  
  // NEW: Handle payment success deep links
  if (url.pathname.includes('payment-success')) {
    const { Browser } = await import('@capacitor/browser');
    try { await Browser.close(); } catch {}
    const searchParams = url.searchParams.toString();
    window.location.href = `/payment-success?${searchParams}`;
    return;
  }
});
```

### Und zusaetzlich: `browserFinished` Listener in PaymentSection

Da der Deep-Link-Ansatz nicht immer greift (wenn die success_url eine normale HTTPS-URL ist), wird in `PaymentSection.tsx` nach `Browser.open()` ein `browserFinished` Listener hinzugefuegt. Wenn der User den Browser manuell schliesst oder die Seite fertig ist, pruefen wir den Payment-Status:

```typescript
if (Capacitor.isNativePlatform()) {
  await Browser.open({ url: paymentUrl, ... });
  
  const finishListener = await Browser.addListener('browserFinished', async () => {
    finishListener.remove();
    // Check if payment was completed by querying the tax return status
    const { data } = await supabase
      .from('tax_returns')
      .select('payment_status')
      .eq('id', taxReturnId)
      .single();
    
    if (data?.payment_status === 'paid') {
      navigate(`/payment-success?session_id=browser_closed&tax_year=${year}&tax_return_id=${taxReturnId}`);
    }
  });
}
```

## Betroffene Dateien

- `src/components/PaymentSection.tsx` -- `browserFinished` Listener nach `Browser.open()` hinzufuegen
- `src/App.tsx` -- Deep-Link-Listener fuer `payment-success` URLs erweitern

## Erwartetes Ergebnis

1. User zahlt ueber Stripe/TWINT im In-App-Browser
2. Nach Zahlung: Browser schliesst sich (manuell oder via Deep Link)
3. App navigiert automatisch zur Erfolgsseite mit den richtigen Parametern
4. Falls der User den Browser manuell schliesst, wird der Payment-Status aus der DB geprueft und bei Erfolg zur Erfolgsseite navigiert

