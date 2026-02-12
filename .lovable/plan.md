

# Bug Fix: Steuerjahr geht verloren bei Navigation

## Problem
In der Datei `MultiStepYesNoForm.tsx` wird an zwei Stellen `navigate('/form')` aufgerufen -- **ohne den `year`-Parameter**. Dadurch faellt das Steuerjahr beim Zuruecknavigieren auf das Standardjahr (2026) zurueck, anstatt beim ausgewaehlten Jahr (z.B. 2029) zu bleiben.

## Betroffene Stellen

1. **Zeile 450** -- Nach dem Abschluss einer Sektion (Speichern + Fortschritt aktualisieren)
2. **Zeile 514** -- Beim Klick auf den Zurueck-Button im Header

## Loesung

1. `taxYear` aus `useFormContext()` destructuren (ist bereits verfuegbar, wird aber nicht abgerufen)
2. Beide `navigate('/form')` Aufrufe zu `navigate(`/form?year=${taxYear}`)` aendern

## Technische Details

**Datei:** `src/components/forms/multistep/MultiStepYesNoForm.tsx`

- Zeile 92-103: `taxYear` zum destructuring hinzufuegen
- Zeile 450: `navigate('/form')` -> `navigate(`/form?year=${taxYear}`)`
- Zeile 514: `navigate('/form')` -> `navigate(`/form?year=${taxYear}`)`

Dies ist ein minimaler Fix mit 3 Zeilenaenderungen.
