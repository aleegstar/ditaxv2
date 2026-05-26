## Problem

Auf `/payment-success` flackert die Seite beim Laden und der Erfolgs-Zustand wirkt nicht stimmig:

1. **Flicker zwischen Loading- und Success-State**
   - Loading nutzt `bg-gradient-to-b from-white via-white to-blue-50/50` + PNG-Logo (`/lovable-uploads/8eb…png`)
   - Success nutzt `bg-background` (warmes Off-White) + SVG-Logo (`/ditax-logo-new.svg`)
   - Beim Wechsel springen Hintergrundfarbe, Logo-Datei, Logo-Höhe und Layout-Container (Spinner mittig → 2-Spalten-Card) → sichtbares Flackern.

2. **PageTransition + interner Loader doppelt**
   - `PageTransition` fadet die Route bereits ein (0.15s). Zusätzlich rendert `PaymentSuccess` zuerst einen Vollbild-Spinner und ersetzt ihn dann hart durch die Erfolgs-Card → zweiter, abrupter Wechsel.

3. **Hero-Bild lädt asynchron** – Das `paymentSuccessHero` PNG poppt nach der Card auf, weil weder Skeleton noch reservierter Aspect-Ratio-Slot vorhanden ist.

4. **Confetti-Trigger** feuert direkt beim ersten Render des Success-States; wenn Bild noch lädt, wirkt es unsynchron.

## Lösung (nur Frontend / Präsentation)

### `src/pages/PaymentSuccess.tsx`

- **Einheitlicher Hintergrund**: Loading- und Error-State auf denselben `bg-background` umstellen wie der Success-State. Den blauen Gradient entfernen.
- **Einheitliches Logo**: Im Loading-State `/ditax-logo-new.svg` in `h-7` verwenden (statt PNG `h-8`), identisch zur Success-Ansicht.
- **Loader als Skeleton statt Vollbild-Spinner**:
  - Direkt das Card-Grid-Gerüst (2-Spalten, gleiche Border/Radius/Shadow) rendern.
  - Linke Spalte: Skeleton-Block in identischer `min-h-[560px]`/`h-64` Größe (kein Hero-Bild-Pop-in).
  - Rechte Spalte: Skeleton-Zeilen für Titel, Text, zwei Status-Reihen und zwei Buttons.
  - Kleiner zentraler Spinner nur als dezenter Indikator oben rechts in der rechten Spalte (z. B. 16 px in `text-muted-foreground`), damit klar ist, dass etwas passiert — aber keine Layout-Verschiebung beim Wechsel.
- **Smoother Übergang** zwischen Skeleton und Inhalt: einfache CSS-Opacity-Transition (200 ms) auf der rechten Spalten-Content-Container; Hero-Bild via `onLoad` einblenden (`opacity-0` → `opacity-100`, 300 ms) statt sofort.
- **Confetti** erst feuern, wenn `taxYear` gesetzt UND Hero-Bild geladen ist (`onLoad`-Callback + Ref-Guard), damit Effekt synchron zur sichtbaren Card erscheint.
- **Error-State**: ebenfalls `bg-background` + SVG-Logo, gleicher Container-Stil wie Success (zentrierte Card, `rounded-3xl`, `border`), damit der Wechsel vom Skeleton dorthin nicht mehr springt.

### Keine Änderungen
- An `PageTransition`, Routing, `updatePaymentStatus`-Business-Logik, Supabase-Calls, Confetti-Library oder Stripe-Flow.
- An anderen Seiten/Components.

## Technische Details

- Skeletons via `bg-muted/60 animate-pulse` + bestehende Token (`bg-card`, `border-border`).
- Hero-Bild: `<img className="opacity-0 transition-opacity duration-300" onLoad={e => e.currentTarget.classList.replace('opacity-0','opacity-100')} />` (oder State-basiert).
- Spinner-Mini-Indikator: bestehende Inline-Border-Spinner-Klasse, `w-4 h-4`, `text-muted-foreground`.
- Keine neuen Dependencies, keine neuen Files.

## Akzeptanzkriterien

- Kein Hintergrund-/Logo-Wechsel zwischen Lade- und Erfolgs-Zustand.
- Card-Geometrie ist von der ersten Frame an stabil; Inhalt fadet sanft ein.
- Hero-Bild poppt nicht auf, sondern fadet ein.
- Confetti erscheint erst, wenn Card vollständig sichtbar ist.
- Error-State nutzt denselben Card-Rahmen wie Success.
