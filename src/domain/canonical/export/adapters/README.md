# Export adapters

Implement `CantonalAdapter` (see `../types.ts`) and register with a pipeline.

```ts
const pipeline = createExportPipeline();
pipeline.register({
  id: 'ag-etax-v1',
  format: 'ag-etax',
  supports: (ctx) => ctx.canton === 'AG' && ctx.format === 'ag-etax',
  prepare: async (ctx) => { /* derive payload from ctx.dossier; compute inputs_hash via hashPayload */ },
  serialize: async (prepared, ctx) => { /* deterministic XML bytes */ },
});
```

**Determinism contract**
- No `Date.now()` — use `ctx.generatedAt`.
- Stable JSON ordering via `stableStringify`.
- Stable XML attribute/element order.
- Same snapshot + rulesVersion + generatedAt → identical `output_hash`.

eCH-0119 and AG eTax adapters are intentionally NOT shipped in this phase.
