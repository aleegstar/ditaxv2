/**
 * RIAG-compatible intermediate document. Strongly typed structure that the
 * XML serializer consumes. Built from AGExportPayload by `serializer.ts`.
 *
 * Mirrors the discovered RIAG domain grouping at a minimal level:
 *   metadata · revision · persons · household · incomes · assets · deductions · attachments
 */
import type { LocalRef } from './references';

export interface RiagMetadata {
  adapter: 'ag-etax';
  schemaVersion: number;
  canton: 'AG';
  taxYear: string;
  dossierId: string;
  snapshotId?: string;
  generatedAt: string;
  rulesVersion: string;
  sourceSchemaVersion: number;
}

export interface RiagRevision {
  number: number;
  inputsHash: string;
  payloadHash: string;
}

export interface RiagAddress {
  street?: string;
  postalCode?: string;
  city?: string;
  municipality?: string;
  canton?: string;
}

export interface RiagPerson {
  ref: LocalRef;
  role: 'taxpayer' | 'spouse' | 'child' | 'dependent';
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  ahvNumber?: string;
  nationality?: string;
  maritalStatus?: string;
  religion?: string;
  address?: RiagAddress;
}

export interface RiagHousehold {
  maritalStatusEffective?: string;
  childrenCount: number;
  dependentsCount: number;
}

export interface RiagMoney {
  amount: string;   // decimal string
  currency: 'CHF';
}

export interface RiagEmploymentIncome {
  ref: LocalRef;
  personRef?: LocalRef;
  employer?: string;
  salary?: RiagMoney;
  bonus?: RiagMoney;
  pensionContributions?: RiagMoney;
  ahv?: RiagMoney;
  withholdingTax?: RiagMoney;
}

export interface RiagBankAccount {
  ref: LocalRef;
  bank?: string;
  iban?: string;
  balance?: RiagMoney;
  interest?: RiagMoney;
}

export interface RiagAssets {
  cash?: RiagMoney;
  bankAccounts: RiagBankAccount[];
}

export interface RiagDeduction {
  ref: LocalRef;
  category: string;
  amount?: RiagMoney;
}

export interface RiagAttachment {
  ref: LocalRef;
  uploadedDocumentId?: string;
  mimeType?: string;
}

export interface RiagDocument {
  metadata: RiagMetadata;
  revision: RiagRevision;
  persons: RiagPerson[];                 // already sorted: taxpayer → spouse → children
  household?: RiagHousehold;
  incomes: { employment: RiagEmploymentIncome[] };
  assets: RiagAssets;
  deductions: RiagDeduction[];
  attachments: RiagAttachment[];
}
