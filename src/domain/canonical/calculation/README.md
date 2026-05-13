# Calculation extension point

Register a `TaxCalculator` to plug a calculation engine in. No rules ship in this phase.

```ts
calculatorRegistry.register({
  id: 'federal_v1',
  supports: (ctx) => true,
  calculate: async (ctx) => ({ calculator: 'federal_v1', outputs: {}, metadata: {}, inputs_hash: '...' }),
});
```

Results are persisted to `canonical_calculations` (append-only) by the orchestrator (not yet implemented).
