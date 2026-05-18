
# Bulk-Upload Review: Vorschau-basierter Einzel-Flow

## Ziel
Im Review-Schritt sieht der User pro Datei eine grosse Vorschau (Bild oder erste PDF-Seite) mit einem Dropdown zur Zuordnung. Nach der Auswahl geht es automatisch zum nächsten Dokument. Am Ende kommt eine kurze Übersicht und der Upload-Button.

## UI-Konzept

```text
┌─────────────────────────────────────────┐
│  Dokument 2 von 5            [Überspringen] │
├─────────────────────────────────────────┤
│                                         │
│         [ GROSSE VORSCHAU ]             │
│        (Bild / PDF Seite 1)             │
│                                         │
├─────────────────────────────────────────┤
│  Dateiname.pdf · 1.2 MB                 │
│  Vorschlag: Lohnausweis (82%)           │
│                                         │
│  Zuordnen zu:                           │
│  [ Dropdown: offene Unterlagen ▾ ]      │
│                                         │
│  [ Zurück ]      [ Weiter → ]           │
└─────────────────────────────────────────┘
       ● ● ○ ○ ○   (Schritt-Indikator)
```

Nach der letzten Datei: kompakte Zusammenfassung (Datei → zugeordnete Kategorie, „Ändern"-Link pro Zeile) plus „Hochladen"-Button. Nicht zugeordnete Dateien werden gelistet und können übersprungen oder vor Upload doch noch zugeordnet werden.

## Verhalten

- Auto-Advance: Sobald eine Kategorie im Dropdown gewählt wird, springt der Flow nach ~250 ms zum nächsten Dokument.
- „Überspringen" markiert die Datei als unzugeordnet und geht weiter.
- „Zurück" / „Weiter" navigiert manuell zwischen den Dateien.
- OCR-Vorschlag erscheint mit Konfidenz-Badge und kann per Klick übernommen werden.
- Der bisherige Drag-&-Drop-Bereich entfällt im Standard-Review (User wollte ihn nicht); er bleibt höchstens als Fallback in der Endübersicht (kein Muss).

## Vorschau-Generierung

- Bilder (`image/*`): `URL.createObjectURL(file)`, beim Unmount/Wechsel revoken.
- PDFs: Seite 1 über bereits geladene `window.pdfjsLib` (via `ensurePdfJsLoaded`) auf Canvas rendern, als DataURL cachen. Cache pro Datei-ID, damit Navigation nicht neu rendert.
- Fehlerfall: generisches Datei-Icon mit Dateinamen.

## Betroffene Dateien

- `src/pages/BulkDocumentUpload.tsx` – Review-Stage komplett ersetzen: neuer `currentIndex`-State, grosse Vorschau-Karte, Dropdown, Auto-Advance, Endübersicht.
- Neue kleine Komponente `src/components/documents/BulkPreviewCard.tsx` für die Vorschau-Generierung (Bild + PDF-Erste-Seite Rendering, Caching, Loading-State).
- Keine Änderungen an `BulkClassificationService`, `DocumentValidator` oder Upload-Logik – nur Review-UI.

## Was unverändert bleibt

- Drop-Stage, Analyse-Stage, Upload-Logik, Verschlüsselung, fehlende-Unterlagen-Stage nach Upload.
- OCR-Pipeline und Vorschlagsberechnung.

## Validierung

- Mehrere PDFs + Bilder hochladen → pro Datei grosse Vorschau sichtbar.
- Dropdown-Auswahl → automatisch nächstes Dokument.
- Letzte Datei → Übersicht mit Upload-Button.
- Übersprungene Dateien tauchen in Übersicht als „nicht zugeordnet" auf und blockieren Upload nicht.
