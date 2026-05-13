/**
 * Hard-coded capability checklist for AG eTax import compatibility.
 * Status is persisted in localStorage so multiple developers can track
 * progress on their own machine without DB churn.
 */

export type CapabilityStatus = 'unknown' | 'failed' | 'partial' | 'working';

export interface CapabilityItem {
  id: string;
  group: 'persons' | 'income' | 'assets' | 'deductions' | 'metadata';
  label: string;
}

export const CAPABILITIES: CapabilityItem[] = [
  { id: 'taxpayer.identity', group: 'persons', label: 'Taxpayer identity (name, AHV, birthdate)' },
  { id: 'taxpayer.address', group: 'persons', label: 'Taxpayer address' },
  { id: 'spouse.identity', group: 'persons', label: 'Spouse identity' },
  { id: 'household.children', group: 'persons', label: 'Children & dependents' },

  { id: 'income.employment', group: 'income', label: 'Employment income (Lohnausweis)' },
  { id: 'income.pension', group: 'income', label: 'Pension income' },
  { id: 'income.self_employment', group: 'income', label: 'Self-employment income' },

  { id: 'assets.cash', group: 'assets', label: 'Cash position' },
  { id: 'assets.bank', group: 'assets', label: 'Bank accounts (interest)' },
  { id: 'assets.securities', group: 'assets', label: 'Securities portfolio' },

  { id: 'deductions.pillar3a', group: 'deductions', label: 'Pillar 3a contributions' },
  { id: 'deductions.commuting', group: 'deductions', label: 'Commuting' },
  { id: 'deductions.health', group: 'deductions', label: 'Health / insurance' },
  { id: 'deductions.donations', group: 'deductions', label: 'Donations' },
  { id: 'deductions.childcare', group: 'deductions', label: 'Childcare' },

  { id: 'meta.canton', group: 'metadata', label: 'Canton + tax year metadata' },
  { id: 'meta.revision', group: 'metadata', label: 'Revision metadata accepted' },
  { id: 'meta.namespaces', group: 'metadata', label: 'Namespace declarations match' },
];

const KEY = 'ditax.dev.agCompatChecklist.v1';

interface ChecklistState {
  [capabilityId: string]: { status: CapabilityStatus; note?: string; updatedAt: string };
}

export function readChecklist(): ChecklistState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ChecklistState) : {};
  } catch { return {}; }
}

export function setCapability(id: string, status: CapabilityStatus, note?: string): void {
  const state = readChecklist();
  state[id] = { status, note, updatedAt: new Date().toISOString() };
  localStorage.setItem(KEY, JSON.stringify(state));
}
