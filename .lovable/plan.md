# Fehlender Depotauszug im Preis – Ursache & Fix

## Diagnose

Bei diesem Nutzer ist in `form_data` (assets) gesetzt:
- `hasDepositAccount: true`
- `hasSecuritiesAccount: null` ← müsste `true` sein

Der Preisrechner (`src/utils/priceCalculator.ts`) berechnet die Position **„Depotkonto · CHF 20.00"** ausschliesslich aus `formData.assets.hasSecuritiesAccount`. `hasDepositAccount` wird im Preis gar nicht berücksichtigt.

Der Mapper, der aus der bestätigten Vorjahres-Checkliste die `has*`-Flags ableitet (`src/components/intake/priorYearMapping.ts`), wirft jedoch **alle** Bank-/Depot-/Wertschriften-Begriffe in **einen** Topf:

```ts
{ kw: /bank|konto|raiffeisen|sparkonto|guthaben|wertschrift|depot/i,
  flag: "hasDepositAccount" }
```

Dadurch wird "Depotauszug per 31.12." als reines Bankkonto klassifiziert → `hasSecuritiesAccount` bleibt `false` → fehlende CHF 20 im Total. Genau das Symptom, das du siehst.

## Fix

### 1. `src/components/intake/priorYearMapping.ts`
Die Assets-Regel splitten, damit Wertschriften/Depot dem korrekten Preis-Flag zugeordnet werden:

```ts
const ASSETS_RULES = [
  { kw: /liegenschaft|immobil|haus|wohnung|grundst/i, flag: "hasProperty" },
  // NEU: zuerst Wertschriften/Depot — bevor die allgemeine Bank-Regel greift
  { kw: /wertschrift|depot/i,                         flag: "hasSecuritiesAccount" },
  { kw: /bank|konto|raiffeisen|sparkonto|guthaben/i,  flag: "hasDepositAccount" },
  { kw: /krypto|bitcoin|ethereum|crypto/i,            flag: "hasCrypto" },
  { kw: /hypothek|mortgage/i,                         flag: "hasMortgage" },
  { kw: /schuld|darlehen|kredit/i,                    flag: "hasDebt" },
  { kw: /fahrzeug|auto\b|schmuck|sammlung|andere\s*verm/i, flag: "hasOtherAssets" },
];
```

Beide Flags dürfen gleichzeitig true sein (Bankkonto + Depot). `hasDepositAccount` bleibt erhalten — es löst die Dokumenten-Checkliste für Kontosaldi aus.

### 2. Bestehenden Datensatz dieses Nutzers nachziehen
Migration (idempotent), die für `tax_filer_id = 917cd261-ab79-4b36-8a20-ec07e327746d`, `tax_year='2024'`, `form_type='assets'` den fehlenden Wert ergänzt – aber nur, wenn `hasDepositAccount=true` und `hasSecuritiesAccount` noch nicht gesetzt ist. So muss der Nutzer **nicht** durch den Bestätigungs-Flow erneut.

```sql
UPDATE form_data
SET data = jsonb_set(data, '{hasSecuritiesAccount}', 'true'::jsonb, true)
WHERE tax_filer_id = '917cd261-ab79-4b36-8a20-ec07e327746d'
  AND tax_year = '2024'
  AND form_type = 'assets'
  AND (data->>'hasDepositAccount')::boolean = true
  AND (data->'hasSecuritiesAccount') IS NULL;
```

### 3. Verifikation
- `/payment?year=2024` neu öffnen → Kostenaufstellung muss zusätzlich **„Depotkonto · CHF 20.00"** anzeigen, Total **CHF 200.00**.
- Neuer Test-Nutzer mit Vorjahres-Flow (Depotauszug im Vorjahr) → bekommt `hasSecuritiesAccount=true` automatisch.

## Out of scope
- Keine Änderung an der Dokumenten-Checkliste (Depotauszug wird bereits korrekt verlangt – siehe Screenshot 2 „Depotauszug ✓").
- Keine Änderung am Preis-Modell selbst (CHF 20 Depotkonto bleibt unverändert).
- Andere Mapping-Regeln werden nicht angefasst.
