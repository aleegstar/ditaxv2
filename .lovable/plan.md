# Plan: Vorjahres-Übernahme – Phase 1

Ziel: Aus `Drawer/Modal-blockiert` einen ruhigen, zweistufigen Flow machen, der **nur Strukturen** übernimmt (keine CHF-Beträge), pro Sektion einmalig fragt und einen Dashboard-Einstieg bietet.

## Scope

1. **Strict structure-only import** in `importFromPreviousYear` (`FormContext.tsx`)
2. **Non-blocking Banner** in jeder Sektion statt fullscreen Drawer (`ImportWizard.tsx` → `PriorYearImportBanner.tsx`)
3. **Per-Section "dismissed" Flag** pro `tax_filer_id` + `tax_year` (localStorage, kein DB-Schema-Change in Phase 1)
4. **Dashboard-Banner** als primärer Einstieg ("Mit Vorjahres-Daten starten") mit Bulk-Import aller 4 Sektionen
5. **Visueller Marker** "Aus Vorjahr übernommen – bitte prüfen" pro Sektion in Expert-Summary

## Was übernommen wird (strukturell)

Boolean-Flags, Auswahlen, IDs, Strukturen ohne Beträge:
- `income`: `hasSalary`, `hasRentalIncome`, `hasDividends`, `hasFreelanceIncome`, Anzahl `employers` (Name/Adresse/Pensum, **ohne** Bruttolohn/Quellensteuer), `rentalIncomes` (Adresse/Objekt, **ohne** Mietertrag)
- `assets`: `hasVehicles`/`hasProperties`/`hasDepositAccount`/`hasDebts`, Vehicles (Marke/Modell/Plate/Erstzulassung, **ohne** `currentValue`), Properties (Adresse/Typ, **ohne** `marketValue`/`taxValue`/`mortgageBalance`), Debts (Gläubiger/Typ, **ohne** Restschuld/Zins)
- `deductions`: alle `has*`-Flags, `supportedPersons` (Name/Beziehung, **ohne** Beträge), `maintenancePayments` (Empfänger, **ohne** Beträge); 3a/Säule-Status ja, Beiträge nein
- `contactInfo`: alles (Adresse, Zivilstand, Konfession, Kinder mit Namen/Geburtsdatum) – hier sind alle Felder strukturell

## Felder-Blacklist (NICHT übernommen)

Zentrale Konstante `IMPORT_AMOUNT_FIELDS` mit Whitelist je Sektion. Beim Merge: aus `importedData` werden alle Keys, die in der Blacklist stehen, auf Default zurückgesetzt. Auch in nested arrays (`employers[].grossSalary`, `properties[].marketValue` etc.).

## Komponenten-Änderungen

### `src/contexts/form/sanitizeImport.ts` (neu)
Pure function `sanitizeImportedData(section, data)` → returnt cleaned object. Definiert Field-Blacklists pro Sektion + nested-array sanitizer.

### `src/contexts/form/FormContext.tsx`
- `importFromPreviousYear`: vor Merge `sanitizeImportedData` anwenden
- Setze Marker `_importedFromPreviousYear: true` und `_importedAt: ISO` im gespeicherten Datensatz (nutzt Expert-Summary zum Anzeigen)

### `src/components/forms/PriorYearImportBanner.tsx` (neu)
- Kompakte Card oben in Sektions-Form (statt Drawer)
- Text: "Aus {previousYear} übernehmen? Beträge musst du selbst eintragen."
- 2 Buttons: `[Übernehmen]` `[Schliessen]`
- Bei Schliessen: setze `localStorage['ditax_pyimport_dismissed_{filerId}_{taxYear}_{section}'] = '1'`
- Bei Übernehmen: ruft `importFromPreviousYear` + setzt dismissed-Flag + Toast "Strukturen übernommen, bitte Beträge prüfen"

### `src/pages/Index.tsx`
- Entferne `<ImportWizard>`-Drawer-Logik
- Reiche stattdessen `showImportBanner` als Prop an die Form-Komponenten
- Banner wird *innerhalb* der Form gerendert (oberhalb der ersten Frage)

### `src/components/TaxYearDashboard.tsx`
- Neuer Banner ganz oben (nur wenn: aktuelles Jahr leer + Vorjahr hat ≥1 Sektion mit Daten + Flag `dashboard_pyimport_dismissed_{filerId}_{taxYear}` nicht gesetzt)
- 1 Tap "Vorjahres-Strukturen für alle Sektionen übernehmen" → Loop über 4 Sektionen → setzt alle dismissed-Flags

### `src/components/forms/FormDataSummary.tsx`
- Pro Sektion: wenn `_importedFromPreviousYear === true` → kleines Badge "Aus Vorjahr – bitte prüfen"

### `src/components/forms/ImportWizard.tsx`
- Wird **gelöscht** (durch Banner ersetzt)

## Technische Details

```text
Flow:
Dashboard
  └─ Banner "Mit Vorjahres-Daten starten" ──┐
                                              ├─ Bulk-Import (4× sanitize+save)
  └─ Sektion öffnen                           │
       └─ Banner oben (falls nicht dismissed) ┘
            └─ "Übernehmen" → sanitize → save → dismiss
            └─ "Schliessen" → dismiss
       └─ Form normal ausfüllen
            └─ Beträge IMMER manuell
```

Dismissed-Key-Format: `ditax_pyimport_dismissed_{filerId}_{taxYear}_{section}`
Dashboard-Key: `ditax_pyimport_dashboard_{filerId}_{taxYear}`

`hasDataForPreviousYear` bleibt unverändert. Banner-Sichtbarkeitslogik:
```
visible = hasPreviousYearData
       && !currentYearHasData
       && !localStorage.getItem(dismissedKey)
```

## Out of Scope (spätere Phasen)
- DB-persistierter dismissed-Flag (Phase 2, wenn Multi-Device wichtig wird)
- Pre-Import-Diff / Field-by-field Preview
- Document-first Flow
- Smart-Skipping abhängiger Fragen

## Verifikation
- Banner erscheint in `/?section=einkommen` wenn Vorjahr Daten hat
- Nach "Schliessen" verschwindet Banner und kommt nicht wieder (gleiche Session/Browser)
- Nach "Übernehmen" sind `hasSalary` etc. übernommen, aber `employers[0].grossSalary` ist `0`/`""`
- Dashboard-Banner triggert alle 4 Sektionen auf einmal
- Expert-Summary zeigt "Aus Vorjahr"-Badge

## Aufwand
~3–4 h Implementation + Test.
