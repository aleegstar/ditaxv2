/**
 * Canonical Dossier → AG export payload mapper.
 *
 * Pure function. No I/O. No randomness. No clock reads.
 * Determinism guarantees:
 *  - Arrays are sorted by stable keys (index assigned before sort where needed).
 *  - Money normalized via Money.toDb (string + currency).
 *  - Empty objects/arrays preserved with stable shape.
 *  - Provenance refs are intentionally NOT inlined into AG payload (kept
 *    separate so XML output stays clean); inputs_hash covers them via dossier.
 */
import type {
  Dossier, Person, EmploymentIncome, PensionIncome, SelfEmploymentIncome,
  Assets, Debts, RealEstate, Deductions, Attachment,
} from '../../types';
import { Money } from '../../money';
import type {
  AGAddress, AGAssets, AGAttachment, AGBankAccount, AGCryptoAsset, AGDebts,
  AGDeductionEntry, AGEmploymentIncome, AGExportPayload, AGForeignAsset,
  AGHousehold, AGIncome, AGLoan, AGMortgage, AGPensionIncome, AGPerson,
  AGRealEstate, AGSecurityHolding, AGSelfEmploymentIncome, AGMoney, AGVehicle,
} from './types';

// ── Helpers ────────────────────────────────────────────────────────────────

const def = <T>(v: T | undefined | null): T | undefined =>
  v === undefined || v === null ? undefined : v;

const money = (m: import('../../money').Money | undefined | null): AGMoney | undefined => {
  if (!m) return undefined;
  const db = Money.toDb(m);
  if (db.amount === null) return undefined;
  return { amount: db.amount, currency: 'CHF' };
};

const tval = <T>(t: { value: T } | undefined): T | undefined => t?.value;

/** Strip undefined keys for stable JSON. Returns object only with present keys. */
const compact = <T extends Record<string, unknown>>(o: T): T => {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(o).sort()) {
    if (o[k] !== undefined) out[k] = o[k];
  }
  return out as T;
};

// ── Person / Address ───────────────────────────────────────────────────────

function mapAddress(p: Person): AGAddress | undefined {
  const a = compact({
    street: tval(p.address),
    postal_code: tval(p.postal_code),
    city: tval(p.city),
    canton: tval(p.canton),
    municipality: tval(p.municipality),
  });
  return Object.keys(a).length ? a : undefined;
}

function mapPerson(p: Person): AGPerson {
  return compact({
    role: p.role,
    first_name: tval(p.first_name),
    last_name: tval(p.last_name),
    birth_date: tval(p.birth_date),
    ahv_number: tval(p.ahv_number),
    nationality: tval(p.nationality),
    marital_status: tval(p.marital_status),
    religion: tval(p.religion),
    address: mapAddress(p),
    profession: tval(p.profession),
    work_percentage: tval(p.work_percentage),
    place_of_origin: tval(p.place_of_origin),
    marriage_date: tval(p.marriage_date),
    separation_date: tval(p.separation_date),
    residence_change_date: tval(p.residence_change_date),
    previous_address: tval(p.previous_address),
  }) as AGPerson;
}

// ── Incomes ────────────────────────────────────────────────────────────────

function mapEmployment(e: EmploymentIncome, index: number): AGEmploymentIncome {
  return compact({
    index,
    employer: tval(e.employer),
    salary: money(tval(e.salary)),
    bonus: money(tval(e.bonus)),
    pension_contributions: money(tval(e.pension_contributions)),
    ahv: money(tval(e.ahv)),
    withholding_tax: money(tval(e.withholding_tax)),
    source_document_id: e.source_document_id,
  }) as AGEmploymentIncome;
}

function mapPension(p: PensionIncome, index: number): AGPensionIncome {
  return compact({
    index,
    ahv_income: money(tval(p.ahv_income)),
    pension_income: money(tval(p.pension_income)),
    pillar3a: money(tval(p.pillar3a)),
    pillar3b: money(tval(p.pillar3b)),
  }) as AGPensionIncome;
}

function mapSelfEmployment(s: SelfEmploymentIncome, index: number): AGSelfEmploymentIncome {
  return compact({
    index,
    business_name: tval(s.business_name),
    revenue: money(tval(s.revenue)),
    expenses: money(tval(s.expenses)),
    net_income: money(tval(s.net_income)),
  }) as AGSelfEmploymentIncome;
}

// ── Assets / Debts / RE ────────────────────────────────────────────────────

function mapAssets(a: Assets | undefined): AGAssets {
  if (!a) return { bank_accounts: [], securities: [], crypto_assets: [], foreign_assets: [], vehicles: [] };
  const bank_accounts: AGBankAccount[] = (a.bank_accounts ?? []).map((b, i) => compact({
    index: i, bank: b.bank, iban: b.iban, account_type: b.account_type,
    balance: money(b.balance), interest: money(b.interest),
    withholding_tax: money(b.withholding_tax),
  }) as AGBankAccount);
  const securities: AGSecurityHolding[] = (a.securities ?? []).map((s, i) => compact({
    index: i, isin: s.isin, description: s.description, quantity: s.quantity,
    market_value: money(s.market_value), dividend: money(s.dividend),
    withholding_tax: money(s.withholding_tax),
    purchase_value: money(s.purchase_value),
    purchase_date: s.purchase_date,
    request_withholding_refund: s.request_withholding_refund,
  }) as AGSecurityHolding);
  const crypto_assets: AGCryptoAsset[] = (a.crypto_assets ?? []).map((c, i) => compact({
    index: i, asset: c.asset, quantity: c.quantity, fair_value: money(c.fair_value),
  }) as AGCryptoAsset);
  const foreign_assets: AGForeignAsset[] = (a.foreign_assets ?? []).map((f, i) => compact({
    index: i, country: f.country, description: f.description, value: money(f.value),
  }) as AGForeignAsset);
  const vehicles: AGVehicle[] = (a.vehicles ?? []).map((v, i) => compact({
    index: i, type: v.type, brand: v.brand, model: v.model, year: v.year,
    value: money(v.value), plate: v.plate,
  }) as AGVehicle);
  return compact({ cash: money(tval(a.cash)), bank_accounts, securities, crypto_assets, foreign_assets, vehicles }) as AGAssets;
}

function mapDebts(d: Debts | undefined): AGDebts {
  if (!d) return { mortgages: [], loans: [] };
  const mortgages: AGMortgage[] = (d.mortgages ?? []).map((m, i) => compact({
    index: i, lender: m.lender, property_id: m.property_id, balance: money(m.balance), interest: money(m.interest),
  }) as AGMortgage);
  const loans: AGLoan[] = (d.loans ?? []).map((l, i) => compact({
    index: i, lender: l.lender, balance: money(l.balance), interest: money(l.interest),
  }) as AGLoan);
  return compact({ mortgages, loans, interest_paid: money(tval(d.interest_paid)) }) as AGDebts;
}

function mapRealEstate(r: RealEstate, index: number): AGRealEstate {
  return compact({
    index,
    address: tval(r.address), canton: tval(r.canton), municipality: tval(r.municipality),
    usage: tval(r.usage),
    purchase_value: money(tval(r.purchase_value)),
    purchase_year: tval(r.purchase_year),
    tax_value: money(tval(r.tax_value)),
    rental_income: money(tval(r.rental_income)),
    eigenmietwert: money(tval(r.eigenmietwert)),
    maintenance_costs: money(tval(r.maintenance_costs)),
    maintenance_method: tval(r.maintenance_method),
    maintenance_value_preserving: money(tval(r.maintenance_value_preserving)),
    maintenance_value_increasing: money(tval(r.maintenance_value_increasing)),
  }) as AGRealEstate;
}

// ── Deductions ─────────────────────────────────────────────────────────────

function mapDeductions(d: Deductions | undefined): AGDeductionEntry[] {
  if (!d) return [];
  const entries: AGDeductionEntry[] = [];
  const pushDetail = (
    category: AGDeductionEntry['category'],
    raw: Record<string, unknown> | undefined,
  ) => {
    if (!raw || Object.keys(raw).length === 0) return;
    const amountRaw = raw.amount;
    let amount: AGMoney | undefined;
    if (typeof amountRaw === 'number' && Number.isFinite(amountRaw)) {
      amount = { amount: amountRaw.toFixed(2), currency: 'CHF' };
    } else if (typeof amountRaw === 'string' && /^-?\d+(\.\d+)?$/.test(amountRaw)) {
      amount = { amount: amountRaw, currency: 'CHF' };
    }
    entries.push(compact({ category, amount, details: raw }) as AGDeductionEntry);
  };
  pushDetail('commuting', d.commuting);
  pushDetail('meals', d.meals);
  pushDetail('education', d.education);
  pushDetail('health_costs', d.health_costs);
  if (d.pillar3a) {
    const m = money(tval(d.pillar3a));
    if (m) entries.push({ category: 'pillar3a', amount: m });
  }
  pushDetail('donations', d.donations);
  pushDetail('childcare', d.childcare);
  pushDetail('other', d.other);
  // Stable order: by category alphabetically (already deterministic from order above,
  // but enforce explicitly).
  entries.sort((a, b) => a.category.localeCompare(b.category));
  return entries;
}

function mapAttachments(list: Attachment[]): AGAttachment[] {
  return list.map((a, i) => compact({
    index: i, uploaded_document_id: a.uploaded_document_id, mime_type: a.mime_type,
  }) as AGAttachment).sort((x, y) => x.index - y.index);
}

// ── Top-level mapper ───────────────────────────────────────────────────────

export interface MapAGOptions {
  metadata: AGExportPayload['metadata'];
}

export function mapDossierToAG(d: Dossier, opts: MapAGOptions): AGExportPayload {
  const taxpayer = d.persons.find((p) => p.role === 'taxpayer');
  const spouse   = d.persons.find((p) => p.role === 'spouse');
  const children = d.persons.filter((p) => p.role === 'child').map(mapPerson);

  const employmentIncomes: AGIncome[] = d.employment_incomes.map((e, i) => ({
    kind: 'employment', ...mapEmployment(e, i),
  }));
  const pensionIncomes: AGIncome[] = d.pension_incomes.map((p, i) => ({
    kind: 'pension', ...mapPension(p, i),
  }));
  const seIncomes: AGIncome[] = d.self_employment_incomes.map((s, i) => ({
    kind: 'self_employment', ...mapSelfEmployment(s, i),
  }));
  const incomes = [...employmentIncomes, ...seIncomes, ...pensionIncomes];

  const household: AGHousehold | undefined = d.household
    ? compact({
        marital_status_effective: tval(d.household.marital_status_effective),
        children_count: d.household.children_count,
        dependents_count: d.household.dependents_count,
      }) as AGHousehold
    : undefined;

  const realEstate = d.real_estate.map((r, i) => mapRealEstate(r, i));

  return {
    metadata: opts.metadata,
    taxpayer: taxpayer ? mapPerson(taxpayer) : undefined,
    spouse:   spouse   ? mapPerson(spouse)   : undefined,
    children,
    household,
    incomes,
    assets: mapAssets(d.assets),
    debts: mapDebts(d.debts),
    real_estate: realEstate,
    deductions: mapDeductions(d.deductions),
    attachments: mapAttachments(d.attachments),
  };
}
