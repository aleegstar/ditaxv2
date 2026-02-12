import { QuestionConfig, YesNoQuestion } from '../types/multiStepYesNo';
import { Translation } from '@/i18n/translations';

// Helper to get question with repeater config
const createQuestion = (
  id: string,
  text: string,
  explanation: string,
  requiresRepeater?: YesNoQuestion['requiresRepeater']
): YesNoQuestion => ({
  id,
  text,
  explanation,
  ...(requiresRepeater && { requiresRepeater })
});

export const getIncomeQuestions = (t: Translation): QuestionConfig => ({
  section: 'income',
  questions: [
    createQuestion(
      'hasPension',
      t.yesNoForm.questions.income.hasPension.text,
      t.yesNoForm.questions.income.hasPension.explanation
    ),
    createQuestion(
      'hasGiftInheritance',
      t.yesNoForm.questions.income.hasGiftInheritance.text,
      t.yesNoForm.questions.income.hasGiftInheritance.explanation
    ),
    createQuestion(
      'hasPensionPayout',
      t.yesNoForm.questions.income.hasPensionPayout.text,
      t.yesNoForm.questions.income.hasPensionPayout.explanation
    ),
    createQuestion(
      'hasRental',
      t.yesNoForm.questions.income.hasRental.text,
      t.yesNoForm.questions.income.hasRental.explanation
    ),
    createQuestion(
      'hasOtherIncome',
      t.yesNoForm.questions.income.hasOtherIncome.text,
      t.yesNoForm.questions.income.hasOtherIncome.explanation
    ),
    createQuestion(
      'hasFreelance',
      t.yesNoForm.questions.income.hasFreelance.text,
      t.yesNoForm.questions.income.hasFreelance.explanation
    ),
    createQuestion(
      'hasSalary',
      t.yesNoForm.questions.income.hasSalary.text,
      t.yesNoForm.questions.income.hasSalary.explanation,
      {
        component: 'EmployerRepeater',
        minimumEntries: 1,
        title: 'Arbeitgeber Details'
      }
    )
  ]
});

export const getAssetsQuestions = (t: Translation): QuestionConfig => ({
  section: 'assets',
  questions: [
    createQuestion(
      'hasVehicle',
      t.yesNoForm.questions.assets.hasVehicle.text,
      t.yesNoForm.questions.assets.hasVehicle.explanation,
      {
        component: 'VehicleRepeater',
        minimumEntries: 1,
        title: 'Fahrzeug Details'
      }
    ),
    createQuestion(
      'hasProperty',
      t.yesNoForm.questions.assets.hasProperty.text,
      t.yesNoForm.questions.assets.hasProperty.explanation,
      {
        component: 'PropertyRepeater',
        minimumEntries: 1,
        title: 'Immobilien Details'
      }
    ),
    createQuestion(
      'hasMortgage',
      t.yesNoForm.questions.assets.hasMortgage.text,
      t.yesNoForm.questions.assets.hasMortgage.explanation
    ),
    createQuestion(
      'hasDebt',
      t.yesNoForm.questions.assets.hasDebt.text,
      t.yesNoForm.questions.assets.hasDebt.explanation,
      {
        component: 'DebtRepeater',
        minimumEntries: 1,
        title: 'Schulden Details'
      }
    ),
    createQuestion(
      'hasDepositAccount',
      t.yesNoForm.questions.assets.hasDepositAccount.text,
      t.yesNoForm.questions.assets.hasDepositAccount.explanation
    ),
    createQuestion(
      'hasCrypto',
      t.yesNoForm.questions.assets.hasCrypto.text,
      t.yesNoForm.questions.assets.hasCrypto.explanation
    ),
    createQuestion(
      'hasOtherAssets',
      t.yesNoForm.questions.assets.hasOtherAssets.text,
      t.yesNoForm.questions.assets.hasOtherAssets.explanation
    )
  ]
});

export const getDeductionsQuestions = (t: Translation): QuestionConfig => ({
  section: 'deductions',
  questions: [
    createQuestion(
      'hasPillar3a',
      t.yesNoForm.questions.deductions.hasPillar3a.text,
      t.yesNoForm.questions.deductions.hasPillar3a.explanation
    ),
    createQuestion(
      'hasBVGPurchase',
      t.yesNoForm.questions.deductions.hasBVGPurchase.text,
      t.yesNoForm.questions.deductions.hasBVGPurchase.explanation
    ),
    createQuestion(
      'hasEducationExpenses',
      t.yesNoForm.questions.deductions.hasEducationExpenses.text,
      t.yesNoForm.questions.deductions.hasEducationExpenses.explanation
    ),
    createQuestion(
      'hasDonations',
      t.yesNoForm.questions.deductions.hasDonations.text,
      t.yesNoForm.questions.deductions.hasDonations.explanation
    ),
    createQuestion(
      'hasPropertyMaintenance',
      t.yesNoForm.questions.deductions.hasPropertyMaintenance.text,
      t.yesNoForm.questions.deductions.hasPropertyMaintenance.explanation
    ),
    createQuestion(
      'hasOtherDeductions',
      t.yesNoForm.questions.deductions.hasOtherDeductions.text,
      t.yesNoForm.questions.deductions.hasOtherDeductions.explanation
    ),
    createQuestion(
      'hasSupportedPersons',
      t.yesNoForm.questions.deductions.hasSupportedPersons.text,
      t.yesNoForm.questions.deductions.hasSupportedPersons.explanation
    ),
    createQuestion(
      'hasMaintenancePayments',
      t.yesNoForm.questions.deductions.hasMaintenancePayments.text,
      t.yesNoForm.questions.deductions.hasMaintenancePayments.explanation
    ),
    createQuestion(
      'hasChildcare',
      t.yesNoForm.questions.deductions.hasChildcare.text,
      t.yesNoForm.questions.deductions.hasChildcare.explanation
    )
  ]
});

export const getQuestionsForSection = (
  section: 'income' | 'assets' | 'deductions',
  t: Translation
): QuestionConfig => {
  switch (section) {
    case 'income':
      return getIncomeQuestions(t);
    case 'assets':
      return getAssetsQuestions(t);
    case 'deductions':
      return getDeductionsQuestions(t);
    default:
      throw new Error(`Unknown section: ${section}`);
  }
};
