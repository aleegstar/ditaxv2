import type { CalculationContext, TaxCalculator } from './types';

const calculators = new Map<string, TaxCalculator>();

export const calculatorRegistry = {
  register(c: TaxCalculator) { calculators.set(c.id, c); },
  unregister(id: string) { calculators.delete(id); },
  list(): TaxCalculator[] { return Array.from(calculators.values()); },
  resolve(ctx: CalculationContext): TaxCalculator[] {
    return Array.from(calculators.values()).filter((c) => c.supports(ctx));
  },
};
