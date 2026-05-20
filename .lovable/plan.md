# eCH-0119 Integration

## Was eCH-0119 ist

Offizieller SSK/eCH-Standard (v4.0.0, gültig seit 2021-03-08) für die **elektronische Übermittlung von Steuererklärungen natürlicher Personen** in der Schweiz. Er definiert:

1. **XML-Schema** für alle Felder einer Steuererklärung (`mainForm`, `revenue`, `deduction`, `asset`, `listOfSecurities`, …) mit verbindlichen **Ziffer-Codes** je Feld.
2. **documentType-Katalog** (CH 000–026, 999) für **Beilagen-Typisierung** — bisher nicht bei uns hinterlegt.
3. **Beilagen-Metadaten** (`attachmentType` + `documentIdentificationType`) inkl. `documentCanton`, `internalSortOrder` und Verweis auf zugehörige Ziffer.
4. **Quelle-Codes** (`source`): 0=Software, 1=2D-Barcode, 2=OCR — direkt relevant für unseren Scanner.
5. **moneyType1/2**, `partnerAmountType`, `taxAmountType` als verbindliche Beträge-Strukturen.

## Wo sich daraus konkreter Mehrwert ergibt

### A — Korrekturen / Erweiterungen der bestehenden Ziffer-Erkennung

Datei: `src/services/PriorYearLocalExtractor.ts` + `supabase/functions/scan-prior-year-ai/index.ts`

Unsere bestehende Tabelle ist überwiegend korrekt, aber laut Spec ergänzungsbedürftig:

- **Renten/Pensionen**: aktuell nur 130–137 — Spec listet zusätzlich **960–967** als Detail-Ziffern (3.2 Renten/Pension). Aufnehmen.
- **Weitere Einkünfte**: 162 (Erbschaften/Kooperationsanteile), 163 (freier Eintrag), 164 (Kapitalabfindung) — fehlen komplett.
- **Berufsauslagen**: zusätzlich 201/221 (ÖV-Abo), 240 (auswärtige Verpflegung) — bei uns nur 220/240.
- **Vermögen Liegenschaften**: zusätzlich 430, 431, 434 (Selbständig: Privatvermögen Liegenschaften) — fehlt.
- **PK-Einkauf**: aktuell 280 → Spec sagt diese Ziffer ist Versicherungsprämien-Erweiterung. Auf 281 prüfen und ggf. korrigieren.
- **Wertschriftenverzeichnis**: Total-Steuerwert = **400**, nicht nur Bankkonto — beide Labels behalten (Depot + Konto).

### B — Neuer eCH-0119 documentType-Katalog (NEU, grösster Mehrwert)

Die Spec definiert offiziell **27 Beilagen-Typen** mit Code. Diese Codes sind verbindlich, kantonsübergreifend und exakt das, was wir für die Vorjahres-Beleg-Checkliste sowie für den Dokumenten-Upload brauchen.

Neue Datei `src/services/ech0119/documentTypes.ts`:

```ts
export const ECH_DOCUMENT_TYPES = {
  '000': 'Steuererklärung (PDF)',
  '005': 'Wertschriftenverzeichnis',
  '006': 'Liegenschaftenverzeichnis',
  '007': 'Schuldenverzeichnis',
  '008': 'Qualifizierte Beteiligungen Privatvermögen',
  '009': 'Qualifizierte Beteiligungen Geschäftsvermögen',
  '011': 'Berufsauslagen',
  '012': 'Versicherungsprämien',
  '013': 'Krankheits-/Unfallkosten',
  '014': 'Behinderungsbedingte Kosten',
  '015': 'Lohnausweis',
  '016': 'PK-Beleg (Auszahlung)',
  '017': 'AHV-Beleg',
  '018': 'IV-Beleg',
  '019': 'ALV-Beleg',
  '020': 'Säule 3a (Gebundene Vorsorge)',
  '021': 'Kontoauszug',
  '022': 'Hypothek',
  '023': 'Kleinkredit',
  '024': 'Krankenversicherung',
  '025': 'Aus- und Weiterbildungskosten',
  '026': 'E-Steuerauszug (eCH-0196 XML)',
  '999': 'Sonstiges (keine Bezeichnung)',
} as const;
```

Verwendung:

1. **Dokumenten-Upload (`/documents`)**: jede Kategorie bekommt zusätzlich einen `ech0119Code` — bei späterem XML-Export werden Dateien automatisch korrekt typisiert.
2. **Vorjahres-Checkliste**: jedem Item den `documentType`-Code zuordnen, damit Bezeichnung und Erkennung 1:1 mit der Norm übereinstimmt (z.B. unser „Säule 3a-Einzahlungsbestätigung" ↔ Code **020** „Gebundene Vorsorge").
3. **Encrypted-Documents-Tabelle**: optionale Spalte `ech0119_code TEXT` (nullable) — für künftigen Export, ohne sofortige Migrations-Pflicht.

### C — eCH-0196 E-Steuerauszug erkennen (kleiner, gezielter Mehrwert)

Code **026** = standardisierter XML-Steuerauszug der Banken (UBS, ZKB, Raiffeisen, PostFinance liefern das heute alle). Falls ein User eine `.xml`-Datei mit `eCH-0196`-Namespace hochlädt, können wir:

- automatisch als Wertschriftenverzeichnis taggen,
- später (out of scope für dieses Plan) direkt Einträge in `listOfSecurities` mappen.

In dieser Iteration nur: **Erkennen + korrekt taggen** im `PriorYearUpload`/Dokumenten-Upload-Flow.

### D — Scanner-Quelle in DB festhalten

`prior_year_checklists` bekommt optionales Feld `source SMALLINT` (0/1/2 gemäss eCH-0119 §3.6) — momentan immer `2` (OCR-Scanning). Das ist sauberer Metadaten-Hygiene und zukunftssicher, wenn wir mal selbst eingegebene Daten unterscheiden müssen.

### E — Kein XML-Export-Frontend in dieser Iteration

Vollständiger eCH-0119-konformer XML-Export der gesamten Steuererklärung ist machbar, aber gross (alle 80+ Felder mappen, Schema-Validation, Canton-Extensions). Das ist **out of scope** für dieses Plan — wir legen nur das Fundament (`documentTypes.ts`, optionale DB-Felder), damit ein späterer Export-Service wenig zusätzliche Arbeit braucht.

## Was NICHT geändert wird

- Bestehende Form-/Datenstruktur (`formData.income/assets/deductions`) bleibt unverändert.
- Keine Migration auf eCH-XML als interne Quelle der Wahrheit.
- Keine UI-Änderungen am Vorjahres-Checklisten-Layout (das ist abgeschlossen).
- Kein Touchen der Upload-Encryption (E2E bleibt mandatorisch).

## Implementierungs-Schritte

```text
1. Ziffer-Mappings erweitern        → PriorYearLocalExtractor.ts
                                       scan-prior-year-ai/index.ts
2. Katalog-Datei anlegen            → src/services/ech0119/documentTypes.ts
3. Vorjahres-Items mit Codes        → priorYearMapping.ts (label → ech0119Code)
4. Dokumenten-Kategorien taggen     → src/config/documentProfiles.ts
5. (optional, klein) eCH-0196 XML   → PriorYearUpload Erkennung per Datei-Header
6. (optional) DB-Felder             → migration: prior_year_checklists.source,
                                       encrypted_documents.ech0119_code
```

## Risiken

- **Sehr klein**. Reine Erweiterung von Lookup-Tabellen + neue konstante Datei.
- Punkt 6 (DB-Migration) bleibt optional und kann später nachgereicht werden, falls Export-Feature gebaut wird.

---

Soll ich Schritte **1–4 (Code-only, keine DB)** direkt umsetzen, oder zusätzlich auch **5+6**?
