# AG / RIAG export preparation layer

Deterministic canonical → AG payload mapping.

**This phase produces typed JSON payloads only — no XML, no .etax.zip.**

Files:
- `types.ts` — strongly typed AG export structures (taxpayer, spouse, incomes, …).
- `mapper.ts` — pure canonical → AG mapper. No I/O. Deterministic.
- `payloadBuilder.ts` — orchestrates context + mapper + hashing into a `PreparedAGExport`.
- `inspector.ts` — diff/inspection helpers used by `/dev/ag-export`.
- `fixtures/` — golden fixtures for deterministic snapshot tests.

Determinism rules:
- No `Date.now()`, no `Math.random()`, no Map iteration order assumptions.
- Use `ctx.generatedAt`. Sort arrays by stable keys before emit.
- Money values normalized to CHF Rappen-precision strings.
- Optional fields are omitted (not `null`) to keep JSON stable.
