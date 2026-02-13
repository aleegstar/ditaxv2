import { Json } from '@/integrations/supabase/types';

export interface FormData {
  contactInfo: ContactInfo;
  income: Income;
  assets: Assets;
  deductions: Deductions;
}

export interface ContactInfo {
  adressnummer: string;
  firstName: string;
  lastName: string;
  kanton: 'AG' | 'ZH' | 'ZG' | 'SZ';
  address: string;
  postalCode: string;
  city: string;
  birthDate: string;
  religion: 'römisch-katholisch' | 'reformiert' | 'christkatolisch' | 'andere/keine';
  maritalStatus: 'ledig' | 'verheiratet' | 'verwitwet';
  hasChildren: boolean;
  firefighterService: boolean;
  email: string;
  phone: string;
  
  // End year address (conditional)
  hadDifferentAddressEnd: boolean;
  endYearAddress: string;
  endYearAdressnummer: string;
  endYearPostalCode: string;
  endYearCity: string;
  endYearKanton: 'AG' | 'ZH' | 'ZG' | 'SZ';
  
  // Spouse information (conditional)
  spouseFirstName: string;
  spouseLastName: string;
  spouseBirthDate: string;
  spouseReligion: 'römisch-katholisch' | 'reformiert' | 'christkatolisch' | 'andere/keine';
  
  // Children information (conditional)
  children: ChildInfo[];
}

export interface Income {
  // Base properties from original type
  hasSalary: boolean;
  hasRental: boolean;
  hasDividends: boolean;
  hasFreelance: boolean;
  hasPension: boolean;
  hasGiftInheritance: boolean;
  hasPensionPayout: boolean;
  hasOtherIncome: boolean;
  otherIncomeString?: string; // Renamed to avoid duplicate name
  employers: Employer[];
  
  // Additional properties used in IncomeForm
  employmentIncome: number;
  selfEmploymentIncome: number;
  rentalIncome: number;
  capitalIncome: number;
  pensionIncome: number;
  otherIncome: number;
  
  // New array properties for repeater components
  rentalIncomes: RentalIncomeData[];
  dividends: DividendData[];
  freelanceIncome: FreelanceIncomeData[];
}

export interface Assets {
  // Base properties from original type
  hasVehicle: boolean;
  hasProperty: boolean;
  hasMortgage: boolean;
  hasDebt: boolean;
  hasDepositAccount: boolean;
  hasSecuritiesAccount: boolean;
  hasCrypto: boolean;
  hasOtherAssets: boolean;
  otherAssetsString?: string; // Renamed to avoid duplicate name
  vehicles: Vehicle[];
  properties: Property[];
  debts: Debt[];
  
  // Additional properties used in AssetsForm
  bankAccounts: number;
  stocks: number;
  realEstate: number;
  cryptocurrency: number;
  otherAssets: number;
}

export interface Deductions {
  hasPillar3a: boolean;
  hasBVGPurchase: boolean;
  hasEducationExpenses: boolean;
  hasDonations: boolean;
  hasPropertyMaintenance: boolean;
  hasOtherDeductions: boolean;
  hasSupportedPersons: boolean;
  hasMaintenancePayments: boolean;
  hasWorkRelatedExpenses: boolean; // Added missing property
  hasChildcare: boolean; // Added missing property
  otherDeductions: string;
  supportedPersons: SupportedPerson[];
  maintenancePayments: MaintenancePayment[];
  
  // Additional properties used in DeductionsForm
  healthInsurance: number;
  charitableDonations: number;
  retirementContributions: number;
  medicalExpenses: number;
  educationExpenses: number;
  childcareExpenses: number;
}

export interface SupportedPerson {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  supportAmount: number;
}

export interface MaintenancePayment {
  id: string;
  recipient: string;
  amount: number;
  type: 'bezahlt' | 'erhalten';
}

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  required: boolean;
  category: 'income' | 'assets' | 'deductions' | 'general';
  uploaded: boolean;
}

export interface UploadedDocument {
  id: string;
  checklistItemId: string;
  fileName: string;
  fileType: string;
  url: string;
  uploadDate: Date;
  metadata?: {
    encrypted?: boolean;
    [key: string]: any;
  };
}

export type UserStatus = 
  | 'collecting' // Zusammenstellen der Unterlagen
  | 'ready'      // Bereit für Steuererklärung
  | 'submitted'  // Eingereicht
  | 'pending'    // Ausstehend/Neu
  | 'missing'    // Fehlende Unterlagen
  | 'correction'; // Korrektur der Steuererklärung

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: UserStatus;
  submissionDate?: Date;
  formData: FormData;
  documents: UploadedDocument[];
  taxReturns: TaxReturn[];
  role?: string;
  image?: string;
}

export interface TaxReturn {
  id: string;
  userId: string;
  fileName: string;
  fileType: string;
  url: string;
  uploadDate: Date;
  taxYear: string;
  status?: 'pending' | 'processing' | 'success' | 'error' | 'paid' | 'in_processing' | 'completed';
  paymentStatus?: 'paid' | 'pending' | 'failed';
  paymentDate?: Date;
  workflowStep?: 'data_collection' | 'document_upload' | 'submission' | 'in_creation' | 'completed';
}

export interface ChildInfo {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  schoolLevel: string;
  religion: 'römisch-katholisch' | 'reformiert' | 'christkatolisch' | 'andere/keine';
  deduction: 'higher-income-father' | 'higher-income-mother' | 'child-self-sufficient' | 'child-different-household';
}

// Helper type definitions
export type FormSectionKey = keyof FormData | 'summary' | 'documents';

// Type for mapping section names to their correct types
export interface FormDataTypeMap {
  contactInfo: ContactInfo;
  income: Income;
  assets: Assets;
  deductions: Deductions;
}

// Additional child related types to fix form validation issues
export interface ChildInfoInput {
  id: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  schoolLevel?: string;
  religion?: 'römisch-katholisch' | 'reformiert' | 'christkatolisch' | 'andere/keine';
  deduction?: 'higher-income-father' | 'higher-income-mother' | 'child-self-sufficient' | 'child-different-household';
}

// Type for employer input in forms
export interface EmployerInput {
  id: string;
  workLocation?: string;
  workload?: number;
  workDays?: string[];
  commute?: 'public' | 'publicBike' | 'bike' | 'car';
  carReason?: 'timeAdvantage' | 'noPublicTransport' | 'duringWork' | 'medical' | null;
}

// Additional type definitions to fix form data handling
export type FormDataRecord = {
  form_type: string;
  data: Json;
  completed: boolean;
};

export interface Debt {
  id: string;
  amount: number;
  description: string;
  type: string;
}

export interface Vehicle {
  id: string; 
  name?: string; // Bezeichnung - Primary field for new implementation
  purchasePrice?: number; // Kaufpreis - Primary field for new implementation
  purchaseYear?: number; // Kaufjahr - Primary field for new implementation
  
  // Legacy/compatibility fields
  make?: string;
  model?: string;
  year?: number;
  value?: number;
}

export interface Property {
  id: string;
  address: string;
  value: number; // Keep for compatibility
  type: string;
  usage?: 'self' | 'rented'; // Selbstgenutzt oder Vermietet
  
  // Primary fields for new implementation
  taxValue?: number; // Steuerwert (obligatorisch in UI)
  rentalValue?: number; // Eigenmietwert (bei Selbstnutzung)
  rentalIncome?: number; // Mieteinnahmen (bei Vermietung)
  
  // Legacy/compatibility fields for UserDetail view
  location?: string;
  isOutsideCanton?: boolean;
  isOlderThanFiveYears?: boolean;
  purchasedThisYear?: boolean; // New field for tracking if purchased in current tax year
}

export interface Employer {
  id: string;
  workLocation?: string;
  workload?: number;
  workDays?: string[];
  commute?: 'public' | 'publicBike' | 'bike' | 'car';
  carReason?: 'timeAdvantage' | 'noPublicTransport' | 'duringWork' | 'medical' | null;
  commuteVehicleName?: string;
  commuteDistance?: number;
}

export interface RentalIncomeData {
  id: string;
  property: string;
  annualIncome: number;
  expenses: number;
}

export interface DividendData {
  id: string;
  company: string;
  amount: number;
  taxWithheld?: number;
}

export interface FreelanceIncomeData {
  id: string;
  clientName: string;
  description: string;
  amount: number;
  expenses?: number;
}

// Export multi-step form types
export * from './multiStepYesNo';
