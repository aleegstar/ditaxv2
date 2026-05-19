## Ziel

Den Vorjahres-Upload-Flow (Bild 1) auf dasselbe 3-Card-Step-Layout umstellen, das beim manuellen Modus (Bild 2) verwendet wird. So entsteht ein einheitliches Design für beide Intake-Modi und der User sieht immer dieselben drei klar geführten Schritte: **Persönliche Angaben → Belege & Unterlagen → Prüfung & Versand**.

## Verhalten

### Step 1 — "Persönliche Angaben aus Vorjahr bestätigen"
- **Aktiv (alle 4 Bereiche noch nicht bestätigt):** Step wird als große Hero-Card im `StepRow state="active"`-Stil dargestellt. Darin eingebettet erscheinen die heutigen 4 Mini-Cards (Persönliche Daten, Einkommen, Vermögen, Abzüge) inkl. Fortschrittsbalken `X von 4 Bereichen bestätigt` und den "Bestätigen / Bearbeiten"-Buttons. Header (`Deine persönliche Checkliste`) und Aktionen `Replace`/`Reload` bleiben oben in der Card.
- **Erledigt (alle 4 Bereiche bestätigt):** Step kollabiert automatisch in die kompakte `StepRow state="done"`-Zeile mit grünem Check, Status `4 von 4 Bereichen bestätigt` und Button `Bearbeiten`, der die Card wieder aufklappt.

### Step 2 — "Belege & Unterlagen"
- Solange Step 1 nicht vollständig bestätigt ist: `state="locked"` (Schloss-Icon, ausgegraut, identisch zum manuellen Modus).
- Sobald Step 1 abgeschlossen ist: wird zu `state="active"`. Klick übernimmt — wie im aktuellen `DocumentsNextStep`-Button — die Vorjahres-Flags via `mapPriorYearToFormFlags` in `formData` (`saveSection` für income/assets/deductions mit `_completed: true`) und navigiert zu `/form?section=unterlagen&year=...`.
- Nach Upload aller Dokumente (`formProgress.documents`): `state="done"`.

### Step 3 — "Prüfung & Versand"
- Identische Logik wie im manuellen Modus: `locked` bis Step 1 + 2 erledigt, dann `active` (Button `Einreichen` → `/payment`), `done` wenn `payment_status === 'paid'`.

### Resume-/Fortschritts-Card unten
- Dieselbe Circular-Progress-Card wie im manuellen Modus (0/33/67/100 %) wird auch im Vorjahres-Modus angezeigt, mit auf den Vorjahres-Flow angepasstem CTA-Text (z. B. `Vorjahres-Daten bestätigen` als nextLabel statt `Persönliche Angaben`, wenn Step 1 offen).

## Technische Details

**Dateien:**
- `src/components/TaxYearDashboard.tsx` — neuen Branch im `stepsContent` für `intakeMode === 'prior_year_upload'`: statt `PriorYearChecklist` direkt zu rendern, dieselben 3 `StepRow`-Karten + Resume-Card verwenden, aber Step 1 mit eingebettetem Checklist-Body.
- `src/components/intake/PriorYearChecklist.tsx` — refaktorieren in zwei Teile:
  1. Neuer schlanker Export `PriorYearChecklistBody` (rendert nur Header + 4 Mini-Cards + Replace/Reload-Dialog, ohne `DocumentsNextStep`, ohne äußere `space-y-5`-Wrapper). Liefert per Callback `onProgress({ done, total })` den aktuellen Fortschritt nach oben.
  2. Bestehender `PriorYearChecklist`-Export bleibt für andere mögliche Verwendungen erhalten oder wird entfernt, falls nicht mehr referenziert (Suche bestätigt: nur Dashboard nutzt ihn → wird ersetzt).
- `DocumentsNextStep` entfällt im Dashboard-Kontext; die "Vorjahres-Flags übernehmen + navigieren"-Logik (`mapPriorYearToFormFlags` + `saveSection` + `navigate`) wandert in den `onAction`-Handler von Step 2 im Dashboard.

**Status-Quelle für Step 1:**
- Fortschritt kommt aus `usePriorYearChecklist` (Items pro Kategorie) + `prior_year_checklists.contact_changes_confirmed_at` (wie heute). Wird im Dashboard via `PriorYearChecklistBody`-Prop nach oben gereicht, damit `StepRow`-State + Resume-Card-Prozent korrekt berechnet werden.
- Loading-/Scanning-/Failed-/Pending-States (`PriorYearUpload`-Komponente, Spinner während Analyse) bleiben innerhalb der Step-1-Card und werden statt der Mini-Cards angezeigt.

**Verhalten beim Wechsel:**
- `modeSwitcher` (Header-Card mit Bild + "Wechseln") bleibt unverändert über den 3 Steps.

## Out of Scope

- Keine Änderungen am OCR-Scan-Flow oder am `PriorYearUpload`-Komponenten-Look.
- Keine Änderungen an Step-3-Payment-Logik.
- Keine Änderungen am manuellen Modus.
