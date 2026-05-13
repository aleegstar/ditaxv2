/**
 * Tax calculation extension points.
 *
 * No engine implementation here — only contracts. Future cantonal/federal
 * calculators register against the registry and are invoked by orchestration code.
 */
import type { Money } from '../money';
import type { Canton, Dossier } from '../types';

export interface CalculationContext {
  dossier: Dossier;
  canton: Canton;
  rulesVersion: string;
}

export interface CalculationResult {
  calculator: string;
  /** Outputs may be Money, decimal strings, or numeric scalars. */
  outputs: Record<string, Money | string | number>;
  metadata: Record<string, unknown>;
  inputs_hash: string;
  outputs_hash?: string;
}

export interface TaxCalculator {
  id: string;
  supports(ctx: CalculationContext): boolean;
  calculate(ctx: CalculationContext): Promise<CalculationResult>;
}
