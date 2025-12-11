
import { FormSectionKey } from '@/types';

// Get the tax year (usually previous year)
export const getTaxYear = (): string => {
  const currentYear = new Date().getFullYear();
  return (currentYear - 1).toString();
};

// Format date string to a readable format
export const formatDateString = (date: string): string => {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString();
  } catch (e) {
    console.error('Error formatting date:', e);
    return date;
  }
};

// Create empty checklist item map
export const createEmptyChecklistItemMap = (): Record<string, boolean> => {
  return {};
};

// Category order for sorting items
export const categoryOrder: FormSectionKey[] = ['contactInfo', 'income', 'assets', 'deductions'];
