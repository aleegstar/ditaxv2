/**
 * FormData → Canonical Dossier mapper.
 *
 * Defaults every value to `manual` provenance. AI/import callers should
 * post-process the resulting Dossier to override provenance where needed.
 *
 * NOTE: This mapper is intentionally permissive — missing fields produce
 * undefined Tracked<>, never thrown errors. The canonical model is
 * write-only in this phase, so partial dossiers are expected.
 */
import { Money, type CurrencyCode } from '../money';
import { manual } from '../provenance';
import type { Dossier, EmploymentIncome, Person, RealEstate, Canton } from '../types';
import { SCHEMA_VERSION } from '../types';

type AnyObj = Record<string, unknown>;

const num = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/['\s]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};

const m = (v: unknown, currency: CurrencyCode = 'CHF') => {
  const n = num(v);
  return n === undefined ? undefined : manual(Money.of(n, currency));
};

const s = (v: unknown) => {
  if (v === null || v === undefined) return undefined;
  const str = String(v).trim();
  return str === '' ? undefined : manual(str);
};

const tracked = <T>(v: T | undefined) => (v === undefined ? undefined : manual(v));

interface AssembleArgs {
  user_id: string;
  tax_filer_id: string;
  tax_year: string;
  canton?: Canton;
  formData: AnyObj | null | undefined;
}

function mapPersons(formData: AnyObj): Person[] {
  const persons: Person[] = [];
  const personal = (formData.personal ?? formData.personalInfo ?? formData.contactInfo ?? {}) as AnyObj;
  if (personal && Object.keys(personal).length) {
    persons.push({
      role: 'taxpayer',
      first_name: s(personal.firstName ?? personal.first_name),
      last_name: s(personal.lastName ?? personal.last_name),
      birth_date: s(personal.birthDate ?? personal.dateOfBirth),
      ahv_number: s(personal.ahvNumber ?? personal.ahv),
      nationality: s(personal.nationality),
      marital_status: s(personal.maritalStatus ?? personal.civilStatus),
      religion: s(personal.religion),
      address: s(personal.address),
      postal_code: s(personal.postalCode ?? personal.zip),
      city: s(personal.city),
      canton: tracked((personal.canton ?? personal.kanton) as Canton | undefined),
      municipality: s(personal.municipality),
      profession: s(personal.profession ?? personal.beruf),
      work_percentage: tracked(num(personal.workPercentage ?? personal.arbeitspensum)),
      place_of_origin: s(personal.placeOfOrigin ?? personal.heimatort),
      marriage_date: s(personal.marriageDate ?? personal.heiratsDatum),
      separation_date: s(personal.separationDate ?? personal.trennungsDatum),
      residence_change_date: s(personal.residenceChangeDate),
      previous_address: s(personal.previousAddress ?? personal.endYearAddress),
    });
  }

  const spouse = (formData.spouse ?? {}) as AnyObj;
  const hasSpouseInline = personal.spouseFirstName || personal.spouseLastName || personal.spouseBirthDate;
  if (spouse && Object.keys(spouse).length) {
    persons.push({
      role: 'spouse',
      first_name: s(spouse.firstName),
      last_name: s(spouse.lastName),
      birth_date: s(spouse.birthDate ?? spouse.dateOfBirth),
      ahv_number: s(spouse.ahvNumber),
      profession: s(spouse.profession),
      work_percentage: tracked(num(spouse.workPercentage)),
    });
  } else if (hasSpouseInline) {
    persons.push({
      role: 'spouse',
      first_name: s(personal.spouseFirstName),
      last_name: s(personal.spouseLastName),
      birth_date: s(personal.spouseBirthDate),
      religion: s(personal.spouseReligion),
    });
  }

  const children = (formData.children ?? personal.children ?? []) as AnyObj[];
  if (Array.isArray(children)) {
    for (const c of children) {
      persons.push({
        role: 'child',
        first_name: s(c.firstName),
        last_name: s(c.lastName),
        birth_date: s(c.birthDate ?? c.dateOfBirth),
      });
    }
  }
  return persons;
}

function mapEmployment(formData: AnyObj): EmploymentIncome[] {
  const income = (formData.income ?? {}) as AnyObj;
  // Primary source: per-employer entries from EmployerRepeater (income.employers)
  const formEmployers = Array.isArray(income.employers) ? (income.employers as AnyObj[]) : [];
  if (formEmployers.length > 0) {
    return formEmployers.map((emp) => {
      const lohn = (emp.lohnausweis ?? {}) as AnyObj;
      const employerName = s(lohn.employer_name) ?? s(emp.workLocation);
      // Salary preference: Bruttolohn total (Ziff. 8) > gross_salary (Ziff. 1)
      const salary = m(lohn.gross_total ?? lohn.gross_salary);
      const bonus = m(lohn.irregular_pay);
      const ahv = m(lohn.ahv_iv_eo_alv_nbuv);
      const pension = m(lohn.bvg_ordinary);
      const withholding = m(lohn.withholding_tax);
      const extra = Object.keys(lohn).length > 0 ? { lohnausweis: lohn } : undefined;
      return {
        employer: employerName,
        salary,
        bonus,
        pension_contributions: pension,
        ahv,
        withholding_tax: withholding,
        extra,
      };
    });
  }

  // Legacy path: aggregated income.employments / income.salary
  const employments = (income.employments ?? income.employmentList ?? []) as AnyObj[];
  if (!Array.isArray(employments) || !employments.length) {
    if (num(income.salary) !== undefined) {
      return [{
        employer: s(income.employer),
        salary: m(income.salary),
        bonus: m(income.bonus),
        pension_contributions: m(income.pensionContributions),
        ahv: m(income.ahv),
        withholding_tax: m(income.withholdingTax),
      }];
    }
    return [];
  }
  return employments.map((e) => ({
    employer: s(e.employer),
    salary: m(e.salary ?? e.grossSalary),
    bonus: m(e.bonus),
    pension_contributions: m(e.pensionContributions),
    ahv: m(e.ahv),
    withholding_tax: m(e.withholdingTax),
  }));
}

function mapRealEstate(formData: AnyObj): RealEstate[] {
  const list = (formData.realEstate ?? formData.properties ?? []) as AnyObj[];
  // form layer also stores properties under assets.properties
  const assetsObj = (formData.assets ?? {}) as AnyObj;
  const altList = Array.isArray(assetsObj.properties) ? (assetsObj.properties as AnyObj[]) : [];
  const merged = Array.isArray(list) && list.length ? list : altList;
  if (!Array.isArray(merged)) return [];
  return merged.map((r) => {
    const usage = (r.usage ?? r.use) as 'self' | 'rented' | undefined;
    return {
      address: s(r.address),
      canton: tracked(r.canton as Canton | undefined),
      municipality: s(r.municipality),
      usage: tracked(usage),
      purchase_value: m(r.purchaseValue),
      purchase_year: tracked(num(r.purchaseYear)),
      tax_value: m(r.taxValue),
      rental_income: m(r.rentalIncome),
      eigenmietwert: m(r.rentalValue ?? r.eigenmietwert),
      maintenance_costs: m(r.maintenanceCosts),
      maintenance_method: tracked(
        (r.maintenanceMethod ?? r.maintenance_method) as 'pauschal' | 'effektiv' | undefined,
      ),
      maintenance_value_preserving: m(r.maintenanceValuePreserving ?? r.werterhaltend),
      maintenance_value_increasing: m(r.maintenanceValueIncreasing ?? r.wertvermehrend),
    };
  });
}

function mapVehicles(assets: AnyObj): import('../types').VehicleAsset[] {
  const list = (assets.vehicles ?? []) as AnyObj[];
  if (!Array.isArray(list)) return [];
  return list.map((v) => {
    const value = num(v.value ?? v.purchasePrice);
    return {
      type: typeof v.type === 'string' ? v.type : undefined,
      brand: typeof v.brand === 'string' ? v.brand : (typeof v.name === 'string' ? v.name : undefined),
      model: typeof v.model === 'string' ? v.model : undefined,
      year: num(v.year ?? v.purchaseYear),
      value: value === undefined ? undefined : Money.of(value, 'CHF'),
      plate: typeof v.plate === 'string' ? v.plate : undefined,
    };
  });
}

function mapMortgages(debts: AnyObj, assets: AnyObj): import('../types').MortgageItem[] {
  // Prefer explicit debts.mortgages; otherwise pick mortgages out of assets.debts
  const explicit = (debts.mortgages ?? []) as AnyObj[];
  if (Array.isArray(explicit) && explicit.length) {
    return explicit.map((mt) => ({
      lender: typeof mt.lender === 'string' ? mt.lender : undefined,
      property_id: typeof mt.property_id === 'string' ? mt.property_id : undefined,
      balance: num(mt.balance) === undefined ? undefined : Money.of(num(mt.balance)!, 'CHF'),
      interest: num(mt.interest) === undefined ? undefined : Money.of(num(mt.interest)!, 'CHF'),
    }));
  }
  const assetDebts = Array.isArray(assets.debts) ? (assets.debts as AnyObj[]) : [];
  return assetDebts
    .filter((d) => d.type === 'mortgage')
    .map((d) => ({
      lender: typeof d.description === 'string' ? d.description : undefined,
      balance: num(d.amount) === undefined ? undefined : Money.of(num(d.amount)!, 'CHF'),
      interest: num(d.interest) === undefined ? undefined : Money.of(num(d.interest)!, 'CHF'),
    }));
}

function mapLoans(debts: AnyObj, assets: AnyObj): import('../types').LoanItem[] {
  const explicit = (debts.loans ?? []) as AnyObj[];
  if (Array.isArray(explicit) && explicit.length) {
    return explicit.map((l) => ({
      lender: typeof l.lender === 'string' ? l.lender : undefined,
      balance: num(l.balance) === undefined ? undefined : Money.of(num(l.balance)!, 'CHF'),
      interest: num(l.interest) === undefined ? undefined : Money.of(num(l.interest)!, 'CHF'),
    }));
  }
  const assetDebts = Array.isArray(assets.debts) ? (assets.debts as AnyObj[]) : [];
  return assetDebts
    .filter((d) => d.type !== 'mortgage')
    .map((d) => ({
      lender: typeof d.description === 'string' ? d.description : undefined,
      balance: num(d.amount) === undefined ? undefined : Money.of(num(d.amount)!, 'CHF'),
      interest: num(d.interest) === undefined ? undefined : Money.of(num(d.interest)!, 'CHF'),
    }));
}

export function assembleDossier({ user_id, tax_filer_id, tax_year, canton, formData }: AssembleArgs): Dossier {
  const f = (formData ?? {}) as AnyObj;
  const assets = (f.assets ?? {}) as AnyObj;
  const debts = (f.debts ?? f.liabilities ?? {}) as AnyObj;
  const deductions = (f.deductions ?? {}) as AnyObj;

  return {
    user_id,
    tax_filer_id,
    tax_year,
    canton,
    status: 'draft',
    schema_version: SCHEMA_VERSION,
    current_revision: 0,
    validation_status: {},
    currency: 'CHF',
    persons: mapPersons(f),
    household: {
      children_count: Array.isArray(f.children) ? (f.children as unknown[]).length : 0,
      dependents_count: 0,
    },
    employment_incomes: mapEmployment(f),
    self_employment_incomes: [],
    pension_incomes: [],
    assets: {
      bank_accounts: Array.isArray(assets.bankAccounts) ? (assets.bankAccounts as never) : [],
      cash: m(assets.cash),
      securities: Array.isArray(assets.securities) ? (assets.securities as never) : [],
      crypto_assets: Array.isArray(assets.cryptoAssets) ? (assets.cryptoAssets as never) : [],
      foreign_assets: Array.isArray(assets.foreignAssets) ? (assets.foreignAssets as never) : [],
      vehicles: mapVehicles(assets),
    },
    debts: {
      mortgages: mapMortgages(debts, assets),
      loans: mapLoans(debts, assets),
      interest_paid: m(debts.interestPaid),
    },
    real_estate: mapRealEstate(f),
    deductions: {
      commuting: (deductions.commuting as AnyObj) ?? {},
      meals: (deductions.meals as AnyObj) ?? {},
      education: (deductions.education as AnyObj) ?? {},
      health_costs: (deductions.healthCosts as AnyObj) ?? {},
      pillar3a: m(deductions.pillar3a),
      donations: (deductions.donations as AnyObj) ?? {},
      childcare: (deductions.childcare as AnyObj) ?? {},
      other: (deductions.other as AnyObj) ?? {},
    },
    attachments: [],
  };
}
