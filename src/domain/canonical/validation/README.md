# Validation extension point

Register a `Validator` per canton or rule set. Results persist to `canonical_validations`.

```ts
validatorRegistry.register({
  id: 'ag-v1',
  supports: (d) => d.canton === 'AG',
  validate: async (d) => ({ validator: 'ag-v1', canton: 'AG', status: 'pass', findings: [] }),
});
```
