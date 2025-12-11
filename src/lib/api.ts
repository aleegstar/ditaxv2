
import { supabase } from '@/integrations/supabase/client';
import { FormData, User, TaxReturn, UploadedDocument, ChecklistItem, FormSectionKey } from '@/types';

export const saveFormSection = async (section: FormSectionKey, data: any, taxYear?: string): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log(`Saving ${section} section for tax year ${taxYear}:`, data);

    // Convert the data to match the expected database structure
    const formDataRecord = {
      user_id: user.id,
      tax_year: taxYear || '2024',
      form_type: section,
      data: data,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('form_data')
      .upsert(formDataRecord, {
        onConflict: 'user_id,tax_year,form_type'
      });

    if (error) {
      console.error(`Error saving ${section}:`, error);
      throw error;
    }

    console.log(`Successfully saved ${section} section`);
  } catch (error) {
    console.error(`Failed to save ${section}:`, error);
    throw error;
  }
};

export const loadFormSection = async (section: FormSectionKey, taxYear?: string): Promise<any> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log(`Loading ${section} section for tax year ${taxYear}`);

    const { data, error } = await supabase
      .from('form_data')
      .select('data')
      .eq('user_id', user.id)
      .eq('tax_year', taxYear || '2024')
      .eq('form_type', section)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error(`Error loading ${section}:`, error);
      throw error;
    }

    return data?.data || null;
  } catch (error) {
    console.error(`Failed to load ${section}:`, error);
    return null;
  }
};

export const loadFormProgress = async (taxYear?: string): Promise<any> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('form_data')
      .select('form_type')
      .eq('user_id', user.id)
      .eq('tax_year', taxYear || '2024');

    if (error) {
      console.error('Error loading form progress:', error);
      throw error;
    }

    const progress: Record<string, boolean> = {};
    data?.forEach(item => {
      progress[item.form_type] = true;
    });

    return progress;
  } catch (error) {
    console.error('Failed to load form progress:', error);
    return {};
  }
};

export const loadAllFormData = async (taxYear?: string): Promise<FormData> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log(`Loading all form data for tax year ${taxYear}`);

    const { data, error } = await supabase
      .from('form_data')
      .select('form_type, data')
      .eq('user_id', user.id)
      .eq('tax_year', taxYear || '2024');

    if (error) {
      console.error('Error loading form data:', error);
      throw error;
    }

    const formData: FormData = {
      contactInfo: {
        adressnummer: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        postalCode: '',
        city: '',
        kanton: '' as any,
        birthDate: '',
        religion: '' as any,
        maritalStatus: '' as any,
        firefighterService: false,
        hasChildren: false,
        children: [],
        hadDifferentAddressEnd: false,
        endYearAddress: '',
        endYearAdressnummer: '',
        endYearPostalCode: '',
        endYearCity: '',
        endYearKanton: '' as any,
        spouseFirstName: '',
        spouseLastName: '',
        spouseReligion: '' as any
      },
      income: {
        hasSalary: false,
        hasRental: false,
        hasDividends: false,
        hasFreelance: false,
        hasPension: false,
        hasGiftInheritance: false,
        hasPensionPayout: false,
        hasOtherIncome: false,
        otherIncomeString: '',
        employers: [],
        employmentIncome: 0,
        selfEmploymentIncome: 0,
        rentalIncome: 0,
        capitalIncome: 0,
        pensionIncome: 0,
        otherIncome: 0,
        rentalIncomes: [],
        dividends: [],
        freelanceIncome: []
      },
      assets: {
        hasVehicle: false,
        hasProperty: false,
        hasMortgage: false,
        hasDebt: false,
        hasDepositAccount: false,
        hasSecuritiesAccount: false,
        hasCrypto: false,
        hasOtherAssets: false,
        otherAssetsString: '',
        vehicles: [],
        properties: [],
        debts: [],
        bankAccounts: 0,
        stocks: 0,
        realEstate: 0,
        cryptocurrency: 0,
        otherAssets: 0
      },
      deductions: {
        hasPillar3a: false,
        hasBVGPurchase: false,
        hasEducationExpenses: false,
        hasDonations: false,
        hasPropertyMaintenance: false,
        hasOtherDeductions: false,
        hasSupportedPersons: false,
        hasMaintenancePayments: false,
        hasWorkRelatedExpenses: false,
        hasChildcare: false,
        otherDeductions: '',
        supportedPersons: [],
        maintenancePayments: [],
        healthInsurance: 0,
        charitableDonations: 0,
        retirementContributions: 0,
        medicalExpenses: 0,
        educationExpenses: 0,
        childcareExpenses: 0
      }
    };

    // Populate with loaded data - Fixed type assignment issue
    data?.forEach(item => {
      if (item.form_type in formData && item.data && typeof item.data === 'object') {
        // Merge the data properly into the existing section
        const currentSection = formData[item.form_type as keyof FormData];
        formData[item.form_type as keyof FormData] = { 
          ...currentSection, 
          ...item.data 
        } as any;
      }
    });

    console.log('Loaded form data:', formData);
    return formData;
  } catch (error) {
    console.error('Failed to load form data:', error);
    throw error;
  }
};

export const getUsers = async (): Promise<User[]> => {
  try {
    // Since there's no users table, we'll use profiles to get user data
    const { data, error } = await supabase
      .from('profiles')
      .select('*');

    if (error) {
      console.error('Error fetching users:', error);
      throw error;
    }

    // Transform profiles to User format
    const users: User[] = (data || []).map(profile => ({
      id: profile.id,
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      email: profile.email || '',
      status: 'collecting' as any,
      formData: {
        contactInfo: {
          adressnummer: '',
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          email: profile.email || '',
          phone: profile.phone || '',
          address: profile.address || '',
          postalCode: '',
          city: '',
          kanton: '' as any,
          birthDate: profile.date_of_birth ? profile.date_of_birth.toString() : '',
          religion: '' as any,
          maritalStatus: '' as any,
          firefighterService: false,
          hasChildren: false,
          children: [],
          hadDifferentAddressEnd: false,
          endYearAddress: '',
          endYearAdressnummer: '',
          endYearPostalCode: '',
          endYearCity: '',
          endYearKanton: '' as any,
          spouseFirstName: '',
          spouseLastName: '',
          spouseReligion: '' as any
        },
        income: {
          hasSalary: false,
          hasRental: false,
          hasDividends: false,
          hasFreelance: false,
          hasPension: false,
          hasGiftInheritance: false,
          hasPensionPayout: false,
          hasOtherIncome: false,
          otherIncomeString: '',
          employers: [],
          employmentIncome: 0,
          selfEmploymentIncome: 0,
          rentalIncome: 0,
          capitalIncome: 0,
          pensionIncome: 0,
          otherIncome: 0,
          rentalIncomes: [],
          dividends: [],
          freelanceIncome: []
        },
        assets: {
          hasVehicle: false,
          hasProperty: false,
          hasMortgage: false,
          hasDebt: false,
          hasDepositAccount: false,
          hasSecuritiesAccount: false,
          hasCrypto: false,
          hasOtherAssets: false,
          otherAssetsString: '',
          vehicles: [],
          properties: [],
          debts: [],
          bankAccounts: 0,
          stocks: 0,
          realEstate: 0,
          cryptocurrency: 0,
          otherAssets: 0
        },
        deductions: {
          hasPillar3a: false,
          hasBVGPurchase: false,
          hasEducationExpenses: false,
          hasDonations: false,
          hasPropertyMaintenance: false,
          hasOtherDeductions: false,
          hasSupportedPersons: false,
          hasMaintenancePayments: false,
          hasWorkRelatedExpenses: false,
          hasChildcare: false,
          otherDeductions: '',
          supportedPersons: [],
          maintenancePayments: [],
          healthInsurance: 0,
          charitableDonations: 0,
          retirementContributions: 0,
          medicalExpenses: 0,
          educationExpenses: 0,
          childcareExpenses: 0
        }
      },
      documents: [],
      taxReturns: []
    }));

    return users;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return [];
  }
};

export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      throw error;
    }

    if (!data) return null;

    // Transform profile to User format
    const user: User = {
      id: data.id,
      firstName: data.first_name || '',
      lastName: data.last_name || '',
      email: data.email || '',
      status: 'collecting' as any,
      formData: {
        contactInfo: {
          adressnummer: '',
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          postalCode: '',
          city: '',
          kanton: '' as any,
          birthDate: data.date_of_birth ? data.date_of_birth.toString() : '',
          religion: '' as any,
          maritalStatus: '' as any,
          firefighterService: false,
          hasChildren: false,
          children: [],
          hadDifferentAddressEnd: false,
          endYearAddress: '',
          endYearAdressnummer: '',
          endYearPostalCode: '',
          endYearCity: '',
          endYearKanton: '' as any,
          spouseFirstName: '',
          spouseLastName: '',
          spouseReligion: '' as any
        },
        income: {
          hasSalary: false,
          hasRental: false,
          hasDividends: false,
          hasFreelance: false,
          hasPension: false,
          hasGiftInheritance: false,
          hasPensionPayout: false,
          hasOtherIncome: false,
          otherIncomeString: '',
          employers: [],
          employmentIncome: 0,
          selfEmploymentIncome: 0,
          rentalIncome: 0,
          capitalIncome: 0,
          pensionIncome: 0,
          otherIncome: 0,
          rentalIncomes: [],
          dividends: [],
          freelanceIncome: []
        },
        assets: {
          hasVehicle: false,
          hasProperty: false,
          hasMortgage: false,
          hasDebt: false,
          hasDepositAccount: false,
          hasSecuritiesAccount: false,
          hasCrypto: false,
          hasOtherAssets: false,
          otherAssetsString: '',
          vehicles: [],
          properties: [],
          debts: [],
          bankAccounts: 0,
          stocks: 0,
          realEstate: 0,
          cryptocurrency: 0,
          otherAssets: 0
        },
        deductions: {
          hasPillar3a: false,
          hasBVGPurchase: false,
          hasEducationExpenses: false,
          hasDonations: false,
          hasPropertyMaintenance: false,
          hasOtherDeductions: false,
          hasSupportedPersons: false,
          hasMaintenancePayments: false,
          hasWorkRelatedExpenses: false,
          hasChildcare: false,
          otherDeductions: '',
          supportedPersons: [],
          maintenancePayments: [],
          healthInsurance: 0,
          charitableDonations: 0,
          retirementContributions: 0,
          medicalExpenses: 0,
          educationExpenses: 0,
          childcareExpenses: 0
        }
      },
      documents: [],
      taxReturns: []
    };

    return user;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return null;
  }
};

export const getTaxReturnsByUserId = async (userId: string): Promise<TaxReturn[]> => {
  try {
    const { data, error } = await supabase
      .from('tax_returns')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching tax returns:', error);
      throw error;
    }

    // Transform database records to TaxReturn format
    const taxReturns: TaxReturn[] = (data || []).map(record => ({
      id: record.id,
      userId: record.user_id,
      fileName: `tax_return_${record.tax_year}.pdf`,
      fileType: 'application/pdf',
      url: '',
      uploadDate: new Date(record.created_at),
      taxYear: record.tax_year,
      status: record.status as any,
      paymentStatus: record.payment_status as any,
      paymentDate: record.payment_date ? new Date(record.payment_date) : undefined,
      workflowStep: record.workflow_step as any
    }));

    return taxReturns;
  } catch (error) {
    console.error('Failed to fetch tax returns:', error);
    return [];
  }
};

export const getDocumentsByUserId = async (userId: string): Promise<UploadedDocument[]> => {
  try {
    const { data, error } = await supabase
      .from('uploaded_documents')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching documents:', error);
      throw error;
    }

    // Transform database records to UploadedDocument format - Fixed metadata typing
    const documents: UploadedDocument[] = (data || []).map(record => ({
      id: record.id,
      checklistItemId: record.checklist_item_id || '',
      fileName: record.file_name,
      fileType: record.file_type,
      url: record.file_path,
      uploadDate: new Date(record.upload_date),
      metadata: (record.metadata && typeof record.metadata === 'object') 
        ? record.metadata as { [key: string]: any; encrypted?: boolean } 
        : {}
    }));

    return documents;
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    return [];
  }
};

export const getChecklistItems = async (): Promise<ChecklistItem[]> => {
  // Since there's no checklist_items table, return empty array for now
  // This can be implemented when the table is created
  return [];
};

export const updateTaxReturnStatus = async (taxReturnId: string, status: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('tax_returns')
      .update({ status })
      .eq('id', taxReturnId);

    if (error) {
      console.error('Error updating tax return status:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to update tax return status:', error);
  }
};

export const updateTaxReturnPaymentStatus = async (taxReturnId: string, payment_status: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('tax_returns')
      .update({ payment_status })
      .eq('id', taxReturnId);

    if (error) {
      console.error('Error updating tax return payment status:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to update tax return payment status:', error);
  }
};

export const updateTaxReturnWorkflowStep = async (taxReturnId: string, workflow_step: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('tax_returns')
      .update({ workflow_step })
      .eq('id', taxReturnId);

    if (error) {
      console.error('Error updating tax return workflow step:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to update tax return workflow step:', error);
  }
};

export const createSampleUser = async (): Promise<User> => {
  try {
    console.log('Creating sample user...');
    
    const sampleUser: User = {
      id: 'sample-user-123',
      firstName: 'Max',
      lastName: 'Mustermann',
      email: 'max.mustermann@example.com',
      status: 'collecting',
      formData: {
        contactInfo: {
          firstName: 'Max',
          lastName: 'Mustermann',
          email: 'max.mustermann@example.com',
          phone: '+41 44 123 45 67',
          address: 'Musterstrasse 123',
          postalCode: '8001',
          city: 'Zürich',
          maritalStatus: 'ledig',
          hasChildren: false,
          religion: 'andere/keine',
          adressnummer: '',
          kanton: 'ZH' as any,
          birthDate: '',
          firefighterService: false,
          children: [],
          hadDifferentAddressEnd: false,
          endYearAddress: '',
          endYearAdressnummer: '',
          endYearPostalCode: '',
          endYearCity: '',
          endYearKanton: '' as any,
          spouseFirstName: '',
          spouseLastName: '',
          spouseReligion: 'andere/keine' as any
        },
        income: {
          hasSalary: true,
          hasRental: false,
          hasDividends: false,
          hasFreelance: false,
          hasPension: false,
          hasGiftInheritance: false,
          hasPensionPayout: false,
          hasOtherIncome: false,
          otherIncomeString: '',
          employers: [],
          employmentIncome: 85000,
          selfEmploymentIncome: 0,
          rentalIncome: 0,
          capitalIncome: 0,
          pensionIncome: 0,
          otherIncome: 0,
          rentalIncomes: [],
          dividends: [],
          freelanceIncome: []
        },
        assets: {
          hasVehicle: true,
          hasProperty: false,
          hasMortgage: false,
          hasDebt: false,
          hasDepositAccount: true,
          hasSecuritiesAccount: false,
          hasCrypto: false,
          hasOtherAssets: false,
          otherAssetsString: '',
          vehicles: [
            {
              id: '1',
              name: 'VW Golf',
              purchasePrice: 25000,
              purchaseYear: 2020
            }
          ],
          properties: [],
          debts: [],
          bankAccounts: 45000,
          stocks: 12000,
          realEstate: 0,
          cryptocurrency: 0,
          otherAssets: 0
        },
        deductions: {
          hasPillar3a: true,
          hasBVGPurchase: false,
          hasEducationExpenses: false,
          hasDonations: true,
          hasPropertyMaintenance: false,
          hasOtherDeductions: false,
          hasSupportedPersons: false,
          hasMaintenancePayments: false,
          hasWorkRelatedExpenses: false,
          hasChildcare: false,
          otherDeductions: '',
          supportedPersons: [],
          maintenancePayments: [],
          healthInsurance: 4200,
          charitableDonations: 500,
          retirementContributions: 6883,
          medicalExpenses: 0,
          educationExpenses: 0,
          childcareExpenses: 0
        }
      },
      documents: [],
      taxReturns: []
    };

    return sampleUser;
  } catch (error) {
    console.error('Error creating sample user:', error);
    throw error;
  }
};

export const getTaxFormDownloadURL = async (taxReturnId: string): Promise<string | null> => {
  try {
    const { data } = await supabase.storage
      .from('tax_forms')
      .getPublicUrl(`${taxReturnId}.pdf`);

    return data.publicUrl;
  } catch (error) {
    console.error('Failed to get download URL:', error);
    return null;
  }
};
