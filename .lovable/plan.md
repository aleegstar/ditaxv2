

## Modernisierung der Hauptseite `/` (UserTaxReturns)

### Analyse

Die Seite nutzt zwei saturierte Gradient-Blöcke (Blau für aktiv, Orange für "in Bearbeitung") die visuell konkurrieren. Für eine Fintech-App braucht es mehr Ruhe und Fokus.

### Änderungen

**Datei: `src/pages/UserTaxReturns.tsx`**

1. **Aktive Steuerjahr-Karten (unpaid):**
   - Oberer Bereich: `bg-blue-600` → Subtilerer Look mit `bg-[#1D64FF]` (Brand-Blau), Radius von `rounded-[2.5rem]` → `rounded-3xl` (24px)
   - Äussere Card: `rounded-[2.5rem]` → `rounded-3xl`, Ring/Shadow vereinfachen zu `ring-1 ring-border/60 shadow-sm`
   - Gradient `from-white to-slate-50/80` → flaches `bg-background`

2. **Bezahlte/In-Bearbeitung-Karten (paid):**
   - Orange-Gradient `from-amber-500 to-orange-500` → Neutrales `bg-slate-800` oder `bg-zinc-100` mit dunklem Text
   - Badge: `text-amber-700` → neutraler Status-Pill wie im Admin
   - Button: `bg-amber-100 text-amber-900` → `bg-foreground/[0.06] text-foreground`

3. **Abgeschlossene Karten (completed):**
   - Bereits relativ neutral (`bg-gray-100`), nur Radius anpassen auf `rounded-3xl`
   - Signature-Pending Button: Blauer Gradient-Shadow entfernen → `bg-foreground text-background`

4. **Bottom Navigation Dock:**
   - Scanner-Button: Gradient beibehalten (primäre Aktion), aber `shadow-blue` reduzieren
   - Gesamter Dock: Bestehend lassen, ist bereits clean

5. **Allgemeine Anpassungen:**
   - Alle Card-Radien einheitlich auf `rounded-3xl` (statt `rounded-[2.5rem]`)
   - Shadows vereinheitlichen: `shadow-sm` + `hover:shadow-md` statt lange custom Shadows
   - Ring: `ring-1 ring-slate-200/60` → `ring-1 ring-border/60` für Token-Konsistenz

### Nicht ändern
- Header (Logo + Avatar) — bereits clean
- Greeting Section — bereits neutral
- Bottom Dock Grundstruktur — funktioniert gut
- TaxFilerSelector — bereits modernisiert

### Ergebnis
Ruhigeres, fokussiertes Layout mit einem klaren visuellen Fokus auf die aktive Steuererklärung. Keine konkurrierenden Farben mehr. Professioneller Fintech-Look konsistent mit dem modernisierten Admin-Bereich.

