# Canonical Swiss Tax Domain Model — Foundation (v2)

Backend-oriented, UI-agnostic tax data layer. Lives **alongside** the existing
`form_data` storage. UI/forms are unchanged in this phase.

## Layout

```
src/domain/canonical/
  types.ts                # Pure domain interfaces (Dossier, Person, ...)
  schema.ts               # Zod schemas (zMoney, zTracked, ...)
  money.ts                # Decimal-safe Money value object (decimal.js)
  provenance.ts           # Tracked<>, Provenance, helpers (manual, ai, ...)
  repository.ts           # Supabase persistence (upsert, snapshot RPC)
  dualWrite.ts            # syncDossierFromFormData — single integration hook
  mappers/
    fromFormData.ts       # FormData → Dossier (defaults to manual provenance)
  calculation/            # Extension point — no engine yet
  validation/             # Extension point — no rules yet
  export/                 # Extension point — no XML/adapters yet
```

## Money

- All amounts are **decimal strings** at scale 4. No JS floats.
- DB columns: `numeric(18,4)` with sibling `currency` (default `CHF`).
- Use `Money.add/sub/mul/div/round`. Use `Money.roundCHFRappen` for CHF display only.
- Serialize via `Money.toDb` / `Money.fromDb`.

## Provenance

Every extracted/imported value is wrapped in `Tracked<T> = { value, provenance }`.
Defaults set by `manual()`. AI extraction sets `source_type='ai'` + `confidence_score`.
Provenance is mirrored into `canonical_field_provenance` on every write so it can
be queried independently of the entity tables.

Future AI-review UI uses `provenance.reviewed_by` + `reviewed_at`.

## Snapshots & versioning

- `schema_version` (current = `2`) stamped on every row.
- `current_revision` on `canonical_dossiers` increments on every snapshot.
- `create_dossier_snapshot(dossier_id, reason)` RPC creates immutable, denormalized
  snapshots. Auto-fired by trigger on `tax_returns.status` → `documents_submitted | paid`.

## Calculation / validation / export extension points

- `calculatorRegistry` / `validatorRegistry`: register implementations later.
- `createExportPipeline()`: validates, prepares, serializes deterministically.
- Determinism contract enforced by `hashPayload` (stable JSON) + `sha256Hex`.

## Dual-write

`syncDossierFromFormData({ user_id, tax_filer_id, tax_year, canton, formData })`
is the only integration point. It is best-effort and never throws — legacy
`form_data` writes remain authoritative this phase.

## Out of scope

- Reading from canonical in UI
- AG-specific eTax XML, eCH-0119 XML
- Real AI extraction, calculation, or validation rules
- Backfill of historical form_data
