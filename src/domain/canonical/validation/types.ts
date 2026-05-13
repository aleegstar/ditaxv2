/**
 * Validation extension points. No rules implemented in this phase.
 */
import type { Canton, Dossier } from '../types';

export type Severity = 'info' | 'warn' | 'error';

export interface ValidationFinding {
  severity: Severity;
  code: string;
  field_path?: string;
  message: string;
  data?: unknown;
}

export interface ValidationResult {
  validator: string;
  canton?: Canton;
  status: 'pass' | 'warn' | 'fail' | 'error';
  findings: ValidationFinding[];
}

export interface Validator {
  id: string;
  supports(dossier: Dossier): boolean;
  validate(dossier: Dossier): Promise<ValidationResult>;
}
