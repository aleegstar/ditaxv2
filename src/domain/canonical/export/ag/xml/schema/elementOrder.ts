/**
 * Canonical element ordering tables. The serializer iterates these arrays
 * (not Object.keys) when emitting children so XML output is byte-stable.
 */

export const PERSON_ORDER = [
  'role',
  'firstName',
  'lastName',
  'birthDate',
  'ahvNumber',
  'nationality',
  'maritalStatus',
  'religion',
  'address',
] as const;

export const ADDRESS_ORDER = [
  'street',
  'postalCode',
  'city',
  'municipality',
  'canton',
] as const;

export const HOUSEHOLD_ORDER = [
  'maritalStatusEffective',
  'childrenCount',
  'dependentsCount',
] as const;

export const EMPLOYMENT_ORDER = [
  'employer',
  'salary',
  'bonus',
  'pensionContributions',
  'ahv',
  'withholdingTax',
] as const;

export const BANK_ACCOUNT_ORDER = ['bank', 'iban', 'balance', 'interest'] as const;

export const DEDUCTION_ORDER = ['category', 'amount'] as const;

export const DOCUMENT_ORDER = [
  'metadata',
  'revision',
  'persons',
  'household',
  'incomes',
  'assets',
  'deductions',
  'attachments',
] as const;
