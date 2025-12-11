
export interface RepeaterField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface FormStep {
  id: string;
  title: string;
  type: 'text' | 'email' | 'date' | 'select' | 'boolean' | 'address' | 'repeater' | 'number';
  placeholder?: string;
  options?: string[];
  explanation?: string;
  validation?: {
    required?: boolean;
    pattern?: string;
    message?: string;
  };
  repeaterFields?: RepeaterField[];
}

export interface AddressData {
  address: string;
  postalCode: string;
  city: string;
}

export interface FormStepData {
  [key: string]: string | boolean | AddressData | any[] | Record<string, any> | number;
}

export interface StepConfig {
  section: string;
  steps: FormStep[];
}
