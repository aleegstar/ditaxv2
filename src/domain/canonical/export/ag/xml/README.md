# AG eTax XML serializer

Deterministic AG payload → XML → `.etax.zip` package.

**Determinism contract**
- No `Date.now()`, no `Math.random()`, no `crypto.randomUUID()`.
- Timestamps come from `ExportContext.generated_at`.
- XML element order via `schema/elementOrder.ts`. Attributes alphabetical.
- ZIP is store-only (no deflate), entries sorted by name, fixed DOS mtime
  derived from `generated_at`. CRC32 is content-derived.
- Local refs (`ref-001`, …) allocated by `riag/references.ts` from sorted
  content, never insertion order.

**Modules**
- `xmlBuilder.ts` — tiny dependency-free XML writer.
- `serializer.ts` — RIAG document → XML bytes.
- `zipBuilder.ts` — deterministic store-only ZIP writer.
- `validator.ts` — pre-export blocking validation.
- `packageBuilder.ts` — orchestrates payload → `{xmlBytes, zipBytes, hashes}`.
- `riag/structure.ts` — RIAG-compatible intermediate model.
- `riag/references.ts` — stable local id allocator.
- `schema/elementOrder.ts` — canonical element ordering tables.
- `schema/ag-etax.minimal.xsd` — reference XSD subset (doc only).
- `fixtures/` — golden snapshot inputs.

**Out of scope (this phase):** submission flows, browser automation,
production ZIP signing, full eCH-0119, advanced tax calc, OCR, AI.
