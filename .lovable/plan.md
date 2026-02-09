

# Dokumenten-Checkliste modernisieren

## Ziel
Die Dokumenten-Checkliste visuell an das bestehende App-Design angleichen: cleaner weisser Hintergrund, subtile Karten mit Borders statt farbigen Backgrounds, einheitliche Typografie und bessere visuelle Hierarchie -- analog zur Profilseite und anderen Subpages.

## Aenderungen

### 1. Progress-Sektion neu gestalten
- Aktuell: `bg-slate-50/80 ring-1 ring-slate-200/50` -- wirkt flach
- Neu: `bg-white border border-slate-200 shadow-sm rounded-2xl` -- passend zum Card-Stil der App
- Fortschrittsbalken: schlankere `h-1` Hoehe mit abgerundeten Enden
- Abgeschlossen-Zustand: dezentes `border-emerald-200 bg-emerald-50/50` statt vollem `bg-emerald-50/80`

### 2. Kategorie-Collapsibles ueberarbeiten
- Aktuell: `bg-slate-50/80 rounded-2xl` -- zu wenig Kontrast
- Neu: `bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow`
- Expanded Header: statt `bg-slate-100/50` ein subtileres `border-b border-slate-100`
- Icon-Badges: konsistente `w-9 h-9 rounded-xl` mit `bg-slate-100` (offen) bzw. Farbcodes (abgeschlossen)

### 3. Einzel-Dokumenten-Items verfeinern
- Aktuell: `ring-1 ring-slate-200/60` -- ring statt border
- Neu: `bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors`
- Upload-Button: `bg-primary` bleibt, aber mit `shadow-sm` und feinerer Hoehe (`h-9`)
- Erforderlich-Badge: dezentere Gestaltung mit `bg-amber-50 text-amber-600 border border-amber-200`
- Hochgeladene Dokumente: Trennlinie `border-slate-100` bleibt, aber Actions erhalten `rounded-lg hover:bg-slate-50`

### 4. Completion-Dialog anpassen
- Buttons-Reihenfolge tauschen: primaerer CTA-Button oben, sekundaerer unten (konsistent mit dem Rest der App)

### 5. Leerzustand verbessern
- Zentrierter Text mit Icon und klarerem Spacing
- Button im Primary-Stil mit `rounded-xl` statt default

## Technische Details

Nur eine Datei wird bearbeitet: `src/components/DocumentChecklist.tsx`

Hauptaenderungen sind CSS-Klassen-Swaps:
- `bg-slate-50/80` wird zu `bg-white border border-slate-200 shadow-sm`
- `ring-1 ring-*` wird zu `border border-*`
- Konsistente `rounded-2xl` fuer Karten, `rounded-xl` fuer innere Elemente
- Hover-States mit `transition-all` oder `transition-colors`

Keine neuen Abhaengigkeiten oder Komponenten noetig.

