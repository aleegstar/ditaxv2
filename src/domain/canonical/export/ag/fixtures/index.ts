/**
 * Golden fixtures for AG export determinism tests.
 *
 * Each fixture builds a synthetic canonical Dossier (in-memory only) and
 * runs the mapper to produce a stable payload. Useful for regression checks.
 */
import { Money } from '../../../money';
import { manual } from '../../../provenance';
import type { Dossier } from '../../../types';
import { SCHEMA_VERSION } from '../../../types';
import { mapDossierToAG } from '../mapper';
import { AG_PAYLOAD_SCHEMA_VERSION, type AGExportMetadata, type AGExportPayload } from '../types';

const baseMeta = (dossierId: string, taxYear: string): AGExportMetadata => ({
  adapter_id: 'ag-etax',
  format: 'ag-etax-payload',
  payload_schema_version: AG_PAYLOAD_SCHEMA_VERSION,
  canton: 'AG',
  tax_year: taxYear,
  dossier_id: dossierId,
  dossier_revision: 1,
  rules_version: 'ag-2024.1',
  generated_at: '2026-01-01T00:00:00.000Z',
  source_schema_version: SCHEMA_VERSION,
});

const baseDossier = (overrides: Partial<Dossier> = {}): Dossier => ({
  id: 'fixture-dossier',
  user_id: 'fixture-user',
  tax_filer_id: 'fixture-filer',
  tax_year: '2024',
  canton: 'AG',
  status: 'draft',
  schema_version: SCHEMA_VERSION,
  current_revision: 1,
  validation_status: {},
  currency: 'CHF',
  persons: [],
  employment_incomes: [],
  self_employment_incomes: [],
  pension_incomes: [],
  real_estate: [],
  attachments: [],
  ...overrides,
});

export const fixtureSingleEmployee: Dossier = baseDossier({
  persons: [{
    role: 'taxpayer',
    first_name: manual('Lara'), last_name: manual('Muster'),
    birth_date: manual('1990-04-12'), ahv_number: manual('756.1234.5678.90'),
    canton: manual('AG'), city: manual('Aarau'), postal_code: manual('5000'),
    address: manual('Bahnhofstrasse 1'),
  }],
  household: { children_count: 0, dependents_count: 0 },
  employment_incomes: [{
    employer: manual('Acme AG'),
    salary: manual(Money.of(92000)), bonus: manual(Money.of(4000)),
    pension_contributions: manual(Money.of(5500)), ahv: manual(Money.of(4830)),
  }],
  assets: { bank_accounts: [], cash: manual(Money.of(12000)), securities: [], crypto_assets: [], foreign_assets: [] },
  deductions: { pillar3a: manual(Money.of(7056)) },
});

export const fixtureFamilyWithChildren: Dossier = baseDossier({
  persons: [
    { role: 'taxpayer', first_name: manual('Reto'), last_name: manual('Beispiel'), canton: manual('AG'), birth_date: manual('1982-07-03') },
    { role: 'spouse',   first_name: manual('Anna'), last_name: manual('Beispiel'), birth_date: manual('1984-01-15') },
    { role: 'child', first_name: manual('Mia'), last_name: manual('Beispiel'), birth_date: manual('2015-09-01') },
    { role: 'child', first_name: manual('Tim'), last_name: manual('Beispiel'), birth_date: manual('2018-03-22') },
  ],
  household: { children_count: 2, dependents_count: 0 },
  employment_incomes: [
    { employer: manual('Beispiel GmbH'), salary: manual(Money.of(110000)), pension_contributions: manual(Money.of(6800)) },
    { employer: manual('Teilzeit AG'),   salary: manual(Money.of(38000)) },
  ],
  deductions: { pillar3a: manual(Money.of(7056)), childcare: { amount: 9000 } },
});

export const fixtureInvestor: Dossier = baseDossier({
  persons: [{ role: 'taxpayer', first_name: manual('Yuki'), last_name: manual('Invest'), canton: manual('AG'), birth_date: manual('1988-11-30') }],
  household: { children_count: 0, dependents_count: 0 },
  employment_incomes: [{ employer: manual('FinTech AG'), salary: manual(Money.of(145000)), bonus: manual(Money.of(22000)) }],
  assets: {
    bank_accounts: [],
    cash: manual(Money.of(5000)),
    securities: [
      { isin: 'CH0012032048', description: 'Roche GS', quantity: '20', market_value: Money.of(5800), dividend: Money.of(180) },
      { isin: 'US0378331005', description: 'Apple',    quantity: '50', market_value: Money.of(11200) },
    ],
    crypto_assets: [{ asset: 'BTC', quantity: '0.35', fair_value: Money.of(21000) }],
    foreign_assets: [],
  },
  deductions: { pillar3a: manual(Money.of(7056)), donations: { amount: 1200 } },
});

export const allFixtures: Array<{ name: string; dossier: Dossier; build: () => AGExportPayload }> = [
  { name: 'single_employee',       dossier: fixtureSingleEmployee,     build: () => mapDossierToAG(fixtureSingleEmployee,     { metadata: baseMeta(fixtureSingleEmployee.id!,     fixtureSingleEmployee.tax_year) }) },
  { name: 'family_with_children',  dossier: fixtureFamilyWithChildren, build: () => mapDossierToAG(fixtureFamilyWithChildren, { metadata: baseMeta(fixtureFamilyWithChildren.id!, fixtureFamilyWithChildren.tax_year) }) },
  { name: 'investor_pillar3a',     dossier: fixtureInvestor,           build: () => mapDossierToAG(fixtureInvestor,           { metadata: baseMeta(fixtureInvestor.id!,           fixtureInvestor.tax_year) }) },
];
