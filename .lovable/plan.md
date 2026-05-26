## Ziel

In der Despia-App nicht mehr Stripe Checkout im OAuth-Browser öffnen, sondern das **native Stripe Payment Sheet** über `despia('stripe://payment?...')` anzeigen. Web-Flow (Checkout Session) bleibt unverändert.

## Voraussetzungen

- Neuer Secret: **`STRIPE_PUBLISHABLE_KEY`** (muss zum bestehenden `STRIPE_SECRET_KEY` passen — test↔test, live↔live). Wird via `add_secret` angefordert.

## Backend: neue Edge Function `create-payment-intent`

Eigene Function (nicht in `create-payment` mischen, damit Web-Checkout stabil bleibt). Wiederverwendung der bestehenden Logik aus `create-payment`:

- Auth via `getClaims` / Bearer-Token
- Zod-Validierung der Inputs (`taxYear`, `amount`, `items`, `expressService`, `taxReturnId`, `taxFilerId`, `promoCodeId`)
- **Aktionswoche-Enforcement** (CHF 100 + Express CHF 20, identisch zur aktuellen Funktion)
- Stripe-Customer lookup/create + Adress-/Profil-Prefill (gleiche Logik wie heute)
- Promo-Code-Handling: serverseitig Rabatt aus `promoCodeId` auflösen (Stripe `promotionCodes.retrieve` → `coupon.percent_off` / `amount_off`) und auf `amount` anwenden, da PaymentIntents keine `discounts` wie Checkout Sessions unterstützen
- **Ephemeral Key** erstellen (`stripe.ephemeralKeys.create({ customer }, { apiVersion: '2024-06-20' })`) für Saved Cards
- `stripe.paymentIntents.create({ amount, currency: 'chf', customer, automatic_payment_methods: { enabled: true }, metadata: { userId, taxYear, taxReturnId, taxFilerId, expressService, requestId } })`
- `tax_returns` mit `payment_intent_id`, `express_service` und `payment_status='pending'` updaten
- Response: `{ client_secret, publishable_key: STRIPE_PUBLISHABLE_KEY, customer_id, ephemeral_key_secret, payment_intent_id, requestId }`

Bestehender `stripe-webhook` behandelt `payment_intent.succeeded` bereits → keine Änderung nötig.

## Frontend: `PaymentSection.tsx`

`handlePayment` verzweigt schon zwischen Despia und Web. Despia-Zweig komplett ersetzen:

1. Beim Mount in Despia-Umgebung einmalig `window.stripeEvent = …` setzen (in `useEffect`, mit Cleanup, damit kein Doppel-Handler entsteht)
2. Statt `supabase.functions.invoke('create-payment', …)` → `invoke('create-payment-intent', …)`
3. `triggerDespiaOAuth(paymentUrl)` ersetzen durch:
   ```ts
   despia(`stripe://payment?publishable_key=${pk}&payment_intent_client_secret=${cs}&customer_id=${cid}&ephemeral_key_secret=${ek}&theme=light&accent_color=1E3A5F&corner_radius=16&action_corner_radius=16`)
   ```
   (Branding: Ditax-Navy `#1E3A5F`, Radius passt zum App-Style)
4. `window.stripeEvent` Handling:
   - `status === 'completed'` → `tax_returns`-Polling (max 60s) bis `payment_status='paid'` (Webhook bestätigt), dann `navigate('/payment-success?…')`
   - `status === 'canceled'` → Toast „Zahlung abgebrochen", `setIsLoading(false)`
   - `status === 'failed'` → Toast mit `event.error`, `setIsLoading(false)`
5. Polling-Fallback (3s Intervall, 5 min Timeout) auch hier, falls `stripeEvent` nie feuert
6. Cleanup-Hook: bei Unmount `window.stripeEvent = undefined`

## Helper in `src/lib/despia.ts`

Neuer typisierter Wrapper:

```ts
export type StripeEvent =
  | { method: 'paymentSheet'; status: 'completed' }
  | { method: 'paymentSheet'; status: 'canceled' }
  | { method: 'paymentSheet'; status: 'failed'; error: string };

export const triggerDespiaStripePaymentSheet = (params: {
  publishableKey: string;
  clientSecret: string;
  customerId?: string;
  ephemeralKeySecret?: string;
  theme?: 'light' | 'dark' | 'automatic';
  accentColor?: string;       // hex ohne #
  cornerRadius?: number;
  actionCornerRadius?: number;
}) => void;
```

inkl. `declare global { interface Window { stripeEvent?: (e: StripeEvent) => void } }`.

## Was nicht geändert wird

- Web-Flow (Stripe Checkout) und `create-payment` Function
- `payment-redirect` Function (bleibt für ältere App-Versionen aktiv)
- `stripe-webhook`, `payment_status`-Logik, `PaymentSuccess`-Seite
- UI-Design der PaymentSection — nur die `handlePayment`-Logik wird ersetzt

## Risiken / Hinweise

- Apple/Google verbieten Stripe für **digitale Güter** in Apps. Steuerberatung = real-world service → laut Despia-Doku zulässig (Kategorie „performed by a human, fulfilled outside the app"). Trotzdem vor App-Store-Submission verifizieren.
- `STRIPE_PUBLISHABLE_KEY` muss exakt zum Secret-Mode passen, sonst SDK-Fehler „invalid client secret".
- Promo-Code-Rabatt wird im neuen Flow serverseitig auf `amount` angewendet — Diskrepanz zu Checkout (dort als Stripe-Promotion-Code) ist akzeptabel, da identischer Endbetrag.
