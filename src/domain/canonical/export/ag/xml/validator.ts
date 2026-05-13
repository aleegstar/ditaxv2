/**
 * Pre-export validator for AG payloads. Blocks export on fatal errors and
 * surfaces non-blocking warnings.
 *
 * Pure: no I/O. Deterministic: findings are emitted in a stable order.
 */
import type { AGExportPayload, AGMoney } from '../types';

export type ValidationSeverity = 'error' | 'warning';

export interface ExportValidationFinding {
  severity: ValidationSeverity;
  code: string;
  message: string;
  path?: string;
}

export interface ExportValidationResult {
  ok: boolean;
  errors: ExportValidationFinding[];
  warnings: ExportValidationFinding[];
  findings: ExportValidationFinding[];
}

const isDecimalString = (s: unknown): s is string =>
  typeof s === 'string' && /^-?\d+(\.\d+)?$/.test(s);

function checkMoney(m: AGMoney | undefined, path: string, errors: ExportValidationFinding[]) {
  if (!m) return;
  if (!isDecimalString(m.amount)) {
    errors.push({ severity: 'error', code: 'MONEY_NOT_NORMALIZED', message: `Money at ${path} not normalized to decimal string`, path });
  }
  if (m.currency !== 'CHF') {
    errors.push({ severity: 'error', code: 'MONEY_BAD_CURRENCY', message: `Money at ${path} must be CHF`, path });
  }
}

export function validateAGPayload(payload: AGExportPayload): ExportValidationResult {
  const errors: ExportValidationFinding[] = [];
  const warnings: ExportValidationFinding[] = [];
  const m = payload.metadata;

  if (!m) errors.push({ severity: 'error', code: 'META_MISSING', message: 'Metadata missing' });
  else {
    if (m.canton !== 'AG') errors.push({ severity: 'error', code: 'CANTON_MISMATCH', message: `Canton must be AG (got ${m.canton})`, path: 'metadata.canton' });
    if (!m.tax_year) errors.push({ severity: 'error', code: 'TAX_YEAR_MISSING', message: 'tax_year missing', path: 'metadata.tax_year' });
    if (!m.dossier_id) errors.push({ severity: 'error', code: 'DOSSIER_ID_MISSING', message: 'dossier_id missing', path: 'metadata.dossier_id' });
    if (typeof m.dossier_revision !== 'number') errors.push({ severity: 'error', code: 'REVISION_MISSING', message: 'dossier_revision missing', path: 'metadata.dossier_revision' });
    if (!m.generated_at) errors.push({ severity: 'error', code: 'GENERATED_AT_MISSING', message: 'generated_at missing', path: 'metadata.generated_at' });
  }

  const t = payload.taxpayer;
  if (!t) errors.push({ severity: 'error', code: 'TAXPAYER_MISSING', message: 'Taxpayer missing', path: 'taxpayer' });
  else {
    if (!t.first_name) errors.push({ severity: 'error', code: 'TAXPAYER_FIRST_NAME', message: 'Taxpayer first name missing', path: 'taxpayer.first_name' });
    if (!t.last_name)  errors.push({ severity: 'error', code: 'TAXPAYER_LAST_NAME',  message: 'Taxpayer last name missing',  path: 'taxpayer.last_name' });
    if (!t.birth_date) errors.push({ severity: 'error', code: 'TAXPAYER_BIRTH_DATE', message: 'Taxpayer birth date missing', path: 'taxpayer.birth_date' });
    if (!t.ahv_number) errors.push({ severity: 'error', code: 'TAXPAYER_AHV',        message: 'Taxpayer AHV number missing',  path: 'taxpayer.ahv_number' });
  }

  if (payload.spouse) {
    const s = payload.spouse;
    if (!s.first_name) errors.push({ severity: 'error', code: 'SPOUSE_FIRST_NAME', message: 'Spouse first name missing', path: 'spouse.first_name' });
    if (!s.last_name)  errors.push({ severity: 'error', code: 'SPOUSE_LAST_NAME',  message: 'Spouse last name missing',  path: 'spouse.last_name' });
    if (!s.birth_date) errors.push({ severity: 'error', code: 'SPOUSE_BIRTH_DATE', message: 'Spouse birth date missing', path: 'spouse.birth_date' });
  }

  payload.incomes.forEach((inc, i) => {
    if (inc.kind === 'employment') {
      checkMoney(inc.salary, `incomes[${i}].salary`, errors);
      checkMoney(inc.bonus, `incomes[${i}].bonus`, errors);
      checkMoney(inc.pension_contributions, `incomes[${i}].pension_contributions`, errors);
      checkMoney(inc.ahv, `incomes[${i}].ahv`, errors);
      checkMoney(inc.withholding_tax, `incomes[${i}].withholding_tax`, errors);
    }
  });
  checkMoney(payload.assets.cash, 'assets.cash', errors);
  payload.assets.bank_accounts.forEach((b, i) => {
    checkMoney(b.balance, `assets.bank_accounts[${i}].balance`, errors);
    checkMoney(b.interest, `assets.bank_accounts[${i}].interest`, errors);
  });
  payload.deductions.forEach((d, i) => checkMoney(d.amount, `deductions[${i}].amount`, errors));

  if (!payload.incomes.length) warnings.push({ severity: 'warning', code: 'NO_INCOMES', message: 'No incomes provided' });
  if (!payload.assets.bank_accounts.length && !payload.assets.cash) {
    warnings.push({ severity: 'warning', code: 'NO_ASSETS', message: 'No basic assets provided' });
  }
  if (t && !t.address) warnings.push({ severity: 'warning', code: 'NO_ADDRESS', message: 'Taxpayer has no address', path: 'taxpayer.address' });

  errors.sort((a, b) => (a.path ?? '').localeCompare(b.path ?? '') || a.code.localeCompare(b.code));
  warnings.sort((a, b) => (a.path ?? '').localeCompare(b.path ?? '') || a.code.localeCompare(b.code));

  return { ok: errors.length === 0, errors, warnings, findings: [...errors, ...warnings] };
}
