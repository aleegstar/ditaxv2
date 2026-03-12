

## Plan: Design-Bereinigung – Professionellere Fintech-Ästhetik

### Ziel
Die App soll visuell näher an Stripe, Revolut und N26 sein – ruhig, vertrauenswürdig, professionell. Keine Consumer-Lifestyle-Elemente.

### Änderungen

#### 1. Animated Background Blobs entfernen
**Dateien:** `Auth.tsx`, `SelectPerson.tsx`, `UserTaxReturns.tsx`
- Die `motion.div` Elemente mit `radial-gradient` und `repeat: Infinity` Animationen komplett entfernen
- Stattdessen einfach `bg-background` oder ein subtiles statisches `bg-muted/30`

#### 2. Liquid Glass / Frosted Glass vereinfachen
**Dateien:** `Auth.tsx`, `SelectPerson.tsx`, `UserTaxReturns.tsx`
- `backdrop-filter: blur(40px) saturate(1.8)` entfernen
- Glasige Shimmer-Overlays (`linear-gradient(135deg, hsla(0 0% 100% / 0.18)...`) entfernen
- Ersetzen durch solide `bg-card` Karten mit `border border-border` und `shadow-sm`

#### 3. Border-Radius reduzieren
**Dateien:** `Auth.tsx`, `SelectPerson.tsx`, `UserTaxReturns.tsx`
- `rounded-[2.5rem]` / `rounded-[2rem]` → `rounded-2xl` (16px)
- Konsistenter, professioneller Look

#### 4. Hover-Animationen reduzieren
**Dateien:** `UserTaxReturns.tsx`, `SelectPerson.tsx`
- `whileHover: { y: -4, scale: 1.01 }` → entfernen oder nur `shadow` Änderung
- `hover:scale-[1.015]` → `hover:shadow-md` stattdessen
- Dezente Chevron-Animationen können bleiben

#### 5. Pulse-Dot durch statisches Badge ersetzen
**Datei:** `UserTaxReturns.tsx`
- `bg-emerald-500 animate-pulse` → statisches `bg-primary` Dot ohne Animation
- Oder komplett durch Text-Badge ersetzen

#### 6. Auth-Karte vereinfachen
**Datei:** `Auth.tsx`
- Statt Glasmorphismus: solide `bg-card` Karte mit `border border-border shadow-lg`
- Innere Shimmer-Overlays entfernen

### Ergebnis
- Ruhigeres, vertrauenswürdigeres Erscheinungsbild
- Weniger visuelle Ablenkung
- Professionell wie Stripe/Revolut
- Bestehende Farbpalette (Blau/Grau) und Typography bleiben erhalten

