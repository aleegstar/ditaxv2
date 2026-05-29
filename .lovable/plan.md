## Ziel
Stripe-Zahlung wieder funktionsfähig machen, indem `STRIPE_SECRET_KEY` und `STRIPE_WEBHOOK_SECRET` neu hinterlegt werden.

## Schritte
1. `secrets--update_secret` für `STRIPE_SECRET_KEY` und `STRIPE_WEBHOOK_SECRET` aufrufen → öffnet das sichere Eingabeformular.
2. Du gibst die korrekten **Live**-Werte aus dem Stripe Dashboard ein:
   - `STRIPE_SECRET_KEY` → muss mit `sk_live_…` beginnen
   - `STRIPE_WEBHOOK_SECRET` → `whsec_…` vom Live-Webhook-Endpoint `/functions/v1/stripe-webhook`
3. Nach dem Speichern: kurzen Smoke-Test via Aufruf von `create-payment` und Prüfen der Edge-Function-Logs auf `mode=live, key_prefix=sk_live_`.

## Hinweise
- `PENTEST_MODE` ist bereits auf `false` — Side-Effects sind aktiv.
- Falls nur der Webhook das Problem ist (Events werden nicht verarbeitet), reicht das Webhook-Secret allein.
- Keine Code-Änderungen nötig — reine Secret-Rotation.

Soll ich nur den `STRIPE_SECRET_KEY`, nur den `STRIPE_WEBHOOK_SECRET` oder beide gleichzeitig anfordern?