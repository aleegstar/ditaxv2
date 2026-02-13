import { ChecklistItem, FormSectionKey, ContactInfo, Income, Assets, Deductions } from '../../types';

// Use the main types instead of duplicating them
export interface FormData {
  contactInfo: ContactInfo;
  contact?: ContactInfo; // Make contact optional for backward compatibility
  income: Income;
  assets: Assets;
  deductions: Deductions;
}

export interface FormProgressType {
  contactInfo: boolean;
  contact?: boolean; // Make contact optional for backward compatibility
  income: boolean;
  assets: boolean;
  deductions: boolean;
  summary?: boolean; // Summary confirmation step
  documents?: boolean; // Make documents optional for backward compatibility
  submit?: boolean; // Make submit optional for backward compatibility
}

export interface QuestionProgressType {
  income?: number;
  assets?: number;
  deductions?: number;
}

export interface FormContextType {
  formData: FormData;
  updateFormData: (section: FormSectionKey, data: Record<string, any>) => void;
  formProgress: FormProgressType;
  updateFormProgress: (section: FormSectionKey, completed: boolean) => void;
  questionProgress: QuestionProgressType;
  updateQuestionProgress: (section: 'income' | 'assets' | 'deductions', questionIndex: number) => void;
  loading: boolean;
  isDataLoading: boolean;
  isSwitchingTaxYear: boolean;
  saveSection: (section: FormSectionKey, data: any, markComplete?: boolean) => Promise<void>;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  taxYear: string;
  setTaxYear: (year: string) => Promise<void>;
  formDataLoaded: boolean;
  checklistItems: ChecklistItem[];
  generateChecklist: () => ChecklistItem[];
  uploadedDocuments: any[];
  addDocument: (doc: any) => void;
  removeDocument: (docId: string) => void;
  markUploaded: (itemId: string, uploaded: boolean) => void;
  clearDocuments: () => void;
  lastChecklistUpdate: Date | null;
  handleNext: () => void;
  handleBack: () => void;
  isItemUploaded: (id: string) => boolean;
  calculateProgress: () => number;
  loadFormProgress: () => Promise<void>;
  loadDocuments: (forceRefresh?: boolean) => Promise<void>;
  checklist: ChecklistItem[];
  uploadedDocs: any[];
  documents: any[];
  addChild: (childData: any) => void;
  removeChild: (childId: string) => void;
  updateChild: (childId: string, data: any) => void;
  validationErrors: Record<string, string[]>;
  updateValidationErrors: (formType: FormSectionKey, errors: string[]) => void;
  clearValidationErrors: (formType: FormSectionKey) => void;
  hasValidationError: (formType: FormSectionKey, fieldName: string) => boolean;
  hasDataForPreviousYear: (section: FormSectionKey) => Promise<boolean>;
  importFromPreviousYear: (section: FormSectionKey) => Promise<void>;
  resetFormField: (section: FormSectionKey, fieldName: string) => void;
  resetFormSection: (section: FormSectionKey) => void;
  // Chat history functions
  chatHistory: Array<{
    stepId: string;
    question: string;
    answer: any;
    stepType: 'text' | 'boolean' | 'select' | 'address' | 'repeater';
    explanation?: string;
  }>;
  saveChatMessage: (stepId: string, messageType: 'question' | 'answer', content: string, stepIndex: number) => Promise<void>;
  loadChatHistory: () => Promise<void>;
  clearChatHistory: () => void;
  // Document progress functions
  updateDocumentProgress: () => void;
}
