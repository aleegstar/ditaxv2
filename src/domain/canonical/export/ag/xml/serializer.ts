/**
 * AG payload → RIAG document → XML.
 *
 * Pure & deterministic. All ordering driven by `schema/elementOrder.ts`
 * and `riag/references.ts`. No timestamps read here — `generated_at` flows
 * in via the payload metadata.
 */
import type {
  AGAddress, AGBankAccount, AGDeductionEntry, AGEmploymentIncome,
  AGExportPayload, AGHousehold, AGMoney, AGPerson,
} from '../types';
import { allocateReferences } from './riag/references';
import type {
  RiagAddress, RiagAssets, RiagAttachment, RiagBankAccount, RiagDeduction,
  RiagDocument, RiagEmploymentIncome, RiagHousehold, RiagMetadata, RiagMoney,
  RiagPerson, RiagRevision,
} from './riag/structure';
import { el, renderXmlBytes, type XmlElement } from './xmlBuilder';

// ── AG payload → RIAG ──────────────────────────────────────────────────────

const ROLE_ORDER: Record<RiagPerson['role'], number> = { taxpayer: 0, spouse: 1, child: 2, dependent: 3 };

function toMoney(m?: AGMoney): RiagMoney | undefined {
  return m ? { amount: m.amount, currency: 'CHF' } : undefined;
}

function toAddress(a?: AGAddress): RiagAddress | undefined {
  if (!a) return undefined;
  const r: RiagAddress = {
    street: a.street, postalCode: a.postal_code, city: a.city,
    municipality: a.municipality, canton: a.canton,
  };
  return Object.values(r).some((v) => v !== undefined) ? r : undefined;
}

function toPerson(p: AGPerson, ref: string): RiagPerson {
  return {
    ref, role: p.role,
    firstName: p.first_name, lastName: p.last_name, birthDate: p.birth_date,
    ahvNumber: p.ahv_number, nationality: p.nationality,
    maritalStatus: p.marital_status, religion: p.religion,
    address: toAddress(p.address),
  };
}

function toHousehold(h?: AGHousehold): RiagHousehold | undefined {
  return h ? {
    maritalStatusEffective: h.marital_status_effective,
    childrenCount: h.children_count,
    dependentsCount: h.dependents_count,
  } : undefined;
}

function toEmployment(e: AGEmploymentIncome, ref: string, personRef?: string): RiagEmploymentIncome {
  return {
    ref, personRef, employer: e.employer,
    salary: toMoney(e.salary), bonus: toMoney(e.bonus),
    pensionContributions: toMoney(e.pension_contributions),
    ahv: toMoney(e.ahv), withholdingTax: toMoney(e.withholding_tax),
  };
}

function toBank(b: AGBankAccount, ref: string): RiagBankAccount {
  return { ref, bank: b.bank, iban: b.iban, balance: toMoney(b.balance), interest: toMoney(b.interest) };
}

function toDeduction(d: AGDeductionEntry, ref: string): RiagDeduction {
  return { ref, category: d.category, amount: toMoney(d.amount) };
}

export function payloadToRiag(payload: AGExportPayload, hashes: { inputs: string; output: string }): RiagDocument {
  // Stable refs derived from (kind, sort key)
  const personKeys: string[] = [];
  if (payload.taxpayer) personKeys.push('person:taxpayer');
  if (payload.spouse)   personKeys.push('person:spouse');
  payload.children.forEach((_, i) => personKeys.push(`person:child:${i}`));

  const empKeys: string[] = payload.incomes
    .filter((i) => i.kind === 'employment')
    .map((_, i) => `income:employment:${i}`);

  const bankKeys = payload.assets.bank_accounts.map((_, i) => `asset:bank:${i}`);
  const dedKeys  = payload.deductions.map((d, i) => `deduction:${d.category}:${i}`);
  const attKeys  = payload.attachments.map((_, i) => `attachment:${i}`);

  const refs = allocateReferences([...personKeys, ...empKeys, ...bankKeys, ...dedKeys, ...attKeys]);

  const persons: RiagPerson[] = [];
  if (payload.taxpayer) persons.push(toPerson(payload.taxpayer, refs.refs['person:taxpayer']));
  if (payload.spouse)   persons.push(toPerson(payload.spouse,   refs.refs['person:spouse']));
  payload.children.forEach((c, i) => persons.push(toPerson(c, refs.refs[`person:child:${i}`])));
  persons.sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || (a.ref ?? '').localeCompare(b.ref ?? ''));

  const employment: RiagEmploymentIncome[] = payload.incomes
    .filter((i) => i.kind === 'employment')
    .map((inc, i) => toEmployment(inc as AGEmploymentIncome & { kind: 'employment' }, refs.refs[`income:employment:${i}`], refs.refs['person:taxpayer']));

  const bankAccounts: RiagBankAccount[] = payload.assets.bank_accounts
    .map((b, i) => toBank(b, refs.refs[`asset:bank:${i}`]))
    .sort((a, b) => a.ref.localeCompare(b.ref));

  const assets: RiagAssets = { cash: toMoney(payload.assets.cash), bankAccounts };

  const deductions: RiagDeduction[] = payload.deductions
    .map((d, i) => toDeduction(d, refs.refs[`deduction:${d.category}:${i}`]))
    .sort((a, b) => a.category.localeCompare(b.category) || a.ref.localeCompare(b.ref));

  const attachments: RiagAttachment[] = payload.attachments
    .map((a, i) => ({ ref: refs.refs[`attachment:${i}`], uploadedDocumentId: a.uploaded_document_id, mimeType: a.mime_type }))
    .sort((a, b) => a.ref.localeCompare(b.ref));

  const m = payload.metadata;
  const metadata: RiagMetadata = {
    adapter: 'ag-etax',
    schemaVersion: m.payload_schema_version,
    canton: 'AG',
    taxYear: m.tax_year,
    dossierId: m.dossier_id,
    snapshotId: m.snapshot_id,
    generatedAt: m.generated_at,
    rulesVersion: m.rules_version,
    sourceSchemaVersion: m.source_schema_version,
  };
  const revision: RiagRevision = {
    number: m.dossier_revision,
    inputsHash: hashes.inputs,
    payloadHash: hashes.output,
  };

  return {
    metadata, revision, persons,
    household: toHousehold(payload.household),
    incomes: { employment },
    assets,
    deductions,
    attachments,
  };
}

// ── RIAG → XML ─────────────────────────────────────────────────────────────

const moneyEl = (tag: string, m?: RiagMoney): XmlElement | null =>
  m ? el(tag, { currency: m.currency }, m.amount) : null;

const textEl = (tag: string, v?: string | number): XmlElement | null =>
  v === undefined || v === null || v === '' ? null : el(tag, undefined, v);

const compact = (xs: Array<XmlElement | null>): XmlElement[] => xs.filter((x): x is XmlElement => x !== null);

function addressEl(a: RiagAddress): XmlElement {
  return el('Address', undefined, compact([
    textEl('Street', a.street),
    textEl('PostalCode', a.postalCode),
    textEl('City', a.city),
    textEl('Municipality', a.municipality),
    textEl('Canton', a.canton),
  ]));
}

function personEl(p: RiagPerson): XmlElement {
  return el('Person', { ref: p.ref, role: p.role }, compact([
    textEl('FirstName', p.firstName),
    textEl('LastName', p.lastName),
    textEl('BirthDate', p.birthDate),
    textEl('AhvNumber', p.ahvNumber),
    textEl('Nationality', p.nationality),
    textEl('MaritalStatus', p.maritalStatus),
    textEl('Religion', p.religion),
    p.address ? addressEl(p.address) : null,
  ]));
}

function householdEl(h: RiagHousehold): XmlElement {
  return el('Household', undefined, compact([
    textEl('MaritalStatusEffective', h.maritalStatusEffective),
    textEl('ChildrenCount', h.childrenCount),
    textEl('DependentsCount', h.dependentsCount),
  ]));
}

function employmentEl(e: RiagEmploymentIncome): XmlElement {
  const attrs: Record<string, string | undefined> = { ref: e.ref };
  if (e.personRef) attrs.personRef = e.personRef;
  return el('EmploymentIncome', attrs, compact([
    textEl('Employer', e.employer),
    moneyEl('Salary', e.salary),
    moneyEl('Bonus', e.bonus),
    moneyEl('PensionContributions', e.pensionContributions),
    moneyEl('Ahv', e.ahv),
    moneyEl('WithholdingTax', e.withholdingTax),
  ]));
}

function bankEl(b: RiagBankAccount): XmlElement {
  return el('BankAccount', { ref: b.ref }, compact([
    textEl('Bank', b.bank),
    textEl('Iban', b.iban),
    moneyEl('Balance', b.balance),
    moneyEl('Interest', b.interest),
  ]));
}

function deductionEl(d: RiagDeduction): XmlElement {
  return el('Deduction', { ref: d.ref, category: d.category }, compact([
    moneyEl('Amount', d.amount),
  ]));
}

function attachmentEl(a: RiagAttachment): XmlElement {
  return el('Attachment', { ref: a.ref }, compact([
    textEl('UploadedDocumentId', a.uploadedDocumentId),
    textEl('MimeType', a.mimeType),
  ]));
}

export function riagToXmlElement(doc: RiagDocument): XmlElement {
  const m = doc.metadata;
  const metadata = el('Metadata', undefined, compact([
    textEl('Adapter', m.adapter),
    textEl('SchemaVersion', m.schemaVersion),
    textEl('Canton', m.canton),
    textEl('TaxYear', m.taxYear),
    textEl('DossierId', m.dossierId),
    textEl('SnapshotId', m.snapshotId),
    textEl('GeneratedAt', m.generatedAt),
    textEl('RulesVersion', m.rulesVersion),
    textEl('SourceSchemaVersion', m.sourceSchemaVersion),
  ]));
  const revision = el('Revision', undefined, [
    el('Number', undefined, doc.revision.number),
    el('InputsHash', undefined, doc.revision.inputsHash),
    el('PayloadHash', undefined, doc.revision.payloadHash),
  ]);
  const persons = el('Persons', doc.persons.map(personEl));
  const incomes = el('Incomes', doc.incomes.employment.map(employmentEl));
  const assets = el('Assets', undefined, compact([
    moneyEl('Cash', doc.assets.cash),
    el('BankAccounts', doc.assets.bankAccounts.map(bankEl)),
  ]));
  const deductions = el('Deductions', doc.deductions.map(deductionEl));
  const attachments = el('Attachments', doc.attachments.map(attachmentEl));

  const children: XmlElement[] = [metadata, revision, persons];
  if (doc.household) children.push(householdEl(doc.household));
  children.push(incomes, assets, deductions, attachments);

  return el('TaxData', { schemaVersion: m.schemaVersion, xmlns: 'urn:ditax:ag-etax:1' }, children);
}

export interface SerializeArgs {
  payload: AGExportPayload;
  inputsHash: string;
  payloadHash: string;
}

export function serializeAGPayloadToXml(args: SerializeArgs): Uint8Array {
  const doc = payloadToRiag(args.payload, { inputs: args.inputsHash, output: args.payloadHash });
  const root = riagToXmlElement(doc);
  return renderXmlBytes(root);
}
