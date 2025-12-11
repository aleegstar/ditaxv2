export interface SimplifiedFormData {
  income: Record<string, boolean>;
  assets: Record<string, boolean>;
  deductions: Record<string, boolean>;
  repeaterCounts: Record<string, number>;
}