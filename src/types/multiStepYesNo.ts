export interface YesNoQuestion {
  id: string;
  text: string;
  explanation?: string;
  /**
   * When set, the question renders an alternative input (e.g. a dropdown for
   * count selection) instead of the swipe-card Yes/No UI. The answer for
   * dropdown questions is stored as a number on the section (key = `id`).
   */
  inputType?: 'yesno' | 'dropdown';
  dropdownOptions?: {
    /** Inclusive range of integer options shown in the dropdown. */
    min: number;
    max: number;
    /** Label for the option that opens a free numeric input above `max`. */
    moreLabel?: string;
    /** Label for value 0. */
    zeroLabel?: string;
  };
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