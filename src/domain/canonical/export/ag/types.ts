/**
 * AG / RIAG export payload — strongly typed, deterministic, JSON-only.
 *
 * NOT XML. NOT .etax.zip. NOT eCH-0119. Pure object shapes that downstream
 * XML/ZIP serializers (future phase) will consume.
 *
 * Convention:
 *  - All money values are decimal STRINGS in CHF (e.g. "12345.50"). Never floats.
 *  - Optional values are omitted from the object; never `null`.
 *  - All arrays are emitted in deterministic order (see mapper).
 */

export type AGCurrency = 'CHF';

export interface AGMoney {
  amount: string;        // decimal string, e.g. "12345.50"
  currency: AGCurrency;  // always 'CHF' for AG
}

export interface AGProvenanceRef {
  source_type: 'manual' | 'ai' | 'imported' | 'migrated';
  confidence?: number;
  source_document_id?: string;
}

export interface AGAddress {
  street?: string;
  postal_code?: string;
  city?: string;
  canton?: string;
  municipality?: string;
}

export type AGPersonRole = 'taxpayer' | 'spouse' | 'child' | 'dependent';

export interface AGPerson {
  role: AGPersonRole;
  first_name?: string;
  last_name?: string;
  birth_date?: string;        // ISO yyyy-mm-dd
  ahv_number?: string;
  nationality?: string;
  marital_status?: string;
  religion?: string;
  address?: AGAddress;
}

export interface AGHousehold {
  marital_status_effective?: string;
  children_count: number;
  dependents_count: number;
}

export interface AGEmploymentIncome {
  index: number;              // stable position
  employer?: string;
  salary?: AGMoney;
  bonus?: AGMoney;
  pension_contributions?: AGMoney;
  ahv?: AGMoney;
  withholding_tax?: AGMoney;
  source_document_id?: string;
}

export interface AGPensionIncome {
  index: number;
  ahv_income?: AGMoney;
  pension_income?: AGMoney;
  pillar3a?: AGMoney;
  pillar3b?: AGMoney;
}

export interface AGSelfEmploymentIncome {
  index: number;
  business_name?: string;
  revenue?: AGMoney;
  expenses?: AGMoney;
  net_income?: AGMoney;
}

export type AGIncome =
  | ({ kind: 'employment' } & AGEmploymentIncome)
  | ({ kind: 'pension' } & AGPensionIncome)
  | ({ kind: 'self_employment' } & AGSelfEmploymentIncome);

export interface AGBankAccount {
  index: number;
  bank?: string;
  iban?: string;
  balance?: AGMoney;
  interest?: AGMoney;
}

export interface AGSecurityHolding {
  index: number;
  isin?: string;
  description?: string;
  quantity?: string;
  market_value?: AGMoney;
  dividend?: AGMoney;
}

export interface AGCryptoAsset {
  index: number;
  asset?: string;
  quantity?: string;
  fair_value?: AGMoney;
}

export interface AGForeignAsset {
  index: number;
  country?: string;
  description?: string;
  value?: AGMoney;
}

export interface AGAssets {
  cash?: AGMoney;
  bank_accounts: AGBankAccount[];
  securities: AGSecurityHolding[];
  crypto_assets: AGCryptoAsset[];
  foreign_assets: AGForeignAsset[];
}

export interface AGMortgage {
  index: number;
  lender?: string;
  property_id?: string;
  balance?: AGMoney;
  interest?: AGMoney;
}
export interface AGLoan {
  index: number;
  lender?: string;
  balance?: AGMoney;
  interest?: AGMoney;
}
export interface AGDebts {
  mortgages: AGMortgage[];
  loans: AGLoan[];
  interest_paid?: AGMoney;
}

export interface AGRealEstate {
  index: number;
  address?: string;
  canton?: string;
  municipality?: string;
  usage?: 'self' | 'rented';
  purchase_value?: AGMoney;
  purchase_year?: number;
  tax_value?: AGMoney;
  rental_income?: AGMoney;
  maintenance_costs?: AGMoney;
}

export interface AGDeductionEntry {
  category:
    | 'commuting' | 'meals' | 'education' | 'health_costs'
    | 'pillar3a' | 'donations' | 'childcare' | 'other';
  amount?: AGMoney;
  details?: Record<string, unknown>;
}

export interface AGAttachment {
  index: number;
  uploaded_document_id?: string;
  mime_type?: string;
}

export interface AGExportMetadata {
  adapter_id: 'ag-etax';
  format: 'ag-etax-payload';        // typed payload, NOT XML
  payload_schema_version: number;
  canton: 'AG';
  tax_year: string;
  dossier_id: string;
  dossier_revision: number;
  snapshot_id?: string;
  rules_version: string;
  generated_at: string;             // deterministic, from ctx
  source_schema_version: number;    // canonical schema version
}

export interface AGExportPayload {
  metadata: AGExportMetadata;
  taxpayer?: AGPerson;
  spouse?: AGPerson;
  children: AGPerson[];
  household?: AGHousehold;
  incomes: AGIncome[];
  assets: AGAssets;
  debts: AGDebts;
  real_estate: AGRealEstate[];
  deductions: AGDeductionEntry[];
  attachments: AGAttachment[];
}

export interface PreparedAGExport {
  payload: AGExportPayload;
  inputs_hash: string;   // hash of canonical dossier subset feeding the mapper
  payload_hash: string;  // hash of payload (stable serialization)
}

export const AG_PAYLOAD_SCHEMA_VERSION = 1 as const;
