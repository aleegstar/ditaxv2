## Ziel

Im Dashboard (`TaxYearDashboard.tsx`) hängt der „Modus wechseln"-Knopf aktuell oben rechts über allen Karten und ersetzt — je nach Modus — die komplette 3-Karten-Liste durch zwei unterschiedliche Branches. Dadurch springen auch Card 2 („Belege & Unterlagen") und Card 3 („Prüfung & Versand") in Titel, Status und Aktion herum.

Ziel: Der Moduswechsel betrifft **ausschließlich Card 1**. Cards 2 und 3 sind in beiden Modi identisch (gleicher Titel, gleicher Status, gleiche Logik) und behalten ihren Zustand beim Umschalten.

## Änderungen in `src/components/TaxYearDashboard.tsx`

### 1. „Modus wechseln"-Pille umziehen
- Den globalen `modeSwitcher`-Block oben (Zeile ~407–418, `mb-4 flex justify-end`) entfernen.
- Stattdessen Card 1 mit einem dezenten Switcher direkt in der Karte ergänzen — z. B. eine kleine Pille mit `Settings2`-Icon und Label „Modus wechseln" in der rechten oberen Ecke der Card-1-Zeile (über `StepRow` als zusätzliches Element gerendert, ohne `StepRow` selbst zu verändern). Klick öffnet weiterhin `setModeSheetOpen(true)`.

### 2. Karten-Struktur vereinheitlichen
Statt zweier kompletter Branches (`priorYearBranch` vs. manueller Branch) eine einzige Liste mit 3 StepRows:

```text
[Card 1]  — variabel je nach intakeMode
[Card 2]  — IMMER „Belege & Unterlagen" (gleiche Logik)
[Card 3]  — IMMER „Prüfung & Versand" (gleiche Logik)
```

**Card 1 (variabel):**
- `intakeMode === 'manual'` → wie heute: Titel „Persönliche Angaben", Status aus `angabenProgress`, Action navigiert zu `/personal-info`.
- `intakeMode === 'prior_year_upload'` → wie heute: Titel „Vorjahres-Steuererklärung … hochladen" / „Vorjahres-Daten bestätigen", Status aus `py`, Action navigiert zu `/prior-year`.
- Die versteckte `PriorYearChecklistBody`-Probe (Zeilen 569–576) bleibt erhalten, damit der Progress auch im manuellen Modus nicht crasht — sie wird in beiden Modi gemountet (oder nur bei `prior_year_upload`, da `pyStep1Done` sonst nicht benötigt wird).

**Card 2 (fix) — neuer einheitlicher „step1Done"-Gate:**

```ts
const step1Done = intakeMode === 'prior_year_upload' ? pyStep1Done : allAngabenComplete;
```

- Titel: „Belege & Unterlagen"
- `state`: `!step1Done ? 'locked' : isDocumentsComplete ? 'done' : 'active'`
- Action: `handleDocumentsClick` in beiden Modi (der bisherige `handlePriorYearDocsClick` schreibt zusätzlich Flags aus der Vorjahres-Checkliste in `formData`; dieser Schritt bleibt erhalten und wird nur ausgeführt, wenn `intakeMode === 'prior_year_upload'`).

**Card 3 (fix):**

```ts
const submitReady = step1Done && isDocumentsComplete;
```

- Titel: „Prüfung & Versand"
- `state`: `!submitReady ? 'locked' : paymentStatus === 'paid' ? 'done' : 'active'`
- Action: `handleSubmitClick`

### 3. Aufräumarbeiten
- `priorYearBranch`-Variable entfernen (durch unified-Liste ersetzt).
- `pyCanSubmit`, `pyNextStep`, `pyCtaHeadline`, `pyCtaSubline` bleiben, soweit sie der „Floating Nächster Schritt"-Card dienen — `nextStepMeta` weiterhin pro Modus, da sich der nächste Schritt unterscheidet.
- `IntakeModePicker` (initiale Auswahl, wenn `intakeMode === null`) unverändert.

## Verhalten nach der Änderung

- Beim Klick auf „Modus wechseln" in Card 1 ändert sich **nur** Card 1 (Titel/Status/Action).
- Card 2 zeigt durchgehend „Belege & Unterlagen" mit ihrem korrekten Status (locked → active → done) basierend auf dem einheitlichen `step1Done`.
- Card 3 zeigt durchgehend „Prüfung & Versand" mit Status basierend auf `submitReady` und `paymentStatus`.
- Modus-Wechsel sortiert keine Karten mehr um und ändert keine Status-Labels in Cards 2/3.