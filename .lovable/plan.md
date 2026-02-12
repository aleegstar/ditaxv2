

# Fix: Steuerjahr geht verloren in Expert-Formularen

## Problem
Die Expert-Formulare (Abzuege, Einkommen, Vermoegen) verwenden `setSearchParams({})` beim Speichern und beim Zurueck-Button. Das loescht **alle** URL-Parameter, einschliesslich `year`. Dadurch faellt das Jahr auf den Standard (2026) zurueck.

## Betroffene Stellen (6 Aenderungen in 3 Dateien)

| Datei | Stelle | Aktuell | Fix |
|-------|--------|---------|-----|
| DeductionsForm.tsx | Speichern (Z.94) | `setSearchParams({})` | `setSearchParams({ year: taxYear })` |
| DeductionsForm.tsx | Zurueck (Z.125) | `setSearchParams({})` | `setSearchParams({ year: taxYear })` |
| IncomeForm.tsx | Speichern (Z.113) | `setSearchParams({})` | `setSearchParams({ year: taxYear })` |
| IncomeForm.tsx | Zurueck (Z.153) | `setSearchParams({})` | `setSearchParams({ year: taxYear })` |
| AssetsForm.tsx | Speichern (Z.118) | `setSearchParams({})` | `setSearchParams({ year: taxYear })` |
| AssetsForm.tsx | Zurueck (Z.159) | `setSearchParams({})` | `setSearchParams({ year: taxYear })` |

## Loesung

In allen drei Expert-Formularen `taxYear` aus `useFormContext()` auslesen und beim Zuruecksetzen der Search-Parameter das Jahr beibehalten.

## Warum kein grosser Umbau?

Die Expert-Ansicht (Checkbox-Darstellung) komplett zu entfernen waere ein groesserer Eingriff mit Risiko fuer neue Bugs. Der eigentliche Fehler ist nur das fehlende `year`-Parameter. Der Fix ist minimal (6 Zeilen aendern) und beseitigt das Problem zuverlaessig.

## Technische Details

Jede der 3 Dateien benoetigt:
1. `taxYear` aus `useFormContext()` destructuren
2. `setSearchParams({})` ersetzen durch `setSearchParams({ year: taxYear })`

