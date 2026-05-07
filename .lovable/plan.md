## Ziel

Nutzer sollen keine Steuerjahre mehr selbst hinzufügen können. Aktuell sind nur **2024** und **2025** verfügbar. Ab dem 01.01.2026 wird **2026** automatisch freigeschaltet. In der Dokumentensammlung wird die Auswahl ebenfalls auf die freigeschalteten Jahre beschränkt (kein 2026/2027/… mehr wählbar vor Freigabe).

## Zentrale Logik (Single Source of Truth)

Neue Hilfsdatei `src/config/availableTaxYears.ts`:

- Exportiert `getAvailableTaxYears(): string[]`
- Regel: immer `["2024", "2025"]`, plus jedes Jahr `Y` ab dem 01.01. von `Y+1` (z. B. 2026 wird ab 01.01.2026 hinzugefügt, 2027 ab 01.01.2027 …).
- Implementierung anhand `new Date()` (UTC reicht).

Diese Funktion wird überall genutzt, wo bisher `Array.from({length: 11}, ...)` oder `2024–2034` hardcoded war.

## Dashboard (`src/pages/UserTaxReturns.tsx`)

- Beim Laden der Tax Returns für den `activeTaxFilerId`: für jedes Jahr aus `getAvailableTaxYears()`, das noch keinen Eintrag hat, automatisch via `createNewTaxReturn(year)` einen Entwurf anlegen (sequenziell, idempotent, nur einmal pro Mount).
- `YearPillSelector`: Plus-Button entfernen (Prop `onAdd` optional machen oder Button intern ausblenden, wenn nicht übergeben). Im Dashboard `onAdd` nicht mehr setzen.
- "Empty"-Card "Steuerjahr hinzufügen" (Zeilen 316–332) entfernen — kann durch Auto-Anlage nicht mehr eintreten; falls doch, neutralen Lade-/Hinweis-Zustand zeigen.
- `AddTaxYearSheet` nicht mehr rendern, Import + State `showAddYearSheet` entfernen.
- Den initialen `TaxYearSelector`-Branch (Zeile 236-238) entfernen — neue Nutzer bekommen direkt 2024+2025 angelegt und sehen das normale Dashboard.

## Neuer Nutzer

- Kein Jahresauswahl-Screen mehr. Erste Anmeldung legt automatisch **2024** und **2025** als Entwürfe an.

## Dokumente (`src/pages/Documents.tsx`, `src/components/documents/DocumentsOverlay.tsx`, `src/components/documents/DocumentActionSheet.tsx`)

- `allYears` aus `getAvailableTaxYears()` beziehen statt 2024–2034.
- Falls `selectedYear` nicht mehr in der Liste ist (z. B. 2029 wie aktuell), auf das jüngste verfügbare Jahr zurücksetzen.
- Year-Reassignment-Modal & ActionSheet: nur freigeschaltete Jahre anbieten.

## Aufräumen

Folgende Komponenten werden nicht mehr genutzt → löschen:
- `src/components/ui/add-tax-year-card.tsx`
- `src/components/ui/add-tax-year-sheet.tsx`
- `src/components/ui/add-tax-year-dropdown.tsx`
- `src/components/ui/year-dropdown-button.tsx`
- `src/components/ui/year-selector-dropdown.tsx`
- `src/components/TaxYearSelector.tsx` (vorher Imports prüfen)

Nach Entfernen alle Referenzen via `rg` verifizieren.

## Memory Update

Neue Memory `mem://features/tax-year-availability` mit Regel: Jahre sind systemverwaltet (2024+2025, neue Jahre automatisch ab 01.01. des Folgejahres), keine User-Add-UI.

## Out of scope

- Admin-seitige Übersteuerung der Jahresliste.
- Migration für bestehende Konten ohne 2024/2025 — wird automatisch beim nächsten Dashboard-Aufruf nachgeholt.
