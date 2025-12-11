export interface YesNoQuestion {
  id: string;
  text: string;
  explanation?: string;
  requiresRepeater?: {
    component: 'EmployerRepeater' | 'RentalIncomeRepeater' | 'VehicleRepeater' | 'PropertyRepeater' | 'DebtRepeater';
    minimumEntries: number;
    title: string;
  };
}

export interface QuestionConfig {
  section: 'income' | 'assets' | 'deductions';
  questions: YesNoQuestion[];
}

export interface MultiStepFormState {
  currentQuestionIndex: number;
  answers: Record<string, boolean>;
  repeaterData: Record<string, any[]>;
  isComplete: boolean;
  mode: 'standard' | 'yesno';
}

export interface FormSummaryItem {
  questionId: string;
  questionText: string;
  answer: boolean;
  repeaterData?: any[];
  repeaterTitle?: string;
}