
import { FormData } from '@/types';

export interface TaxReturnProgressData {
  formData?: any[];
  uploadedDocuments?: any[];
  paymentStatus?: string;
  checklistItems?: any[];
  workflowStep?: string;
  status?: string;
  formProgress?: {
    contactInfo?: boolean;
    income?: boolean;
    assets?: boolean;
    deductions?: boolean;
    documents?: boolean;
  };
}

export const calculateTaxReturnProgress = (data: TaxReturnProgressData): number => {
  let progress = 0;

  // If tax return is completed, return 100%
  if (data.status === 'completed') {
    return 100;
  }

  // If we have a workflow step, use it to determine major progress milestones
  // But only give progress if there's actual data
  if (data.workflowStep) {
    switch (data.workflowStep) {
      case 'data_collection':
        // Only give progress if there's actual form data
        const hasAnyFormData = data.formData && data.formData.some(fd => fd.data);
        const hasFormProgress = data.formProgress && Object.values(data.formProgress).some(completed => completed);
        if (hasAnyFormData || hasFormProgress) {
          progress = Math.max(progress, 25);
        }
        break;
      case 'document_upload':
        progress = Math.max(progress, 35); // Data collection done, uploading documents
        break;
      case 'submission':
        progress = Math.max(progress, 60); // Ready for submission
        break;
      case 'creation_in_progress':
        progress = Math.max(progress, 75); // Payment done, admin is working on it
        break;
      case 'completed':
        return 100; // Fully completed
      default:
        break;
    }
  }

  // Use form progress data if available
  if (data.formProgress) {
    let completedSections = 0;
    const totalSections = 4; // contactInfo, income, assets, deductions

    if (data.formProgress.contactInfo) completedSections++;
    if (data.formProgress.income) completedSections++;
    if (data.formProgress.assets) completedSections++;
    if (data.formProgress.deductions) completedSections++;

    const formProgress = (completedSections / totalSections) * 60; // Form data contributes 60% max
    progress = Math.max(progress, formProgress);
  }

  // Fallback to detailed calculation if no form progress data
  if (!data.formProgress && data.formData) {
    // Kontaktangaben: +25%
    if (data.formData.some(fd => fd.form_type === 'contactInfo' && fd.data)) {
      progress = Math.max(progress, 25);
    }

    // Einkommen Form: +10%
    if (data.formData.some(fd => fd.form_type === 'income' && fd.data)) {
      progress = Math.max(progress, 35);
    }

    // Abzüge Form: +10%
    if (data.formData.some(fd => fd.form_type === 'deductions' && fd.data)) {
      progress = Math.max(progress, 45);
    }

    // Vermögen Form: +10%
    if (data.formData.some(fd => fd.form_type === 'assets' && fd.data)) {
      progress = Math.max(progress, 55);
    }
  }

  // Documents: +25%
  if (data.uploadedDocuments && data.uploadedDocuments.length > 0) {
    progress = Math.max(progress, 80);
  }

  // Bezahlt: +15%
  if (data.paymentStatus === 'paid') {
    progress = Math.max(progress, 95);
  }

  return Math.min(progress, 100); // Cap at 100%
};
