/**
 * Canonical Swiss Tax Domain Model — pure types.
 *
 * UI-agnostic. No React, no FormData, no Supabase types.
 * Money is always `Money` (decimal-safe). Extractable values are wrapped in `Tracked<>`.
 *
 * Schema version: bump when shape changes incompatibly.
 */

import type { Money } from './money';
import type { Tracked } from './provenance';

export const SCHEMA_VERSION = 2 as const;

export type Canton =
  | 'AG' | 'AI' | 'AR' | 'BE' | 'BL' | 'BS' | 'FR' | 'GE' | 'GL' | 'GR'
  | 'JU' | 'LU' | 'NE' | 'NW' | 'OW' | 'SG' | 'SH' | 'SO' | 'SZ' | 'TG'
  | 'TI' | 'UR' | 'VD' | 'VS' | 'ZG' | 'ZH';

export type DossierStatus = 'draft' | 'in_review' | 'submitted' | 'exported' | 'archived';

export type PersonRole = 'taxpayer' | 'spouse' | 'child' | 'dependent';

export interface Person {
  id?: string;
  role: PersonRole;
  first_name?: Tracked<string>;
  last_name?: Tracked<string>;
  birth_date?: Tracked<string>;
  ahv_number?: Tracked<string>;
  nationality?: Tracked<string>;
  marital_status?: Tracked<string>;
  religion?: Tracked<string>;
  address?: Tracked<string>;
  postal_code?: Tracked<string>;
  city?: Tracked<string>;
  canton?: Tracked<Canton>;
  municipality?: Tracked<string>;
  extra?: Record<string, unknown>;
}

export interface Household {
  marital_status_effective?: Tracked<string>;
  children_count: number;
  dependents_count: number;
  notes?: string;
  extra?: Record<string, unknown>;
}

export interface EmploymentIncome {
  id?: string;
  person_id?: string;
  employer?: Tracked<string>;
  salary?: Tracked<Money>;
  bonus?: Tracked<Money>;
  pension_contributions?: Tracked<Money>;
  ahv?: Tracked<Money>;
  withholding_tax?: Tracked<Money>;
  source_document_id?: string;
  extra?: Record<string, unknown>;
}

export interface SelfEmploymentIncome {
  id?: string;
  person_id?: string;
  business_name?: Tracked<string>;
  revenue?: Tracked<Money>;
  expenses?: Tracked<Money>;
  net_income?: Tracked<Money>;
  details?: Record<string, unknown>;
}

export interface PensionIncome {
  id?: string;
  person_id?: string;
  ahv_income?: Tracked<Money>;
  pension_income?: Tracked<Money>;
  pillar3a?: Tracked<Money>;
  pillar3b?: Tracked<Money>;
  extra?: Record<string, unknown>;
}

/** JSONB list items — provenance lives inline as `_provenance`. */
export interface BankAccount {
  bank?: string;
  iban?: string;
  account_type?: string;
  balance?: Money;
  interest?: Money;
  withholding_tax?: Money;
  _provenance?: import('./provenance').Provenance;
}
export interface SecurityHolding {
  isin?: string;
  description?: string;
  quantity?: string;
  market_value?: Money;
  dividend?: Money;
  withholding_tax?: Money;
  purchase_value?: Money;
  purchase_date?: string;
  request_withholding_refund?: boolean;
  _provenance?: import('./provenance').Provenance;
}
export interface CryptoAsset {
  asset?: string;
  quantity?: string;
  fair_value?: Money;
  _provenance?: import('./provenance').Provenance;
}
export interface ForeignAsset {
  country?: string;
  description?: string;
  value?: Money;
  _provenance?: import('./provenance').Provenance;
}

export interface VehicleAsset {
  type?: string;
  brand?: string;
  model?: string;
  year?: number;
  value?: Money;
  plate?: string;
  _provenance?: import('./provenance').Provenance;
}

export interface Assets {
  bank_accounts: BankAccount[];
  cash?: Tracked<Money>;
  securities: SecurityHolding[];
  crypto_assets: CryptoAsset[];
  foreign_assets: ForeignAsset[];
  vehicles: VehicleAsset[];
}

export interface MortgageItem {
  lender?: string;
  property_id?: string;
  balance?: Money;
  interest?: Money;
  _provenance?: import('./provenance').Provenance;
}
export interface LoanItem {
  lender?: string;
  balance?: Money;
  interest?: Money;
  _provenance?: import('./provenance').Provenance;
}
export interface Debts {
  mortgages: MortgageItem[];
  loans: LoanItem[];
  interest_paid?: Tracked<Money>;
}

export interface RealEstate {
  id?: string;
  address?: Tracked<string>;
  canton?: Tracked<Canton>;
  municipality?: Tracked<string>;
  usage?: Tracked<'self' | 'rented'>;
  purchase_value?: Tracked<Money>;
  purchase_year?: Tracked<number>;
  tax_value?: Tracked<Money>;
  rental_income?: Tracked<Money>;
  eigenmietwert?: Tracked<Money>;
  maintenance_costs?: Tracked<Money>;
  maintenance_method?: Tracked<'pauschal' | 'effektiv'>;
  maintenance_value_preserving?: Tracked<Money>;
  maintenance_value_increasing?: Tracked<Money>;
  extra?: Record<string, unknown>;
}

export interface Deductions {
  commuting?: Record<string, unknown>;
  meals?: Record<string, unknown>;
  education?: Record<string, unknown>;
  health_costs?: Record<string, unknown>;
  pillar3a?: Tracked<Money>;
  donations?: Record<string, unknown>;
  childcare?: Record<string, unknown>;
  other?: Record<string, unknown>;
}

export interface Attachment {
  id?: string;
  uploaded_document_id?: string;
  mime_type?: string;
  extracted_entities?: Record<string, unknown>;
  extraction_confidence?: number;
  extraction_model?: string;
  extracted_at?: string;
}

export interface Dossier {
  id?: string;
  user_id: string;
  tax_filer_id: string;
  tax_year: string;
  canton?: Canton;
  status: DossierStatus;
  schema_version: number;
  current_revision: number;
  validation_status: Record<string, unknown>;
  currency: 'CHF';

  persons: Person[];
  household?: Household;
  employment_incomes: EmploymentIncome[];
  self_employment_incomes: SelfEmploymentIncome[];
  pension_incomes: PensionIncome[];
  assets?: Assets;
  debts?: Debts;
  real_estate: RealEstate[];
  deductions?: Deductions;
  attachments: Attachment[];
}
