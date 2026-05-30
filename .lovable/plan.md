## Problem

Nach erfolgreichem nativen Stripe-Sheet siehst du für ~3 Sekunden die Bezahlseite mit „Lädt…"-Button — das ist das Flackern. Ursache: In `PaymentSection.tsx` (Zeile 356–360) wartet der `stripeEvent`-Handler nach `status === 'completed'` zuerst auf `pollPaymentStatus` (Intervall 3 s), bevor er auf `/payment-success` navigiert. In dieser Wartezeit schliesst Despia das Payment-Sheet → die darunterliegende `PaymentSection` wird wieder sichtbar → erst nach dem nächsten DB-Poll wird genavigiert. Das erzeugt das sichtbare „Aufblitzen" der alten Seite.

Da der Stripe-Webhook jetzt zuverlässig läuft und `PaymentSuccess.tsx` ohnehin selbst noch ein Update als Fallback durchführt, ist das Polling in `PaymentSection` redundant — und genau die Ursache des Flackerns.

## Fix

**Eine Änderung in `src/components/PaymentSection.tsx`** (Block ab Zeile 353 — `window.stripeEvent` Handler):

- `status === 'completed'` → **sofort** auf `/payment-success?...` navigieren, kein `pollPaymentStatus` mehr im Native-Flow.
- Optional: einen kurzen „Zahlung erfolgreich"-Toast auslösen statt „Zahlung wird bestätigt…".

```text
Vorher:  Sheet schliesst → PaymentSection sichtbar (3 s, „Lädt…") → navigate
Nachher: Sheet schliesst → navigate sofort → PaymentSuccess-Skeleton → Inhalt
```

Das Skeleton/Hero-Fade-In von `PaymentSuccess.tsx` ist bereits sauber gestaffelt (Zeilen 153–280) — ohne Zwischenstopp auf der Bezahlseite gibt es kein Flackern mehr.

## Was nicht angefasst wird

- `pollPaymentStatus` bleibt im Code stehen (kann später für Web-Fallback noch nützlich sein), wird im Native-Flow aber nicht mehr aufgerufen.
- `PaymentSuccess.tsx`, `payment-redirect`, `create-payment-intent`, `stripe-webhook`: keine Änderung — Webhook funktioniert bereits, der Status ist bei Ankunft auf `/payment-success` in aller Regel schon `paid`.

## Verifikation

1. Testzahlung in der Despia-App mit Promo-Code.
2. Nach „Bezahlen"-Tap im Stripe-Sheet: Sheet schliesst → **direkt** Success-Screen mit Hero-Bild, **kein** Aufblitzen der Bezahlseite.
3. Im Hintergrund: `stripe-webhook` Log zeigt `Tax return marked as paid`, Jahr in der Übersicht als bezahlt markiert.
