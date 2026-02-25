

## Analyse

Ja, der **ImportWizard** hat dasselbe Problem. Seine Buttons in beiden Schritten (Import-Frage und Änderungen-Frage) haben kein `touch-action: manipulation` und kein `WebkitTapHighlightColor: 'transparent'`. Da der ImportWizard ebenfalls einen Vaul-Drawer mit Spring-Animation nutzt, können auf iOS dieselben Touch-Target-Verschiebungen auftreten.

Das **DocumentUploadSheet** hat `touch-action: manipulation` bereits auf seinen Buttons — dort besteht das Problem also nicht.

### Betroffene Buttons im ImportWizard

**Schritt 1** (Zeilen 163-170):
- "Daten aus {previousYear} übernehmen" — `Button` ohne touch-action
- "Neu eingeben" — `Button` ohne touch-action

**Schritt 2** (Zeilen 196-203):
- "Nein, keine Änderungen" — `Button` ohne touch-action
- "Ja, ich möchte Änderungen vornehmen" — `Button` ohne touch-action

### Plan

`src/components/forms/ImportWizard.tsx` — Allen 4 Buttons `style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}` hinzufügen:

- Zeile 163: `<Button className="w-full" onClick={handleImportClick} ...>` → add style
- Zeile 167: `<Button variant="secondary" className="w-full" onClick={handleSkipImport} ...>` → add style
- Zeile 196: `<Button className="w-full" onClick={handleNoChanges} ...>` → add style
- Zeile 200: `<Button variant="secondary" className="w-full" onClick={handleWithChanges} ...>` → add style

Eine einzelne Datei, 4 einfache Änderungen.

