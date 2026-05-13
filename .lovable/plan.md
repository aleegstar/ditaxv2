
# Canonical Swiss Tax Domain Model — Foundation (v2)

Extends the previously approved foundation with: **field-level provenance**, **decimal-safe money**, **calculation/validation extension points**, and **export pipeline abstractions**. Still foundation only — no AG logic, no eCH XML, no calculation engine, no AI extraction implementations.

## 1. Architecture overview

```text
UI / Forms (unchanged)
        │ legacy write              │ dual-write
        ▼                           ▼
   form_data (jsonb)         Canonical Domain
                               │
        ┌──────────────────────┼─────────────────────────┐
        ▼                      ▼                         ▼
  Money (Decimal)      Provenance (per field)     Snapshots/Versions
                               │
                               ▼
              Calculation / Validation / Export
              (extension points only — no impl)
```

Reads stay on legacy `form_data`. Canonical is write-only this phase.

## 2. Money: deterministic decimal-safe handling

Single source of truth: a `Money` value object backed by integer minor units + an ISO-4217 currency code. No JS floats anywhere in the domain.

- DB type: `numeric(18,4)` for monetary columns (CHF precision + headroom for FX).
- Currency stored alongside: every monetary column gets a sibling `*_currency text default 'CHF'`, OR — for objects with many amounts — a single `currency` column on the row (default CHF).
- TS:
  ```ts
  // src/domain/canonical/money.ts
  export type CurrencyCode = 'CHF' | 'EUR' | 'USD'; // extensible
  export interface Money { amount: string; currency: CurrencyCode } // amount = decimal string, e.g. "1234.5600"
  export const Money = {
    of(amount: string | number, currency: CurrencyCode = 'CHF'): Money,
    add, sub, mul, div,                          // all via decimal.js
    round(m, mode: 'HALF_UP' | 'HALF_EVEN' = 'HALF_UP', scale = 2): Money, // deterministic
    toMinorUnits(m): bigint,
    fromMinorUnits(units: bigint, currency): Money,
    toDb(m): { amount: string; currency: CurrencyCode },
    fromDb(row): Money,
  }
  ```
- Library: `decimal.js` (already common, MIT). Added as dependency.
- Serialization: always decimal **strings** in JSON / Zod schemas, never `number`. Zod helper `zMoney()`.
- Rounding policy: CHF Rappen-Rundung documented in `money.ts` (HALF_UP to 0.05 helper available, but stored values keep raw 4-digit precision; rounding is presentation/calculation-only).
- All canonical interfaces (`EmploymentIncome.salary`, etc.) use `Money` — never `number`.

## 3. Field-level provenance

Provenance is a uniform envelope wrapping any extracted/imported canonical value, not just dossier-level metadata.

### TS

```ts
// src/domain/canonical/provenance.ts
export type SourceType = 'manual' | 'ai' | 'imported' | 'migrated';

export interface Provenance {
  source_type: SourceType;
  source_document_id?: string;   // FK → canonical_attachments.id
  extraction_model?: string;     // e.g. "gpt-4o-2024-11", "ocr-tesseract-v5"
  confidence_score?: number;     // 0..1
  extracted_at?: string;         // ISO timestamp
  reviewed_by?: string;          // user_id once a human confirms
  reviewed_at?: string;
}

export interface Tracked<T> { value: T; provenance: Provenance }

export const track = <T>(value: T, p: Provenance): Tracked<T> => ({ value, provenance: p });
export const manual = <T>(value: T): Tracked<T> => track(value, { source_type: 'manual' });
```

Canonical interfaces use `Tracked<Money>`, `Tracked<string>`, etc., for any field that can be extracted. Pure structural fields (FKs, enums controlled by the system) stay untracked.

### DB representation

Two complementary mechanisms:

1. **`canonical_field_provenance`** — sparse provenance table for normalized columns. One row per `(entity_table, entity_id, field_path)`.
   - `id`, `dossier_id`, `entity_table` (e.g. `canonical_employment_incomes`), `entity_id`, `field_path` (e.g. `salary`, `bank_accounts[0].balance`), `source_type`, `source_document_id`, `extraction_model`, `confidence_score`, `extracted_at`, `reviewed_by`, `reviewed_at`, `created_at`, `updated_at`
   - Unique `(entity_table, entity_id, field_path)`.
   - Indexed on `(dossier_id)` and `(source_document_id)`.
2. **Inline `_provenance` jsonb** on JSONB-bag rows (assets, deductions, debts) — per-item provenance lives next to its item: `{ amount, currency, _provenance: {...} }`. Mirrored to the table above on write for query power.

The `repository` layer transparently materializes provenance on read (`Tracked<T>`) and persists both the value and its provenance row in the same transaction.

### Review workflow extension point

`provenance.reviewed_by` + `reviewed_at` are the hooks for the future AI-extraction review UI. No UI in this phase.

## 4. Calculation / validation extension points

Canonical entities stay **input-only**. Computed values live in dedicated, derivable structures so the calculation engine can be added later without touching the domain shape.

### Tables

- `canonical_calculations` — n per dossier, append-only history of calc runs
  - `id`, `dossier_id`, `revision` (matches `canonical_dossiers.current_revision` at calc time), `calculator` text (e.g. `federal_v1`, `ag_v1`), `canton`, `inputs_hash` text, `outputs` jsonb (e.g. `{ taxable_income, federal_tax, cantonal_tax, communal_tax, ... }` all as decimal strings), `metadata` jsonb (e.g. `{ duration_ms, engine_version, rules_version }`), `created_at`
- `canonical_validations` — n per dossier, latest run per `validator` queryable
  - `id`, `dossier_id`, `revision`, `validator` text, `canton` (nullable for federal), `status` enum: `pass | warn | fail | error`, `findings` jsonb (`Array<{ severity: 'info'|'warn'|'error'; code: string; field_path?: string; message: string; data?: any }>`), `created_at`

### TS interfaces (no implementations)

```ts
// src/domain/canonical/calculation/types.ts
export interface CalculationContext { dossier: Dossier; canton: Canton; rulesVersion: string; }
export interface CalculationResult {
  calculator: string;
  outputs: Record<string, Money | string | number>;
  metadata: Record<string, unknown>;
}
export interface TaxCalculator {
  id: string;
  supports(ctx: CalculationContext): boolean;
  calculate(ctx: CalculationContext): Promise<CalculationResult>;
}

// src/domain/canonical/validation/types.ts
export type Severity = 'info' | 'warn' | 'error';
export interface ValidationFinding { severity: Severity; code: string; field_path?: string; message: string; data?: unknown }
export interface ValidationResult { validator: string; canton?: Canton; status: 'pass'|'warn'|'fail'|'error'; findings: ValidationFinding[] }
export interface Validator {
  id: string;
  supports(dossier: Dossier): boolean;
  validate(dossier: Dossier): Promise<ValidationResult>;
}
```

Folders `src/domain/canonical/calculation/` and `validation/` ship with `types.ts` + `registry.ts` (empty registry pattern) + `README.md`. No actual rules.

## 5. Export pipeline abstractions

Domain entities are decoupled from any wire format. Export is a separate pipeline: `Dossier → ExportPayload (typed) → Serializer (XML/JSON/PDF) → bytes`.

### TS contracts

```ts
// src/domain/canonical/export/types.ts
export interface ExportContext {
  dossier: Dossier;
  dossierRevision: number;
  canton: Canton;
  taxYear: string;
  format: 'ech-0119' | 'ag-etax' | 'json';
  rulesVersion: string;
  generatedAt: string;     // deterministic timestamp injected by caller
  locale?: 'de-CH' | 'fr-CH' | 'it-CH';
}

export interface PreparedExport<TPayload = unknown> {
  payload: TPayload;                  // canton-shaped object, still data — no XML strings
  validation: ValidationResult[];     // must pass before serialize
  warnings: ValidationFinding[];
}

export interface CantonalAdapter<TPayload = unknown> {
  id: string;                         // 'ag-etax-v1', 'ech-0119-v5', ...
  format: ExportContext['format'];
  supports(ctx: ExportContext): boolean;
  prepare(ctx: ExportContext): Promise<PreparedExport<TPayload>>;
  serialize(prepared: PreparedExport<TPayload>, ctx: ExportContext): Promise<Uint8Array>; // deterministic
}

export interface ExportPipeline {
  register(adapter: CantonalAdapter): void;
  run(ctx: ExportContext): Promise<ExportRunResult>;
}
```

- **Determinism**: adapters MUST produce byte-identical output for identical `(dossier snapshot, rulesVersion, generatedAt)`. No `Date.now()`, no `Math.random()`, stable JSON key ordering, fixed XML attribute order.
- **Validate before serialize**: `pipeline.run` calls registered validators first; if any `error` finding exists, serialization is skipped unless `ctx.allowWarnings` is set.
- **Reproducibility / snapshots**: every export persists to `canonical_exports`.

### Tables

- `canonical_exports` — append-only
  - `id`, `dossier_id`, `dossier_revision`, `snapshot_id` (FK → `canonical_dossier_snapshots`, captured at export time), `adapter_id`, `format`, `canton`, `rules_version`, `generated_at`, `inputs_hash`, `output_hash`, `output_path` (storage), `status` enum: `prepared | exported | failed`, `validation_summary` jsonb, `error_message`, `created_by`, `created_at`
  - On every export: pipeline first calls `create_dossier_snapshot(dossier_id, 'export')` (existing RPC from v1), then writes the `canonical_exports` row referencing it. Re-running the same export against the same snapshot must produce the same `output_hash`.

### Folder layout

```
src/domain/canonical/export/
  types.ts          // contracts above
  pipeline.ts       // ExportPipeline impl skeleton (register/run, no real adapters)
  hashing.ts        // canonical hashing helpers (stable JSON, sha256)
  README.md         // adapter author guide
  adapters/         // empty, with README explaining contract
```

No XML library wired in yet. `serialize` is `throw new Error('not implemented')` placeholder in the skeleton.

## 6. Updated DB migration (delta over v1)

Single migration adds:
- `canonical_field_provenance` table + RLS + indexes.
- `canonical_calculations`, `canonical_validations` tables + RLS.
- `canonical_exports` table + RLS + FK to `canonical_dossier_snapshots`.
- All money columns typed `numeric(18,4)`; sibling currency columns where appropriate; `currency` default `'CHF'`.
- Enum `provenance_source_type` and `validation_status`.
- `schema_version` bumped to `2` in code (`SCHEMA_VERSION` constant).

## 7. Updated TS module layout

```
src/domain/canonical/
  types.ts                     // Dossier + entities (using Money, Tracked<>)
  schema.ts                    // Zod, incl. zMoney(), zTracked()
  money.ts                     // decimal.js wrapper
  provenance.ts                // Tracked<>, Provenance, helpers
  repository.ts                // upsert + provenance materialization
  dualWrite.ts                 // syncDossierFromFormData
  mappers/
    fromFormData.ts            // wraps every value with manual() provenance by default
    toCanonicalRows.ts
  calculation/
    types.ts
    registry.ts
    README.md
  validation/
    types.ts
    registry.ts
    README.md
  export/
    types.ts
    pipeline.ts
    hashing.ts
    adapters/README.md
    README.md
  adapters/README.md           // top-level extension overview
  index.ts
  README.md
```

## 8. Dual-write behavior (updated)

- All values mapped from `FormData` get `provenance = { source_type: 'manual' }` by default.
- Future imports/AI calls will set their own `Provenance` before calling `repository.upsertDossier`.
- Snapshots still triggered on submission/export.

## 9. Out of scope (explicitly)

- Real AI extraction, eCH-0119 XML, AG eTax XML, calculation rules, validation rules, FX conversion, multi-currency UI.
- Backfill of existing `form_data`.
- Any UI changes (no review UI, no calc display).

## 10. Deliverables

1. Supabase migration: v1 tables (from approved plan) + provenance/calculation/validation/exports tables, all money cols `numeric(18,4)`.
2. `src/domain/canonical/` module per layout above; `Money` and `Tracked<>` adopted across all entity interfaces.
3. Dual-write wired into `FormContext.saveSection`, defaulting provenance to `manual`.
4. README covering: model, money rules, provenance contract, calc/validation registry pattern, export pipeline + determinism rules.
