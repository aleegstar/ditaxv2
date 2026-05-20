import { FormSectionKey } from '@/types';

/**
 * Field names that contain CHF amounts and MUST NOT be carried over from
 * the previous year. The user must always re-enter these for the current year
 * based on official documents (Lohnausweis, Bankauszüge, etc.).
 */
const TOP_LEVEL_AMOUNT_FIELDS: Record<FormSectionKey | string, string[]> = {
  income: [
    'employmentIncome',
    'selfEmploymentIncome',
    'rentalIncome',
    'capitalIncome',
    'pensionIncome',
    'otherIncome',
  ],
  assets: [
    'bankAccounts',
    'stocks',
    'realEstate',
    'cryptocurrency',
    'otherAssets',
  ],
  deductions: [
    'healthInsurance',
    'charitableDonations',
    'retirementContributions',
    'medicalExpenses',
    'educationExpenses',
    'childcareExpenses',
  ],
  contactInfo: [],
  contact: [],
};

/**
 * Field names inside repeater entries that hold CHF amounts / year-specific
 * values and must be reset on import.
 */
const NESTED_AMOUNT_FIELDS: Record<string, string[]> = {
  // income.employers[]
  employers: [
    'grossSalary',
    'netSalary',
    'withholdingTax',
    'bonus',
    'expenses',
    'amount',
    'value',
  ],
  // income.rentalIncomes[]
  rentalIncomes: ['rentalIncome', 'income', 'amount', 'value'],
  // income.dividends[]
  dividends: ['amount', 'value', 'grossAmount', 'withholdingTax'],
  // income.freelanceIncome[]
  freelanceIncome: ['amount', 'income', 'value'],
  // assets.vehicles[]
  vehicles: ['currentValue', 'value', 'purchasePrice'],
  // assets.properties[]
  properties: [
    'marketValue',
    'taxValue',
    'mortgageBalance',
    'maintenanceCosts',
    'rentalIncome',
  ],
  // assets.debts[]
  debts: ['balance', 'remainingDebt', 'interestRate', 'interestPaid', 'amount'],
  // deductions.supportedPersons[]
  supportedPersons: ['amount', 'supportAmount'],
  // deductions.maintenancePayments[]
  maintenancePayments: ['amount', 'monthlyAmount', 'yearlyAmount'],
};

const sanitizeArray = (key: string, arr: any[]): any[] => {
  const blacklist = NESTED_AMOUNT_FIELDS[key];
  if (!blacklist || !Array.isArray(arr)) return arr;
  return arr.map((entry) => {
    if (!entry || typeof entry !== 'object') return entry;
    const cleaned: Record<string, any> = { ...entry };
    for (const field of blacklist) {
      if (field in cleaned) {
        const v = cleaned[field];
        cleaned[field] = typeof v === 'number' ? 0 : '';
      }
    }
    return cleaned;
  });
};

/**
 * Returns a copy of `data` with all CHF amounts cleared so the user is forced
 * to enter current-year values. Boolean flags, structures, names, addresses,
 * IDs, etc. are preserved.
 */
export const sanitizeImportedData = (
  section: FormSectionKey,
  data: Record<string, any>
): Record<string, any> => {
  const result: Record<string, any> = { ...data };

  // Top-level amount fields → reset
  const topBlacklist = TOP_LEVEL_AMOUNT_FIELDS[section] ?? [];
  for (const field of topBlacklist) {
    if (field in result) {
      const v = result[field];
      result[field] = typeof v === 'number' ? 0 : '';
    }
  }

  // Nested arrays → reset amount fields per entry
  for (const key of Object.keys(NESTED_AMOUNT_FIELDS)) {
    if (Array.isArray(result[key])) {
      result[key] = sanitizeArray(key, result[key]);
    }
  }

  // Legacy migration: hasDepositAccount → accountCount (1 if true, 0 otherwise)
  if (section === 'assets' && 'hasDepositAccount' in result && result.accountCount === undefined) {
    result.accountCount = result.hasDepositAccount ? 1 : 0;
    delete result.hasDepositAccount;
  }

  return result;
};
