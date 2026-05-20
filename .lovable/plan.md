## Ziel

Zwei Pfade liefern die Bank-/Depotkonten in die Dokumenten-Checkliste — jeweils **1 Eintrag pro Konto** (auch wenn ein Konto in Rubrik A und B vorkommt, gilt es als 1 Beleg, weil es als 1 Eintrag erfasst wird).

1. **Yes/No-Flow:** Dropdown „Anzahl Bankkonten/Depots" → erzeugt generische Einträge „Bank 1", „Bank 2", …
2. **Vorjahres-Import (OCR):** Wertschriften-Seiten werden ausgewertet → erzeugt pro erkanntem Konto einen benannten Eintrag, z. B. „UBS – CH19…", „Postfinance – CH81…", „Yuh – Depot 1666308".

---

## Änderungen

### A. Datenmodell

**`src/contexts/form/defaults.ts`**
- `assets.hasDepositAccount` entfernen.
- Neu:
  - `accountCount: number | undefined` — Anzahl aus Dropdown (Yes/No-Flow).
  - `accounts: Array<{ id: string; institution: string; reference: string; source: 'manual' | 'prior-year' }>` — vom OCR befüllte Detailliste (überschreibt `accountCount`, wenn vorhanden).

**`src/contexts/form/sanitizeImport.ts` / `FormContext.tsx`**
- Migration: alter `hasDepositAccount: true` → `accountCount: 1`.
- `hasAssetsData` (FormContext Zeile 574) auf `accountCount > 0 || accounts?.length > 0` umstellen.

### B. Yes/No-Flow (Dropdown)

**`src/config/yesNoQuestions.ts`** und **`src/i18n/translations.ts`**
- Frage `hasDepositAccount` ersetzen durch neue Frage `accountCount` vom Typ `dropdown` (Werte 0–10 + „Mehr als 10").
- Übersetzungsstrings: `t.yesNoForm.questions.assets.accountCount.text` und `.explanation`.

**`src/components/forms/multistep/MultiStepYesNoForm.tsx`**
- Dropdown-Fragetyp unterstützen (falls nicht vorhanden → neuen `QuestionType: 'dropdown'` mit Select-Renderer).
- Antwort schreibt direkt in `formData.assets.accountCount`.

**`src/components/forms/AssetsForm.tsx`** (Expert-Modus)
- Checkbox `hasDepositAccount` ersetzen durch shadcn `Select` mit identischen Optionen, bindet auf `accountCount`.

### C. Vorjahres-Import / OCR (Wertschriften-Extraktion)

**`src/services/PriorYearLocalExtractor.ts`**
- Neue Funktion `extractAccountsFromRows(pages)`: scannt die Rubrik-A- und Rubrik-B-Tabellen (Wertschriften- und Guthabenverzeichnis) zeilenweise:
  - Erkennt Konto-Identifier (IBAN-Muster `CH\d{2}[\s\d]{17,}` oder Depot-Nummer `\d{6,}`) in der Spalte „Kto-Nr Valoren-Nr".
  - Erkennt die Bezeichnung in der Nachbarspalte („UBS Switzerland AG", „Post", „Yuh", „Plus500…").
  - Erkennt Typ-Token in Spalte „T" (`BK`, `PC`, `Dep`).
  - Dedupliziert nach normalisierter Konto-Nr (z. B. IBAN ohne Leerzeichen) — Yuh in A+B bleibt 1 Eintrag.
- Neues Feld im `ExtractedScan`-Typ: `accounts: Array<{ institution: string; reference: string; type: 'BK'|'PC'|'Dep' }>`.

**`src/services/seedPriorYearChecklistFromInternal.ts`** und **`src/hooks/usePriorYearChecklist.ts`**
- Beim Übernehmen der OCR-Resultate in den Form-State: extrahierte `accounts` in `formData.assets.accounts` schreiben (Source `'prior-year'`).
- Bisheriges generisches Item „Depotauszug per 31.12." / „Bankkontoauszug per 31.12." aus der Asset-Liste entfernen — wird ersetzt durch die Einzeleinträge.

### D. Checklist-Generator

**`src/contexts/form/checklistGenerator.ts`**
- Items `bank-account-statement` und `deposit-account` entfernen.
- Neuer Block (im `assets`-Branch):
  ```ts
  const accounts = formData.assets?.accounts ?? [];
  if (accounts.length > 0) {
    accounts.forEach((acc, i) => checklistItems.push({
      id: `account-${acc.id}`,
      title: `${acc.institution} – ${acc.reference}`,
      description: 'Zins-/Saldobescheinigung oder Depotauszug per 31.12. (1 Beleg pro Konto, auch wenn Rubrik A + B kombiniert).',
      category: 'assets',
      uploaded: false,
      required: true,
    }));
  } else if ((formData.assets?.accountCount ?? 0) > 0) {
    const n = formData.assets.accountCount!;
    for (let i = 1; i <= n; i++) checklistItems.push({
      id: `account-generic-${i}`,
      title: `Bank ${i}`,
      description: `Zins-/Saldobescheinigung oder Depotauszug per 31.12. (Konto ${i} von ${n}).`,
      category: 'assets',
      uploaded: false,
      required: true,
    });
  }
  ```

### E. Texte

- DE (informell) + EN für `accountCount`-Frage, Dropdown-Optionen und neue Item-Beschreibungen in `src/i18n/translations.ts`.

---

## Akzeptanzkriterien

- Yes/No-Flow: Auswahl „3" → Checkliste zeigt „Bank 1", „Bank 2", „Bank 3" unter Vermögen.
- Vorjahres-Import auf der Beispiel-PDF (Yuh + UBS×3 + Post×2 + Plus500): Checkliste zeigt 6 benannte Einträge — Yuh erscheint **einmal**, obwohl es in Rubrik A und B steht.
- Alte `hasDepositAccount: true`-Daten laden migriert als `accountCount: 1` ohne UI-Fehler.
- Keine „Zins- und Saldobescheinigung der Bankkonten"-Sammelposition mehr.

## Technische Details

- shadcn `Select` mit semantischen Tokens (`bg-card`, `border`), navy Primary für Submit — keine Custom-Farben.
- Dedup-Key fürs OCR: `reference.replace(/\s+/g,'').toUpperCase()`.
- `tax_filer_id`-Partition und `_completed: true`-Flag bleiben unverändert; kein Supabase-Schema-Change (alles in `form_data` JSON).
