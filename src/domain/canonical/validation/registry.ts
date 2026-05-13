import type { Dossier } from '../types';
import type { Validator } from './types';

const validators = new Map<string, Validator>();

export const validatorRegistry = {
  register(v: Validator) { validators.set(v.id, v); },
  unregister(id: string) { validators.delete(id); },
  list(): Validator[] { return Array.from(validators.values()); },
  resolve(dossier: Dossier): Validator[] {
    return Array.from(validators.values()).filter((v) => v.supports(dossier));
  },
};
