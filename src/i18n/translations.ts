export interface Translation {
  // Navigation
  navigation: {
    dashboard: string;
    taxReturn: string;
    chatSupport: string;
    help: string;
    feedback: string;
    adminPanel: string;
    profile: string;
    logout: string;
  };
  
  // Legal
  legal: {
    privacy: string;
    terms: string;
    cookies: string;
    privacySettings: string;
    acceptableUse: string;
  };
  
  // Authentication
  auth: {
    // Login/Registration
    title: string;
    subtitle: string;
    emailPlaceholder: string;
    loginButton: string;
    googleSignIn: string;
    or: string;
    sending: string;
    
    // Code verification
    verifyTitle: string;
    verifySubtitle: string;
    resendCode: string;
    resending: string;
    backButton: string;
    continueButton: string;
    verifying: string;
    
    // Success
    welcomeBack: string;
    welcome: string;
    
    // Messages
    codeSent: string;
    codeResent: string;
    invalidCode: string;
    loginSuccess: string;
    
    // Errors
    sessionError: string;
    sessionErrorDescription: string;
    notLoggedIn: string;
    notLoggedInDescription: string;
    authFailed: string;
    authFailedDescription: string;
    autoLogout: string;
    autoLogoutDescription: string;
    sessionExtended: string;
    sessionExtendedDescription: string;
    successfulLogout: string;
    successfulLogoutMessage: string;
    logoutError: string;
    logoutErrorMessage: string;
    
    // Terms
    termsText: string;
  };
  
  // Contact Form
  contact: {
    title: string;
    personalInfo: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    postalCode: string;
    city: string;
    addressNumber: string;
    canton: string;
    birthDate: string;
    religion: string;
    maritalStatus: string;
    firefighterService: string;
    firefighterServiceExplanation: string;
    spouseInfo: string;
    spouseFirstName: string;
    spouseLastName: string;
    spouseReligion: string;
    children: string;
    hasChildren: string;
    hasChildrenExplanation: string;
    childFirstName: string;
    childLastName: string;
    childBirthDate: string;
    childSchoolLevel: string;
    childReligion: string;
    childDeduction: string;
    addChild: string;
    removeChild: string;
    // Religion options
    religionCatholic: string;
    religionReformed: string;
    religionChristCatholic: string;
    religionOther: string;
    // Marital status options
    maritalSingle: string;
    maritalMarried: string;
    maritalWidowed: string;
    // Canton options
    cantonZH: string;
    cantonAG: string;
    cantonZG: string;
    cantonSZ: string;
    // Child deduction options
    deductionFatherHigher: string;
    deductionMotherHigher: string;
    deductionChildSelf: string;
    deductionChildDifferent: string;
    // Placeholders
    firstNamePlaceholder: string;
    lastNamePlaceholder: string;
    addressPlaceholder: string;
    postalCodePlaceholder: string;
    cityPlaceholder: string;
    addressNumberPlaceholder: string;
    spouseFirstNamePlaceholder: string;
    spouseLastNamePlaceholder: string;
    childFirstNamePlaceholder: string;
    childLastNamePlaceholder: string;
    childSchoolLevelPlaceholder: string;
  };

  // Contact Form specific translations
  contactForm: {
    // Section titles
    personalDataSection: string;
    spouseSection: string;
    childrenSection: string;
    
    // Form labels
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    postalCode: string;
    city: string;
    addressNumber: string;
    canton: string;
    birthDate: string;
    religion: string;
    maritalStatus: string;
    firefighterService: string;
    firefighterServiceInfo: string;
    
    // Spouse fields
    spouseFirstName: string;
    spouseLastName: string;
    spouseReligion: string;
    hasSpouse: string;
    
    // Children fields
    hasChildren: string;
    hasChildrenInfo: string;
    childFirstName: string;
    childLastName: string;
    childBirthDate: string;
    childSchoolLevel: string;
    childReligion: string;
    childDeduction: string;
    addChild: string;
    removeChild: string;
    
    // Options
    religionOptions: {
      catholic: string;
      reformed: string;
      christCatholic: string;
      other: string;
      none: string;
    };
    
    maritalOptions: {
      single: string;
      married: string;
      divorced: string;
      widowed: string;
      separated: string;
      registeredPartnership: string;
    };
    
    cantonOptions: {
      zh: string;
      ag: string;
      zg: string;
      sz: string;
      be: string;
      lu: string;
      ur: string;
      ow: string;
      nw: string;
      gl: string;
      fr: string;
      so: string;
      bs: string;
      bl: string;
      sh: string;
      ar: string;
      ai: string;
      sg: string;
      gr: string;
      tg: string;
      ti: string;
      vd: string;
      vs: string;
      ne: string;
      ge: string;
      ju: string;
    };
    
    childDeductionOptions: {
      fatherHigher: string;
      motherHigher: string;
      childSelf: string;
      differentHousehold: string;
    };
    
    // Buttons and actions
    save: string;
    saveAndContinue: string;
    cancel: string;
    back: string;
    next: string;
    
    // Messages
    saveSuccess: string;
    saveSuccessMessage: string;
    saveError: string;
    saveErrorMessage: string;
    validationError: string;
    requiredField: string;
    
    // Placeholders
    firstNamePlaceholder: string;
    lastNamePlaceholder: string;
    emailPlaceholder: string;
    phonePlaceholder: string;
    addressPlaceholder: string;
    postalCodePlaceholder: string;
    cityPlaceholder: string;
    addressNumberPlaceholder: string;
    spouseFirstNamePlaceholder: string;
    spouseLastNamePlaceholder: string;
    childFirstNamePlaceholder: string;
    childLastNamePlaceholder: string;
    childSchoolLevelPlaceholder: string;
  };

  // Deductions Form
  deductions: {
    title: string;
    hasPillar3a: string;
    hasPillar3aExplanation: string;
    hasBVGPurchase: string;
    hasBVGPurchaseExplanation: string;
    hasEducationExpenses: string;
    hasEducationExpensesExplanation: string;
    hasDonations: string;
    hasDonationsExplanation: string;
    hasPropertyMaintenance: string;
    hasPropertyMaintenanceExplanation: string;
    hasSupportedPersons: string;
    hasSupportedPersonsExplanation: string;
    hasMaintenancePayments: string;
    hasMaintenancePaymentsExplanation: string;
    hasChildcare: string;
    hasChildcareExplanation: string;
    hasOtherDeductions: string;
    hasOtherDeductionsExplanation: string;
    otherDeductions: string;
    otherDeductionsPlaceholder: string;
    supportedPersons: string;
    addPerson: string;
    addPersonButton: string;
    addPersonPrompt: string;
    personDetails: string;
    supportAmount: string;
    maintenancePayments: string;
    addPayment: string;
    addPaymentButton: string;
    addPaymentPrompt: string;
    paymentDetails: string;
    recipient: string;
    amount: string;
    paymentType: string;
    paymentTypePaid: string;
    paymentTypeReceived: string;
    selectPaymentType: string;
  };

  // Assets Form
  assets: {
    title: string;
    hasVehicle: string;
    hasVehicleExplanation: string;
    hasProperty: string;
    hasPropertyExplanation: string;
    hasMortgage: string;
    hasMortgageExplanation: string;
    hasDebt: string;
    hasDebtExplanation: string;
    hasDepositAccount: string;
    hasDepositAccountExplanation: string;
    hasCrypto: string;
    hasCryptoExplanation: string;
    hasOtherAssets: string;
    hasOtherAssetsExplanation: string;
    otherAssetsDescription: string;
    vehicleDetails: string;
    vehicleName: string;
    purchasePrice: string;
    purchaseYear: string;
    addVehicle: string;
    propertyDetails: string;
    propertyType: string;
    propertyLocation: string;
    taxValue: string;
    rentalValue: string;
    propertyOutsideCanton: string;
    propertyOlderThanFive: string;
    addProperty: string;
    debtDetails: string;
    debtDescription: string;
    debtAmount: string;
    addDebt: string;
    // Property types
    propertyHouse: string;
    propertyApartment: string;
    propertyMultiFamily: string;
    propertyLand: string;
    propertyMeadow: string;
    propertyInheritance: string;
    propertyOther: string;
    selectPropertyType: string;
  };
  
  // Profile
  profile: {
    title: string;
    loading: string;
    signOutSuccess: string;
    signOutError: string;
    profilePicture: string;
    profilePictureDescription: string;
    profileInfo: string;
    profileInfoDescription: string;
    nameNotAvailable: string;
    emailNotAvailable: string;
    edit: string;
    inviteFriends: string;
    inviteFriendsDescription: string;
    inviteFriendsReward: string;
    shareYourCode: string;
    signOut: string;
    personalInfo: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    dateOfBirth: string;
    avatar: string;
    saveChanges: string;
    profileUpdated: string;
    profileUpdatedDescription: string;
    uploadError: string;
    uploadErrorDescription: string;
    privacySettings: string;
    dataProcessing: string;
    marketing: string;
    analytics: string;
    cookiePreferences: string;
    functional: string;
    performance: string;
    targeting: string;
    savePreferences: string;
    preferencesUpdated: string;
    preferencesUpdatedDescription: string;
    managePeople: string;
    managePeopleDescription: string;
    managePeopleCard: string;
    managePeopleCardDescription: string;
  };
  
  // Forms
  forms: {
    save: string;
    cancel: string;
    reset: string;
    clear: string;
    next: string;
    previous: string;
    submit: string;
    saving: string;
    saved: string;
    savedAt: string;
    required: string;
    optional: string;
    fieldReset: string;
    sectionReset: string;
    resetSection: string;
    resetConfirm: string;
    resetConfirmDescription: string;
    resetButton: string;
    importFromPreviousYear: string;
    importSuccessful: string;
    importSuccessfulDescription: string;
    importFailed: string;
    importFailedDescription: string;
    importing: string;
    importConfirm: string;
    importConfirmDescription: string;
    import: string;
    back: string;
    continue: string;
    savedSuccessfully: string;
    savedSuccessfullyDescription: string;
    saveError: string;
    saveErrorDescription: string;
  };
  
  // Tax Return
  taxReturn: {
    title: string;
    taxReturns: string;
    newTaxReturn: string;
    personalData: string;
    income: string;
    deductions: string;
    assets: string;
    documents: string;
    summary: string;
    completedReturns: string;
    status: string;
    year: string;
    created: string;
    updated: string;
    download: string;
    view: string;
    noReturns: string;
    noReturnsDescription: string;
    paymentStatus: string;
    paid: string;
    pending: string;
    draft: string;
    submitted: string;
    completed: string;
    processing: string;
    addTaxYear: string;
    selectYear: string;
    createSuccess: string;
    createSuccessDescription: string;
    createError: string;
    createErrorDescription: string;
    deleteSuccess: string;
    deleteSuccessDescription: string;
    deleteError: string;
    deleteErrorDescription: string;
    noCompletedReturns: string;
    noCompletedReturnsDescription: string;
    loadingError: string;
    loadingErrorDescription: string;
    // Progress tracker translations
    dataCollection: string;
    dataCollectionDescription: string;
    documentUpload: string;
    documentUploadDescription: string;
    submission: string;
    submissionDescription: string;
    inCreation: string;
    inCreationDescription: string;
    completedMessage: string;
    completedDescription: string;
    currentProcessing: string;
    actionDialogTitle: string;
    actionDialogDescription: string;
    downloadAction: string;
    viewAction: string;
    downloadSuccess: string;
    downloadSuccessDescription: string;
    downloadFailed: string;
    downloadFailedDescription: string;
    viewSuccess: string;
    viewSuccessDescription: string;
    viewFailed: string;
    viewFailedDescription: string;
    fileNotFound: string;
    fileNotFoundDescription: string;
    // Dashboard specific translations
    dashboard: {
      tasksCompleted: string;
      completeFirst: string;
      sections: {
        contact: string;
        income: string;
        deductions: string;
        assets: string;
        summary: string;
        documents: string;
        submit: string;
      };
    };
  };
  
  // Chat
  chat: {
    title: string;
    support: string;
    typeMessage: string;
    send: string;
    attachFile: string;
    online: string;
    offline: string;
    connecting: string;
    messageRead: string;
    messageDelivered: string;
    noMessages: string;
    noMessagesDescription: string;
  };
  
  // Admin
  admin: {
    panel: string;
    users: string;
    documents: string;
    reports: string;
    settings: string;
    userDetail: string;
    userDocuments: string;
    userNotes: string;
    addNote: string;
    saveNote: string;
    noteAdded: string;
    noteAddedDescription: string;
    accessLog: string;
    downloadDocuments: string;
    downloadFormData: string;
    viewDocument: string;
    documentPreview: string;
    closePreview: string;
    accessDenied: string;
    accessDeniedDescription: string;
  };
  
  // Help & Support
  help: {
    title: string;
    faq: string;
    contact: string;
    guides: string;
    tutorials: string;
    searchHelp: string;
    categories: string;
    gettingStarted: string;
    taxQuestions: string;
    technical: string;
    account: string;
  };
  
  // Feedback
  feedback: {
    title: string;
    yourFeedback: string;
    rating: string;
    comments: string;
    category: string;
    general: string;
    bug: string;
    feature: string;
    improvement: string;
    submitFeedback: string;
    thankYou: string;
    feedbackSubmitted: string;
    feedbackSubmittedDescription: string;
    anonymous: string;
  };

  // Feedback Page
  feedbackPage: {
    title: string;
    satisfactionQuestion: string;
    featureRequestLabel: string;
    featureRequestOptional: string;
    featureRequestPlaceholder: string;
    submitButton: string;
    submitting: string;
    ratingRequired: string;
    ratingRequiredDescription: string;
    notLoggedIn: string;
    notLoggedInDescription: string;
    error: string;
    errorDescription: string;
    thankYouTitle: string;
    thankYouMessage: string;
    backToHome: string;
    successToast: string;
    successToastDescription: string;
    ratings: {
      veryUnsatisfied: string;
      unsatisfied: string;
      neutral: string;
      satisfied: string;
      verySatisfied: string;
    };
  };

  // Privacy Settings Page
  privacySettingsPage: {
    title: string;
    pleaseLogin: string;
    privacyPreferences: string;
    marketingEmails: string;
    marketingEmailsDescription: string;
    saveSettings: string;
    settingsSaved: string;
    settingsSavedDescription: string;
    saveError: string;
    saveErrorDescription: string;
    dataPortability: string;
    dataPortabilityDescription: string;
    downloadMyData: string;
    dataDownloaded: string;
    dataDownloadedDescription: string;
    downloadError: string;
    downloadErrorDescription: string;
    deleteAccount: string;
    deleteAccountDescription: string;
    deleteAccountButton: string;
    // Deletion dialog
    whyLeaving: string;
    feedbackHelps: string;
    reasonRequired: string;
    reasonRequiredDescription: string;
    additionalFeedback: string;
    additionalFeedbackPlaceholder: string;
    cancel: string;
    next: string;
    finalConfirmation: string;
    warningLabel: string;
    deleteWarningList: {
      profile: string;
      taxReturns: string;
      documents: string;
      chatMessages: string;
    };
    typeToConfirm: string;
    deleteConfirmWord: string;
    confirmRequired: string;
    confirmRequiredDescription: string;
    deleting: string;
    dataDeleted: string;
    dataDeletedDescription: string;
    accountDeleted: string;
    accountDeletedDescription: string;
    noActiveSession: string;
    // Deletion reasons
    deletionReasons: {
      notUsing: string;
      tooExpensive: string;
      privacyConcerns: string;
      badExperience: string;
      foundAlternative: string;
      other: string;
    };
  };

  // Terms Page
  termsPage: {
    title: string;
  };

  // Privacy Policy Page
  privacyPolicyPage: {
    title: string;
  };
  
  // Payment
  payment: {
    title: string;
    success: string;
    failed: string;
    pending: string;
    amount: string;
    date: string;
    reference: string;
    receipt: string;
    download: string;
    backToDashboard: string;
  };

  // Tickets
  tickets: {
    status: {
      open: string;
      inProgress: string;
      resolved: string;
      closed: string;
    };
    priority: {
      low: string;
      medium: string;
      high: string;
      urgent: string;
    };
    create: string;
    title: string;
    description: string;
    assignedTo: string;
    createdBy: string;
    lastUpdated: string;
    resolvedAt: string;
  };

  // Tax Filers (Multi-person support)
  taxFilers: {
    title: string;
    pageTitle: string;
    pageDescription: string;
    selectPerson: string;
    primary: string;
    manage: string;
    addPerson: string;
    editPerson: string;
    deletePerson: string;
    addPersonHint: string;
    noPersons: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    relationship: string;
    relationships: {
      self: string;
      child: string;
      spouse: string;
      parent: string;
      other: string;
    };
    addDescription: string;
    editDescription: string;
    deleteTitle: string;
    deleteDescription: string;
    deleteConfirm: string;
    infoTitle: string;
    infoDescription: string;
  };
  
  // Common
  common: {
    loading: string;
    error: string;
    success: string;
    warning: string;
    info: string;
    yes: string;
    no: string;
    ok: string;
    cancel: string;
    close: string;
    open: string;
    edit: string;
    delete: string;
    view: string;
    download: string;
    upload: string;
    search: string;
    filter: string;
    sort: string;
    refresh: string;
    back: string;
    continue: string;
    finish: string;
    languages: string;
    german: string;
    english: string;
    remove: string;
  };
  
  // Idle Warning
  idle: {
    title: string;
    message: string;
    timeLeft: string;
    extendSession: string;
    minutes: string;
    seconds: string;
  };
  
  // Cookie Consent
  cookies: {
    title: string;
    message: string;
    accept: string;
    decline: string;
    settings: string;
    necessary: string;
    functional: string;
    analytics: string;
    marketing: string;
    cookiePolicy: string;
  };
  
  // Errors
  errors: {
    pageNotFound: string;
    pageNotFoundDescription: string;
    goHome: string;
    serverError: string;
    networkError: string;
    validationError: string;
    permissionDenied: string;
    sessionExpired: string;
    tryAgain: string;
  };

  // Upload functionality
  upload: {
    // Avatar upload
    avatar: {
      fileTooLarge: string;
      fileTooLargeDesc: string;
      invalidFileType: string;
      invalidFileTypeDesc: string;
      noFileSelected: string;
      userNotLoggedIn: string;
      uploadSuccess: string;
      uploadSuccessDesc: string;
      uploadFailed: string;
      uploading: string;
      uploadButton: string;
      profileImage: string;
      newFileSelected: string;
    };
    
    // Document upload
    documents: {
      title: string;
      finished: string;
      cancel: string;
      pleaseWait: string;
      addMoreFiles: string;
      selectFiles: string;
      supportedFormats: string;
      encryptionEnabled: string;
      standardUpload: string;
      encryptionDescription: string;
      standardDescription: string;
      encrypting: string;
      uploading: string;
      uploadFiles: string;
      encrypted: string;
      preview: string;
      uploadProgress: string;
      encryptionProgress: string;
      fileTooLarge: string;
      invalidFormat: string;
      selectAtLeastOne: string;
      noFilesToUpload: string;
      uploadSuccess: string;
      uploadSuccessDesc: string;
      loginRequired: string;
      uploadError: string;
      databaseError: string;
    };
  };

  // Note: documentChecklist is now defined in the multiStepContactForm section below (line ~1105)

  // Common UI elements
  ui: {
    loading: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    view: string;
    upload: string;
    download: string;
    back: string;
    next: string;
    continue: string;
    finish: string;
    close: string;
    open: string;
    search: string;
    refresh: string;
  };

  // Status messages
  status: {
    success: string;
    error: string;
    warning: string;
    info: string;
    complete: string;
    pending: string;
    processing: string;
  };

  // Yes/No Form
  yesNoForm: {
    yes: string;
    no: string;
    yesDescription: string;
    noDescription: string;
    moreInfo: string;
    answerSaved: string;
    answerSavedDescription: string;
    answerError: string;
    answerErrorDescription: string;
    questions: {
      income: {
        hasPension: { text: string; explanation: string; };
        hasGiftInheritance: { text: string; explanation: string; };
        hasPensionPayout: { text: string; explanation: string; };
        hasRental: { text: string; explanation: string; };
        hasDividends: { text: string; explanation: string; };
        hasOtherIncome: { text: string; explanation: string; };
        hasFreelance: { text: string; explanation: string; };
        hasSalary: { text: string; explanation: string; };
      };
      assets: {
        hasVehicle: { text: string; explanation: string; };
        hasProperty: { text: string; explanation: string; };
        hasMortgage: { text: string; explanation: string; };
        hasDebt: { text: string; explanation: string; };
        hasDepositAccount: { text: string; explanation: string; };
        hasCrypto: { text: string; explanation: string; };
        hasOtherAssets: { text: string; explanation: string; };
      };
      deductions: {
        hasPillar3a: { text: string; explanation: string; };
        hasBVGPurchase: { text: string; explanation: string; };
        hasEducationExpenses: { text: string; explanation: string; };
        hasDonations: { text: string; explanation: string; };
        hasPropertyMaintenance: { text: string; explanation: string; };
        hasOtherDeductions: { text: string; explanation: string; };
        hasSupportedPersons: { text: string; explanation: string; };
        hasMaintenancePayments: { text: string; explanation: string; };
        hasChildcare: { text: string; explanation: string; };
      };
    };
  };

  // Onboarding/Welcome
  onboarding: {
    consentTitle: string;
    nameTitle: string;
    yearTitle: string;
    termsAccept: string;
    privacyPolicy: string;
    termsOfService: string;
    newsletterTitle: string;
    newsletterDescription: string;
    next: string;
    letsGo: string;
    firstName: string;
    acceptTermsError: string;
    enterNameError: string;
    authError: string;
    genericError: string;
    familyHintTitle: string;
    familyHintDescription: string;
    familyHintLater: string;
    familyHintNow: string;
  };

  // Tour
  tour: {
    welcomeGreeting: string;
    welcomeDescription: string;
    addYearTitle: string;
    addYearDescription: string;
    chatTitle: string;
    chatDescription: string;
    documentsTitle: string;
    documentsDescription: string;
    continueCardTitle: string;
    continueCardDescription: string;
    skip: string;
    back: string;
    next: string;
    finish: string;
    closeTour: string;
  };

  // Auth
  authFlow: {
    login: string;
    loginSubtitle: string;
    emailLabel: string;
    emailPlaceholder: string;
    sendCode: string;
    sendingCode: string;
    codeDisabled: string;
    enterCode: string;
    codeSentTo: string;
    verifyButton: string;
    verifying: string;
    sixDigitCode: string;
    changeEmail: string;
    passkeyLogin: string;
    passkeyAuthenticating: string;
    orEnterCode: string;
    otpDisabled: string;
    otpDisabledHint: string;
    noAccount: string;
    registerNow: string;
    codeSent: string;
    codeSentDescription: string;
    loginSuccess: string;
    loginSuccessDescription: string;
    sendError: string;
    invalidCode: string;
    passkeyError: string;
  };

  // Form Mode Toggle
  formModeToggle: {
    selectMode: string;
    yesNo: string;
    expertMode: string;
    yesNoDescription: string;
    expertDescription: string;
  };

  // Toast Messages
  toasts: {
    answerError: string;
    answerErrorDescription: string;
    changeSaved: string;
    changeSavedDescription: string;
    saveError: string;
    saveErrorDescription: string;
    navigationError: string;
    navigationErrorDescription: string;
  };

  // Tax Return Actions Page
  taxReturnActions: {
    title: string;
    loading: string;
    notFound: string;
    backToOverview: string;
    actionRequired: string;
    signatureRequired: string;
    signatureDescription: string;
    signNow: string;
    electronicallySigned: string;
    signedAt: string;
    signedDescription: string;
    completed: string;
    taxYear: string;
    view: string;
    download: string;
    available: string;
    pending: string;
    definitiveTaxBill: string;
    viewBill: string;
    downloadBill: string;
    noBillYet: string;
    uploadBill: string;
    support: string;
    ticket: string;
    tickets: string;
    needHelp: string;
    statusOpen: string;
    statusInProgress: string;
    statusResolved: string;
    statusClosed: string;
    viewTickets: string;
    newTicket: string;
    contactUs: string;
    reportProblem: string;
    uploadTaxBill: string;
    selectFile: string;
    cancel: string;
    upload: string;
    fileNotFound: string;
    fileNotFoundDescription: string;
    downloadSuccess: string;
    downloadSuccessDescription: string;
    downloadFailed: string;
    downloadFailedDescription: string;
    fileOpened: string;
    fileOpenedDescription: string;
    viewFailed: string;
    viewFailedDescription: string;
    billOpened: string;
    billOpenedDescription: string;
    uploadSuccess: string;
    uploadSuccessDescription: string;
    uploadFailed: string;
    uploadFailedDescription: string;
    error: string;
    selectFileFirst: string;
    dataLoadError: string;
  };

  // Documents Page
  documentsPage: {
    title: string;
    taxYear: string;
    uploadDocuments: string;
    noDocuments: string;
    noDocumentsDescription: string;
    uploadFirst: string;
    sortByDateDesc: string;
    sortByDateAsc: string;
    sortByNameAsc: string;
    sortByNameDesc: string;
    sortByType: string;
    search: string;
    error: string;
    loadError: string;
    uploadSuccess: string;
    uploadSuccessDescription: string;
    fileTooLarge: string;
    invalidFormat: string;
    uploadFailed: string;
    filterSort: string;
    upload: string;
    collectReceipts: string;
    collectReceiptsDescription: string;
    lockedBanner: string;
    pleaseLogin: string;
  };

  // Invite Friends Page
  inviteFriends: {
    title: string;
    subtitle: string;
    yourCode: string;
    yourCodeDescription: string;
    clickToCopy: string;
    successfulInvites: string;
    remaining: string;
    shareViaWhatsApp: string;
    shareViaEmail: string;
    copyCode: string;
    errorLoading: string;
    howItWorks: string;
    step1Title: string;
    step1Description: string;
    step2Title: string;
    step2Description: string;
    step3Title: string;
    step3Description: string;
    yourDiscountCodes: string;
    autoApplied: string;
    earnedByInvite: string;
    referralDiscount: string;
    recentInvites: string;
    successfulInvite: string;
  };

  // Add Tax Year
  addTaxYear: {
    newYear: string;
    newTaxReturn: string;
    startNewTaxReturn: string;
    selectTaxYear: string;
    addTaxYear: string;
    chooseYear: string;
    taxYear: string;
    createTaxReturn: string;
    allYearsCreated: string;
    yearsAlreadyExist: string;
  };

  // MultiStep Contact Form
  multiStepContactForm: {
    title: string;
    personalData: string;
    personalDataDescription: string;
    currentAddress: string;
    currentAddressDescription: string;
    additionalInfo: string;
    additionalInfoDescription: string;
    family: string;
    familyDescription: string;
    street: string;
    streetNumber: string;
    selectCanton: string;
    notAvailableYet: string;
    addressAsOf: string;
    differentAddressAsOf: string;
    firefighterLabel: string;
    iDoFirefighterService: string;
    spouseTitle: string;
    childrenLabel: string;
    iHaveChildren: string;
    finish: string;
    continue: string;
    back: string;
    fillRequired: string;
    fillRequiredDescription: string;
  };

  // Document Checklist
  documentChecklist: {
    title: string;
    generateChecklist: string;
    generating: string;
    loading: string;
    authRequired: string;
    authRequiredDesc: string;
    goToLogin: string;
    checkSession: string;
    errorLoading: string;
    updateStarted: string;
    updateDescription: string;
    noDocuments: string;
    noDocumentsDesc: string;
    description: string;
    loadingMessage: string;
    categories: {
      general: string;
      income: string;
      assets: string;
      deductions: string;
    };
    required: string;
    or: string;
    view: string;
    delete: string;
    upload: string;
    assign: string;
    mandatoryDocuments: string;
    documents: string;
    uploaded: string;
    stillRequired: string;
    allMandatoryPresent: string;
    completedOf: string;
    file: string;
    files: string;
    viewDocs: string;
    remove: string;
    generateNow: string;
    dialogTitle: string;
    taxReturnYear: string;
    dialogDescription: string;
    later: string;
    createNow: string;
  };

  // User Dashboard (Main Page /)
  userDashboard: {
    greeting: string;
    fallbackUser: string;
    taxReturn: string;
    active: string;
    processing: string;
    completed: string;
    expressService: string;
    standardService: string;
    upgradeAvailable: string;
    continue: string;
    delete: string;
    tracking: string;
    details: string;
    sign: string;
    activeDescription: string;
    processingDescription: string;
    signatureRequired: string;
    signaturePending: string;
    finished: string;
    actionRequired: string;
    decisionFrom: string;
    deleteDialogTitle: string;
    deleteDialogDescription: string;
    deleting: string;
    cancelDelete: string;
    documents: string;
    uploadDocuments: string;
    taxReturnNotFound: string;
    taxReturnDeleted: string;
    deleteError: string;
    taxReturnExists: string;
    taxReturnAlreadyExists: string;
    taxReturnCreated: string;
    createError: string;
  };

  // Form Dashboard (/form)
  formDashboard: {
    title: string;
    personalInfo: string;
    tasksCompleted: string;
    contactInfo: string;
    deductions: string;
    income: string;
    assets: string;
    documentsTitle: string;
    uploadDocuments: string;
    completeStep1First: string;
    reviewAndSubmit: string;
    completeAndPay: string;
    completeSteps12First: string;
  };

  // Missing Items Alert
  missingItems: {
    actionRequired: string;
    documentsNeeded: string;
    documentsNeededSingular: string;
    infoNeeded: string;
    infoNeededSingular: string;
    bothNeeded: string;
  };

  // Menu
  menu: {
    navigation: string;
    taxes: string;
    documents: string;
    chat: string;
    inviteFriends: string;
    managePeople: string;
    help: string;
    knowledgeBase: string;
    startGuide: string;
    startDocumentsGuide: string;
    feedbackAndRoadmap: string;
    feedback: string;
    roadmap: string;
    legal: string;
    privacy: string;
    terms: string;
    cookiePolicy: string;
    cookieSettings: string;
    privacySettings: string;
    profile: string;
    logout: string;
  };

  // Cookie Consent
  cookieConsent: {
    title: string;
    description: string;
    acceptAll: string;
    essentialOnly: string;
    settings: string;
    saveSettings: string;
    cancel: string;
    readPrivacyPolicy: string;
    essential: {
      title: string;
      description: string;
    };
    functional: {
      title: string;
      description: string;
    };
    analytics: {
      title: string;
      description: string;
    };
    marketing: {
      title: string;
      description: string;
    };
  };
}

export const translations: Record<'de' | 'en', Translation> = {
  de: {
    navigation: {
      dashboard: 'Dashboard',
      taxReturn: 'Steuererklärung',
      chatSupport: 'Chat-Support',
      help: 'Hilfe',
      feedback: 'Feedback',
      adminPanel: 'Admin Panel',
      profile: 'Profil',
      logout: 'Abmelden',
    },
    
    legal: {
      privacy: 'Datenschutz',
      terms: 'Nutzungsbedingungen',
      cookies: 'Cookie-Richtlinie',
      privacySettings: 'Datenschutz-Einstellungen',
      acceptableUse: 'Nutzungsrichtlinien',
    },
    
    auth: {
      title: "Anmelden und Registrieren",
      subtitle: "Grüezi und herzlich Willkommen",
      emailPlaceholder: "deine.email@beispiel.com",
      loginButton: "Anmelden",
      googleSignIn: "Mit Google anmelden",
      or: "oder",
      sending: "Wird gesendet...",
      
      verifyTitle: "Code eingeben",
      verifySubtitle: "Wir haben dir einen 6-stelligen Code gesendet",
      resendCode: "Code erneut senden",
      resending: "Wird erneut gesendet...",
      backButton: "Zurück",
      continueButton: "Weiter",
      verifying: "Wird überprüft...",
      
      welcomeBack: "Willkommen zurück",
      welcome: "Du wirst weitergeleitet...",
      
      codeSent: "Code wurde gesendet",
      codeResent: "Code wurde erneut gesendet",
      invalidCode: "Ungültiger Code",
      loginSuccess: "Erfolgreich angemeldet",
      
      sessionError: "Sitzungsfehler",
      sessionErrorDescription: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.",
      notLoggedIn: "Nicht angemeldet",
      notLoggedInDescription: "Du musst dich anmelden, um fortzufahren.",
      authFailed: "Authentifizierung fehlgeschlagen",
      authFailedDescription: "Bitte versuche es erneut.",
      autoLogout: "Automatisch abgemeldet",
      autoLogoutDescription: "Du wurdest aufgrund von Inaktivität abgemeldet.",
      sessionExtended: "Sitzung verlängert",
      sessionExtendedDescription: "Deine Sitzung wurde erfolgreich verlängert.",
      successfulLogout: "Erfolgreich abgemeldet",
      successfulLogoutMessage: "Du wurdest erfolgreich abgemeldet.",
      logoutError: "Abmeldefehler",
      logoutErrorMessage: "Beim Abmelden ist ein Fehler aufgetreten.",
      
      termsText: "Durch die Anmeldung stimmst du unseren Nutzungsbedingungen und Datenschutzrichtlinien zu."
    },
    
    contact: {
      title: 'Kontaktangaben',
      personalInfo: 'Persönliche Informationen',
      firstName: 'Vorname',
      lastName: 'Nachname',
      email: 'E-Mail',
      phone: 'Telefon',
      address: 'Adresse',
      postalCode: 'PLZ',
      city: 'Ort',
      addressNumber: 'Adressnummer',
      canton: 'Kanton',
      birthDate: 'Geburtsdatum',
      religion: 'Religion',
      maritalStatus: 'Zivilstand',
      firefighterService: 'Ich leiste Feuerwehrdienst',
      firefighterServiceExplanation: 'Aktive Feuerwehrleute können je nach Kanton einen Steuerabzug geltend machen.',
      spouseInfo: 'Angaben zum Ehepartner',
      spouseFirstName: 'Vorname',
      spouseLastName: 'Nachname',
      spouseReligion: 'Religion',
      children: 'Kinder',
      hasChildren: 'Ich habe Kinder',
      hasChildrenExplanation: 'Gib Informationen zu deinen Kindern an, für die du Kinderabzüge geltend machen möchtest.',
      childFirstName: 'Vorname',
      childLastName: 'Nachname',
      childBirthDate: 'Geburtsdatum',
      childSchoolLevel: 'Schulstufe',
      childReligion: 'Religion',
      childDeduction: 'Abzug',
      addChild: 'Kind hinzufügen',
      removeChild: 'Entfernen',
      religionCatholic: 'Römisch-katholisch',
      religionReformed: 'Reformiert',
      religionChristCatholic: 'Christkatholisch',
      religionOther: 'Andere/Keine',
      maritalSingle: 'Ledig',
      maritalMarried: 'Verheiratet',
      maritalWidowed: 'Verwitwet',
      cantonZH: 'Zürich',
      cantonAG: 'Aargau',
      cantonZG: 'Zug',
      cantonSZ: 'Schwyz',
      deductionFatherHigher: 'Vater erzielt höheres Einkommen.',
      deductionMotherHigher: 'Mutter erzielt höheres Einkommen.',
      deductionChildSelf: 'Kind kommt hauptsächlich für sich selbst auf.',
      deductionChildDifferent: 'Kind lebt nicht im gleichen Haushalt.',
      firstNamePlaceholder: 'Vorname',
      lastNamePlaceholder: 'Nachname',
      addressPlaceholder: 'Strasse und Hausnummer',
      postalCodePlaceholder: 'PLZ',
      cityPlaceholder: 'Ort',
      addressNumberPlaceholder: 'Adressnummer',
      spouseFirstNamePlaceholder: 'Vorname des Ehepartners',
      spouseLastNamePlaceholder: 'Nachname des Ehepartners',
      childFirstNamePlaceholder: 'Vorname des Kindes',
      childLastNamePlaceholder: 'Nachname des Kindes',
      childSchoolLevelPlaceholder: 'z.B. Kindergarten, Primarschule',
    },

    contactForm: {
      // Section titles
      personalDataSection: 'Persönliche Angaben',
      spouseSection: 'Angaben zum Ehepartner',
      childrenSection: 'Kinder',
      
      // Form labels
      firstName: 'Vorname',
      lastName: 'Nachname',
      email: 'E-Mail',
      phone: 'Telefon',
      address: 'Adresse',
      postalCode: 'PLZ',
      city: 'Ort',
      addressNumber: 'Adressnummer',
      canton: 'Kanton',
      birthDate: 'Geburtsdatum',
      religion: 'Religion',
      maritalStatus: 'Zivilstand',
      firefighterService: 'Ich leiste Feuerwehrdienst',
      firefighterServiceInfo: 'Aktive Feuerwehrleute können je nach Kanton einen Steuerabzug geltend machen.',
      
      // Spouse fields
      spouseFirstName: 'Vorname des Ehepartners',
      spouseLastName: 'Nachname des Ehepartners',
      spouseReligion: 'Religion des Ehepartners',
      hasSpouse: 'Verheiratet',
      
      // Children fields
      hasChildren: 'Ich habe Kinder',
      hasChildrenInfo: 'Gib Informationen zu deinen Kindern an, für die du Kinderabzüge geltend machen möchtest.',
      childFirstName: 'Vorname des Kindes',
      childLastName: 'Nachname des Kindes',
      childBirthDate: 'Geburtsdatum des Kindes',
      childSchoolLevel: 'Schulstufe',
      childReligion: 'Religion des Kindes',
      childDeduction: 'Abzug',
      addChild: 'Kind hinzufügen',
      removeChild: 'Kind entfernen',
      
      // Options
      religionOptions: {
        catholic: 'Römisch-katholisch',
        reformed: 'Reformiert',
        christCatholic: 'Christkatholisch',
        other: 'Andere',
        none: 'Keine',
      },
      
      maritalOptions: {
        single: 'Ledig',
        married: 'Verheiratet',
        divorced: 'Geschieden',
        widowed: 'Verwitwet',
        separated: 'Getrennt lebend',
        registeredPartnership: 'Eingetragene Partnerschaft',
      },
      
      cantonOptions: {
        zh: 'Zürich',
        ag: 'Aargau',
        zg: 'Zug',
        sz: 'Schwyz',
        be: 'Bern',
        lu: 'Luzern',
        ur: 'Uri',
        ow: 'Obwalden',
        nw: 'Nidwalden',
        gl: 'Glarus',
        fr: 'Freiburg',
        so: 'Solothurn',
        bs: 'Basel-Stadt',
        bl: 'Basel-Landschaft',
        sh: 'Schaffhausen',
        ar: 'Appenzell Ausserrhoden',
        ai: 'Appenzell Innerrhoden',
        sg: 'St. Gallen',
        gr: 'Graubünden',
        tg: 'Thurgau',
        ti: 'Tessin',
        vd: 'Waadt',
        vs: 'Wallis',
        ne: 'Neuenburg',
        ge: 'Genf',
        ju: 'Jura',
      },
      
      childDeductionOptions: {
        fatherHigher: 'Vater erzielt höheres Einkommen',
        motherHigher: 'Mutter erzielt höheres Einkommen',
        childSelf: 'Kind kommt hauptsächlich für sich selbst auf',
        differentHousehold: 'Kind lebt nicht im gleichen Haushalt',
      },
      
      // Buttons and actions
      save: 'Speichern',
      saveAndContinue: 'Speichern und weiter',
      cancel: 'Abbrechen',
      back: 'Zurück',
      next: 'Weiter',
      
      // Messages
      saveSuccess: 'Erfolgreich gespeichert',
      saveSuccessMessage: 'Deine Kontaktdaten wurden erfolgreich gespeichert.',
      saveError: 'Speicherfehler',
      saveErrorMessage: 'Beim Speichern ist ein Fehler aufgetreten. Bitte versuche es erneut.',
      validationError: 'Validierungsfehler',
      requiredField: 'Dieses Feld ist erforderlich',
      
      // Placeholders
      firstNamePlaceholder: 'Vorname',
      lastNamePlaceholder: 'Nachname',
      emailPlaceholder: 'deine.email@beispiel.com',
      phonePlaceholder: '+41 XX XXX XX XX',
      addressPlaceholder: 'Musterstrasse 1',
      postalCodePlaceholder: '8000',
      cityPlaceholder: 'Zürich',
      addressNumberPlaceholder: '1',
      spouseFirstNamePlaceholder: 'Vorname des Ehepartners',
      spouseLastNamePlaceholder: 'Nachname des Ehepartners',
      childFirstNamePlaceholder: 'Vorname des Kindes',
      childLastNamePlaceholder: 'Nachname des Kindes',
      childSchoolLevelPlaceholder: 'z.B. Kindergarten, Primarschule',
    },

    deductions: {
      title: 'Abzüge',
      hasPillar3a: 'Ich habe in die Säule 3a einbezahlt',
      hasPillar3aExplanation: 'Einzahlungen in die Säule 3a können bis zu einem bestimmten Maximalbetrag vom steuerbaren Einkommen abgezogen werden. Dies gilt sowohl für unselbstständig als auch für selbstständig Erwerbende.',
      hasBVGPurchase: 'Ich habe mich in die Pensionskasse (BVG) eingekauft',
      hasBVGPurchaseExplanation: 'Einkäufe in die Pensionskasse sind unter bestimmten Voraussetzungen steuerlich abzugsfähig. Dies betrifft sowohl freiwillige Einkäufe zur Verbesserung der Altersvorsorge als auch den Nachkauf von Beitragsjahren.',
      hasEducationExpenses: 'Ich habe Aus- und Weiterbildungskosten bezahlt',
      hasEducationExpensesExplanation: 'Kosten für die eigene Aus- und Weiterbildung können unter bestimmten Bedingungen vom steuerbaren Einkommen abgezogen werden. Dies umfasst Kursgebühren, Lehrmittel und Fahrtkosten.',
      hasDonations: 'Ich habe Spenden getätigt',
      hasDonationsExplanation: 'Spenden an gemeinnützige Organisationen können bis zu einer bestimmten Höhe vom steuerbaren Einkommen abgezogen werden. Die Organisation muss im jeweiligen Kanton als steuerbefreit anerkannt sein.',
      hasPropertyMaintenance: 'Ich habe werterhaltende Unterhaltskosten für meine Liegenschaft bezahlt',
      hasPropertyMaintenanceExplanation: 'Als Eigentümer einer Liegenschaft kannst du die Kosten für deren Unterhalt steuerlich geltend machen. Dazu gehören Reparaturen, Renovationen und andere werterhaltende Massnahmen.',
      hasSupportedPersons: 'Ich unterstütze unterstützungsbedürftige Personen',
      hasSupportedPersonsExplanation: 'Wenn du Personen unterstützt, die in deinem Haushalt leben oder von dir finanziell abhängig sind, kannst du unter Umständen einen Unterstützungsabzug geltend machen.',
      hasMaintenancePayments: 'Ich leiste Unterhaltszahlungen',
      hasMaintenancePaymentsExplanation: 'Unterhaltszahlungen an geschiedene Ehepartner oder Kinder können unter bestimmten Voraussetzungen vom steuerbaren Einkommen abgezogen werden.',
      hasChildcare: 'Ich habe Kinderbetreuungskosten',
      hasChildcareExplanation: 'Kosten für die Betreuung deiner Kinder können bis zu einem bestimmten Maximalbetrag vom steuerbaren Einkommen abgezogen werden. Dies gilt sowohl für die Betreuung in einer Kita als auch für die Betreuung durch eine Tagesmutter.',
      hasOtherDeductions: 'Ich habe weitere Abzüge',
      hasOtherDeductionsExplanation: 'Hier kannst du weitere Kosten geltend machen, die in den anderen Kategorien nicht erfasst sind. Dazu gehören beispielsweise Krankheitskosten oder behinderungsbedingte Kosten.',
      otherDeductions: 'Weitere Abzüge',
      otherDeductionsPlaceholder: 'Beschreibe deine weiteren Abzüge',
      supportedPersons: 'Unterstützte Personen',
      addPerson: 'Person hinzufügen',
      addPersonButton: 'Person hinzufügen',
      addPersonPrompt: 'Füge unterstützte Personen hinzu, um die Details zu erfassen.',
      personDetails: 'Person Details',
      supportAmount: 'Unterstützungsbetrag',
      maintenancePayments: 'Unterhaltszahlungen',
      addPayment: 'Zahlung hinzufügen',
      addPaymentButton: 'Zahlung hinzufügen',
      addPaymentPrompt: 'Füge Unterhaltszahlungen hinzu, um die Details zu erfassen.',
      paymentDetails: 'Zahlung Details',
      recipient: 'Empfänger',
      amount: 'Betrag',
      paymentType: 'Art',
      paymentTypePaid: 'Bezahlt',
      paymentTypeReceived: 'Erhalten',
      selectPaymentType: 'Wähle die Art',
    },

    assets: {
      title: 'Vermögen',
      hasVehicle: 'Ich besitze ein Fahrzeug',
      hasVehicleExplanation: 'Schliesse hier alle Fahrzeuge ein, die du besitzt - Autos, Motorräder, Boote usw.',
      hasProperty: 'Ich besitze eine Liegenschaft oder ein Grundstück',
      hasPropertyExplanation: 'Als Liegenschaft gelten Häuser, Wohnungen, Grundstücke oder andere Immobilien, die sich in deinem Besitz befinden.',
      hasMortgage: 'Ich habe eine Hypothek',
      hasMortgageExplanation: 'Eine Hypothek ist ein Darlehen, das durch eine Immobilie besichert ist. Gib an, ob du ein solches Darlehen aufgenommen hast.',
      hasDebt: 'Ich habe Schulden',
      hasDebtExplanation: 'Zu Schulden zählen alle offenen Kredite, Darlehen und andere finanzielle Verpflichtungen, die du zurückzahlen musst.',
      hasDepositAccount: 'Ich habe ein Depotkonto',
      hasDepositAccountExplanation: 'Ein Depotkonto beinhaltet Wertpapiere wie Aktien, Anleihen, ETFs oder andere Investitionen, die du bei einer Bank oder einem Broker hältst.',
      hasCrypto: 'Ich besitze Kryptowährungen',
      hasCryptoExplanation: 'Kryptowährungen wie Bitcoin, Ethereum oder andere digitale Währungen, die du zum Stichtag besessen hast.',
      hasOtherAssets: 'Ich besitze weitere Vermögenswerte',
      hasOtherAssetsExplanation: 'Weitere Vermögenswerte können Sammlungen, Edelmetalle, Kunst oder andere Wertgegenstände sein, die nicht in den vorherigen Kategorien erfasst wurden.',
      otherAssetsDescription: 'Beschreibung der weiteren Vermögenswerte',
      vehicleDetails: 'Fahrzeug Details',
      vehicleName: 'Bezeichnung',
      purchasePrice: 'Kaufpreis',
      purchaseYear: 'Kaufjahr',
      addVehicle: 'Fahrzeug hinzufügen',
      propertyDetails: 'Liegenschaft Details',
      propertyType: 'Art',
      propertyLocation: 'Kanton oder Land',
      taxValue: 'Steuerwert',
      rentalValue: 'Eigenmietwert',
      propertyOutsideCanton: 'Liegt die Liegenschaft in einem anderen Kanton oder im Ausland?',
      propertyOlderThanFive: 'Ist die Liegenschaft mehr als 5 Jahre alt?',
      addProperty: 'Liegenschaft hinzufügen',
      debtDetails: 'Schuld Details',
      debtDescription: 'Beschreibung der Schuld',
      debtAmount: 'Wert der Schuld',
      addDebt: 'Schuld hinzufügen',
      propertyHouse: 'Einfamilienhaus',
      propertyApartment: 'Eigentumswohnung',
      propertyMultiFamily: 'Mehrfamilienhaus',
      propertyLand: 'Bauland',
      propertyMeadow: 'Wiese',
      propertyInheritance: 'Liegenschaft aus unverteilter Erbshaft',
      propertyOther: 'Andere',
      selectPropertyType: 'Wähle eine Art',
    },
    
    profile: {
      title: 'Profil',
      loading: 'Profil wird geladen...',
      signOutSuccess: 'Erfolgreich abgemeldet',
      signOutError: 'Fehler beim Abmelden',
      profilePicture: 'Profilbild',
      profilePictureDescription: 'Laden Sie Ihr Profilbild hoch oder ändern Sie es.',
      profileInfo: 'Profil-Informationen',
      profileInfoDescription: 'Deine persönlichen Daten und Kontoinformationen.',
      nameNotAvailable: 'Name nicht verfügbar',
      emailNotAvailable: 'E-Mail nicht verfügbar',
      edit: 'Bearbeiten',
      inviteFriends: 'Freunde einladen',
      inviteFriendsDescription: 'Lade Freunde ein und erhalte CHF 20.- Rabatt.',
      inviteFriendsReward: 'CHF 20.- für dich & deine Freunde',
      shareYourCode: 'Teile deinen persönlichen Code',
      signOut: 'Abmelden',
      personalInfo: 'Persönliche Informationen',
      firstName: 'Vorname',
      lastName: 'Nachname',
      email: 'E-Mail',
      phone: 'Telefon',
      address: 'Adresse',
      dateOfBirth: 'Geburtsdatum',
      avatar: 'Profilbild',
      saveChanges: 'Änderungen speichern',
      profileUpdated: 'Profil aktualisiert',
      profileUpdatedDescription: 'Deine Profilinformationen wurden erfolgreich gespeichert.',
      uploadError: 'Upload-Fehler',
      uploadErrorDescription: 'Beim Hochladen des Bildes ist ein Fehler aufgetreten.',
      privacySettings: 'Datenschutz-Einstellungen',
      dataProcessing: 'Datenverarbeitung',
      marketing: 'Marketing',
      analytics: 'Analytik',
      cookiePreferences: 'Cookie-Einstellungen',
      functional: 'Funktional',
      performance: 'Leistung',
      targeting: 'Zielgerichtet',
      savePreferences: 'Einstellungen speichern',
      preferencesUpdated: 'Einstellungen aktualisiert',
      preferencesUpdatedDescription: 'Deine Datenschutz-Einstellungen wurden gespeichert.',
      managePeople: 'Personen',
      managePeopleDescription: 'Verwalte Personen, für die du Steuererklärungen erstellst.',
      managePeopleCard: 'Personen verwalten',
      managePeopleCardDescription: 'Steuererklärungen für Familienmitglieder',
    },
    
    forms: {
      save: 'Speichern',
      cancel: 'Abbrechen',
      reset: 'Zurücksetzen',
      clear: 'Löschen',
      next: 'Weiter',
      previous: 'Zurück',
      submit: 'Absenden',
      saving: 'Speichern...',
      saved: 'Gespeichert',
      savedAt: 'Gespeichert um',
      required: 'Pflichtfeld',
      optional: 'Optional',
      fieldReset: 'Feld zurücksetzen',
      sectionReset: 'Sektion zurücksetzen',
      resetSection: 'Sektion zurücksetzen',
      resetConfirm: 'Bist du sicher, dass du alle Eingaben in der Sektion zurücksetzen möchtest?',
      resetConfirmDescription: 'Diese Aktion kann nicht rückgängig gemacht werden.',
      resetButton: 'Zurücksetzen',
      importFromPreviousYear: 'Aus {year} importieren',
      importSuccessful: 'Import erfolgreich',
      importSuccessfulDescription: 'Daten aus {section} für {year} wurden erfolgreich importiert.',
      importFailed: 'Import fehlgeschlagen',
      importFailedDescription: 'Beim Import ist ein Fehler aufgetreten.',
      importing: 'Importiere...',
      importConfirm: 'Daten aus {year} importieren?',
      importConfirmDescription: 'Möchtest du deine {section}-Daten aus {year} importieren? Dies wird die aktuellen Eingaben überschreiben.',
      import: 'Importieren',
      back: 'Zurück',
      continue: 'Weiter',
      savedSuccessfully: 'Gespeichert',
      savedSuccessfullyDescription: 'Deine Daten wurden erfolgreich gespeichert.',
      saveError: 'Speicherfehler',
      saveErrorDescription: 'Beim Speichern ist ein Fehler aufgetreten. Bitte versuche es erneut.',
    },
    
    taxReturn: {
      title: 'Steuererklärung',
      taxReturns: 'Steuererklärungen',
      newTaxReturn: 'Neue Steuererklärung',
      personalData: 'Persönliche Daten',
      income: 'Einkommen',
      deductions: 'Abzüge',
      assets: 'Vermögen',
      documents: 'Dokumente',
      summary: 'Zusammenfassung',
      completedReturns: 'Fertige Steuererklärungen',
      status: 'Status',
      year: 'Jahr',
      created: 'Erstellt',
      updated: 'Aktualisiert',
      download: 'Herunterladen',
      view: 'Anzeigen',
      noReturns: 'Keine Steuererklärungen',
      noReturnsDescription: 'Du hast noch keine abgeschlossenen Steuererklärungen.',
      paymentStatus: 'Zahlungsstatus',
      paid: 'Bezahlt',
      pending: 'Ausstehend',
      draft: 'Entwurf',
      submitted: 'Eingereicht',
      completed: 'Abgeschlossen',
      processing: 'In Bearbeitung',
      addTaxYear: 'Steuerjahr hinzufügen',
      selectYear: 'Wähle ein Jahr',
      createSuccess: 'Steuererklärung erstellt',
      createSuccessDescription: 'Die Steuererklärung wurde erfolgreich erstellt.',
      createError: 'Fehler beim Erstellen',
      createErrorDescription: 'Es gab ein Problem beim Erstellen der Steuererklärung.',
      deleteSuccess: 'Erfolgreich gelöscht',
      deleteSuccessDescription: 'Die Steuererklärung wurde entfernt.',
      deleteError: 'Fehler beim Löschen',
      deleteErrorDescription: 'Die Steuererklärung konnte nicht gelöscht werden.',
      noCompletedReturns: 'Keine fertigen Steuererklärungen gefunden',
      noCompletedReturnsDescription: 'Deine abgeschlossenen Steuererklärungen werden hier angezeigt, sobald sie von unserem Team hochgeladen wurden.',
      loadingError: 'Fehler beim Laden',
      loadingErrorDescription: 'Bitte versuche es später erneut.',
      // Progress tracker translations
      dataCollection: 'Erfassen der Angaben',
      dataCollectionDescription: 'Deine Daten werden erfasst',
      documentUpload: 'Hochladen der Unterlagen',
      documentUploadDescription: 'Dokumente werden verarbeitet',
      submission: 'Einreichen',
      submissionDescription: 'Wird eingereicht',
      inCreation: 'Erstellung der Steuererklärung',
      inCreationDescription: 'Wird erstellt',
      completedMessage: 'Die Steuererklärung wurde versandt',
      completedDescription: 'Abgeschlossen',
      currentProcessing: 'Deine Steuererklärung wird aktuell durch unser Team bearbeitet.',
      actionDialogTitle: 'Steuererklärung',
      actionDialogDescription: 'Wähle eine Aktion für deine Steuererklärung:',
      downloadAction: 'Herunterladen',
      viewAction: 'Ansehen',
      downloadSuccess: 'Download erfolgreich',
      downloadSuccessDescription: 'wurde heruntergeladen.',
      downloadFailed: 'Download fehlgeschlagen',
      downloadFailedDescription: 'Die Datei konnte nicht heruntergeladen werden:',
      viewSuccess: 'Datei geöffnet',
      viewSuccessDescription: 'wird in einem neuen Tab geöffnet.',
      viewFailed: 'Ansicht fehlgeschlagen',
      viewFailedDescription: 'Die Datei konnte nicht geöffnet werden:',
      fileNotFound: 'Datei nicht gefunden',
      fileNotFoundDescription: 'Die Datei existiert nicht im Speicher. Bitte kontaktieren Sie den Administrator.',
      // Dashboard specific translations
      dashboard: {
        tasksCompleted: 'von {total} Aufgaben erledigt',
        completeFirst: 'Bitte vervollständige zuerst: {dependencies}',
        sections: {
          contact: 'Kontaktangaben',
          income: 'Einkommen',
          deductions: 'Abzüge',
          assets: 'Vermögen',
          summary: 'Zusammenfassung',
          documents: 'Unterlagen',
          submit: 'Einreichen'
        }
      }
    },
    
    chat: {
      title: 'Chat',
      support: 'Support',
      typeMessage: 'Nachricht eingeben...',
      send: 'Senden',
      attachFile: 'Datei anhängen',
      online: 'Online',
      offline: 'Offline',
      connecting: 'Verbinden...',
      messageRead: 'Gelesen',
      messageDelivered: 'Zugestellt',
      noMessages: 'Keine Nachrichten',
      noMessagesDescription: 'Beginne eine Unterhaltung mit unserem Support-Team.',
    },
    
    admin: {
      panel: 'Admin Panel',
      users: 'Benutzer',
      documents: 'Dokumente',
      reports: 'Berichte',
      settings: 'Einstellungen',
      userDetail: 'Benutzerdetails',
      userDocuments: 'Benutzerdokumente',
      userNotes: 'Benutzernotizen',
      addNote: 'Notiz hinzufügen',
      saveNote: 'Notiz speichern',
      noteAdded: 'Notiz hinzugefügt',
      noteAddedDescription: 'Die Notiz wurde erfolgreich gespeichert.',
      accessLog: 'Zugriffs-Log',
      downloadDocuments: 'Dokumente herunterladen',
      downloadFormData: 'Formulardaten herunterladen',
      viewDocument: 'Dokument anzeigen',
      documentPreview: 'Dokumentvorschau',
      closePreview: 'Vorschau schließen',
      accessDenied: 'Zugriff verweigert',
      accessDeniedDescription: 'Du hast keine Berechtigung, auf diese Seite zuzugreifen.',
    },
    
    help: {
      title: 'Hilfe',
      faq: 'Häufig gestellte Fragen',
      contact: 'Kontakt',
      guides: 'Anleitungen',
      tutorials: 'Tutorials',
      searchHelp: 'Hilfe durchsuchen',
      categories: 'Kategorien',
      gettingStarted: 'Erste Schritte',
      taxQuestions: 'Steuerfragen',
      technical: 'Technisch',
      account: 'Konto',
    },
    
    feedback: {
      title: 'Feedback',
      yourFeedback: 'Dein Feedback',
      rating: 'Bewertung',
      comments: 'Kommentare',
      category: 'Kategorie',
      general: 'Allgemein',
      bug: 'Fehler',
      feature: 'Feature-Wunsch',
      improvement: 'Verbesserung',
      submitFeedback: 'Feedback senden',
      thankYou: 'Vielen Dank',
      feedbackSubmitted: 'Feedback gesendet',
      feedbackSubmittedDescription: 'Vielen Dank für dein Feedback!',
      anonymous: 'Anonym',
    },

    // Feedback Page
    feedbackPage: {
      title: 'Feedback',
      satisfactionQuestion: 'Wie zufrieden bist du mit Ditax?',
      featureRequestLabel: 'Welche Funktionen wünschst du dir?',
      featureRequestOptional: '(optional)',
      featureRequestPlaceholder: 'z.B. Automatische Belegerfassung, iOS Widget, Export-Funktion...',
      submitButton: 'Feedback senden',
      submitting: 'Wird gesendet...',
      ratingRequired: 'Bewertung fehlt',
      ratingRequiredDescription: 'Bitte wähle eine Bewertung aus.',
      notLoggedIn: 'Nicht angemeldet',
      notLoggedInDescription: 'Bitte melde dich an, um Feedback zu geben.',
      error: 'Fehler',
      errorDescription: 'Beim Senden ist ein Fehler aufgetreten. Bitte versuche es erneut.',
      thankYouTitle: 'Vielen Dank für dein Feedback!',
      thankYouMessage: 'Deine Meinung hilft uns, Ditax stetig zu verbessern.',
      backToHome: 'Zurück zur Startseite',
      successToast: 'Vielen Dank! 🎉',
      successToastDescription: 'Dein Feedback wurde erfolgreich übermittelt.',
      ratings: {
        veryUnsatisfied: 'Sehr unzufrieden',
        unsatisfied: 'Unzufrieden',
        neutral: 'Neutral',
        satisfied: 'Zufrieden',
        verySatisfied: 'Sehr zufrieden',
      },
    },

    // Privacy Settings Page
    privacySettingsPage: {
      title: 'Datenschutz-Einstellungen',
      pleaseLogin: 'Bitte melden Sie sich an.',
      privacyPreferences: 'Datenschutz-Präferenzen',
      marketingEmails: 'Marketing-E-Mails',
      marketingEmailsDescription: 'Erhalten Sie Updates, Newsletter und exklusive Angebote.',
      saveSettings: 'Einstellungen speichern',
      settingsSaved: 'Einstellungen gespeichert',
      settingsSavedDescription: 'Ihre Datenschutz-Einstellungen wurden aktualisiert.',
      saveError: 'Fehler',
      saveErrorDescription: 'Einstellungen konnten nicht gespeichert werden.',
      dataPortability: 'Datenportabilität',
      dataPortabilityDescription: 'Laden Sie eine Kopie aller Ihrer gespeicherten Daten inklusive Einstellungen und Historie im JSON-Format herunter.',
      downloadMyData: 'Meine Daten herunterladen',
      dataDownloaded: 'Daten heruntergeladen',
      dataDownloadedDescription: 'Ihre Daten wurden als JSON-Datei heruntergeladen.',
      downloadError: 'Fehler',
      downloadErrorDescription: 'Daten konnten nicht heruntergeladen werden.',
      deleteAccount: 'Account löschen',
      deleteAccountDescription: 'Diese Aktion löscht unwiderruflich alle Ihre Daten. Sobald Sie fortfahren, kann dieser Prozess nicht rückgängig gemacht werden.',
      deleteAccountButton: 'Account löschen',
      whyLeaving: 'Warum möchten Sie gehen?',
      feedbackHelps: 'Ihr Feedback hilft uns, unseren Service zu verbessern.',
      reasonRequired: 'Grund erforderlich',
      reasonRequiredDescription: 'Bitte wählen Sie einen Grund für die Kontolöschung.',
      additionalFeedback: 'Zusätzliches Feedback (optional)',
      additionalFeedbackPlaceholder: 'Was können wir besser machen?',
      cancel: 'Abbrechen',
      next: 'Weiter',
      finalConfirmation: 'Endgültige Bestätigung',
      warningLabel: 'Achtung:',
      deleteWarningList: {
        profile: 'Ihr Benutzerprofil',
        taxReturns: 'Alle Steuererklärungen',
        documents: 'Alle hochgeladenen Dokumente',
        chatMessages: 'Alle Chat-Nachrichten',
      },
      typeToConfirm: 'Geben Sie {word} ein, um zu bestätigen',
      deleteConfirmWord: 'LÖSCHEN',
      confirmRequired: 'Bestätigung erforderlich',
      confirmRequiredDescription: "Bitte geben Sie 'LÖSCHEN' ein, um fortzufahren.",
      deleting: 'Wird gelöscht...',
      dataDeleted: 'Daten gelöscht',
      dataDeletedDescription: 'Ihre Daten wurden gelöscht. Sie werden jetzt abgemeldet.',
      accountDeleted: 'Account vollständig gelöscht',
      accountDeletedDescription: 'Ihr Account und alle Daten wurden erfolgreich gelöscht.',
      noActiveSession: 'Keine aktive Sitzung gefunden',
      deletionReasons: {
        notUsing: 'Ich nutze den Service nicht mehr',
        tooExpensive: 'Zu teuer',
        privacyConcerns: 'Datenschutzbedenken',
        badExperience: 'Schlechte Benutzererfahrung',
        foundAlternative: 'Andere Steuerlösung gefunden',
        other: 'Sonstiges',
      },
    },

    // Terms Page
    termsPage: {
      title: 'Nutzungsbedingungen',
    },

    // Privacy Policy Page
    privacyPolicyPage: {
      title: 'Datenschutzrichtlinie',
    },

    payment: {
      title: 'Zahlung',
      success: 'Erfolgreich',
      failed: 'Fehlgeschlagen',
      pending: 'Ausstehend',
      amount: 'Betrag',
      date: 'Datum',
      reference: 'Referenz',
      receipt: 'Quittung',
      download: 'Herunterladen',
      backToDashboard: 'Zurück zum Dashboard',
    },

    tickets: {
      status: {
        open: 'Offen',
        inProgress: 'In Bearbeitung',
        resolved: 'Erledigt',
        closed: 'Geschlossen',
      },
      priority: {
        low: 'Niedrig',
        medium: 'Mittel',
        high: 'Hoch',
        urgent: 'Dringend',
      },
      create: 'Ticket erstellen',
      title: 'Titel',
      description: 'Beschreibung',
      assignedTo: 'Zugewiesen an',
      createdBy: 'Erstellt von',
      lastUpdated: 'Zuletzt aktualisiert',
      resolvedAt: 'Gelöst am',
    },

    taxFilers: {
      title: 'Steuerpflichtiger',
      pageTitle: 'Personen verwalten',
      pageDescription: 'Verwalten Sie hier die Personen, für die Sie Steuererklärungen erstellen möchten. Zum Beispiel für Ihre Kinder oder Eltern.',
      selectPerson: 'Person wählen',
      primary: 'Primär',
      manage: 'Verwalten',
      addPerson: 'Person hinzufügen',
      editPerson: 'Person bearbeiten',
      deletePerson: 'Person löschen',
      addPersonHint: 'Sie können weitere Personen hinzufügen, um deren Steuererklärungen zu verwalten.',
      noPersons: 'Keine Personen gefunden.',
      firstName: 'Vorname',
      lastName: 'Nachname',
      dateOfBirth: 'Geburtsdatum',
      relationship: 'Beziehung',
      relationships: {
        self: 'Ich selbst',
        child: 'Kind',
        spouse: 'Ehepartner',
        parent: 'Elternteil',
        other: 'Andere',
      },
      addDescription: 'Fügen Sie eine neue Person hinzu, für die Sie Steuererklärungen erstellen möchten.',
      editDescription: 'Ändern Sie die Daten der Person.',
      deleteTitle: 'Person löschen?',
      deleteDescription: 'Möchten Sie diese Person wirklich löschen? Alle zugehörigen Steuererklärungen und Dokumente werden ebenfalls gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.',
      deleteConfirm: 'Löschen',
      infoTitle: 'Hinweis',
      infoDescription: 'Jede Person hat separate Formulardaten und Dokumente. Die primäre Person (Sie selbst) kann nicht gelöscht werden.',
    },
    
    common: {
      loading: 'Laden...',
      error: 'Fehler',
      success: 'Erfolgreich',
      warning: 'Warnung',
      info: 'Info',
      yes: 'Ja',
      no: 'Nein',
      ok: 'OK',
      cancel: 'Abbrechen',
      close: 'Schliessen',
      open: 'Öffnen',
      edit: 'Bearbeiten',
      delete: 'Löschen',
      view: 'Anzeigen',
      download: 'Herunterladen',
      upload: 'Hochladen',
      search: 'Suchen',
      filter: 'Filter',
      sort: 'Sortieren',
      refresh: 'Aktualisieren',
      back: 'Zurück',
      continue: 'Weiter',
      finish: 'Fertig',
      languages: 'Sprachen',
      german: 'Deutsch',
      english: 'English',
      remove: 'Entfernen',
    },
    
    idle: {
      title: 'Sitzung läuft ab',
      message: 'Deine Sitzung läuft aufgrund von Inaktivität ab.',
      timeLeft: 'Verbleibende Zeit',
      extendSession: 'Sitzung verlängern',
      minutes: 'Minuten',
      seconds: 'Sekunden',
    },
    
    cookies: {
      title: 'Cookie-Einstellungen',
      message: 'Wir verwenden Cookies, um deine Erfahrung zu verbessern.',
      accept: 'Alle akzeptieren',
      decline: 'Ablehnen',
      settings: 'Einstellungen',
      necessary: 'Notwendig',
      functional: 'Funktional',
      analytics: 'Analytik',
      marketing: 'Marketing',
      cookiePolicy: 'Cookie-Richtlinie',
    },
    
    errors: {
      pageNotFound: 'Seite nicht gefunden',
      pageNotFoundDescription: 'Die angeforderte Seite konnte nicht gefunden werden.',
      goHome: 'Zur Startseite',
      serverError: 'Server-Fehler',
      networkError: 'Netzwerk-Fehler',
      validationError: 'Validierungsfehler',
      permissionDenied: 'Zugriff verweigert',
      sessionExpired: 'Sitzung abgelaufen',
      tryAgain: 'Erneut versuchen',
    },

    // Upload functionality
    upload: {
      avatar: {
        fileTooLarge: 'Datei zu groß',
        fileTooLargeDesc: 'Avatar-Dateien dürfen maximal 10MB groß sein.',
        invalidFileType: 'Ungültiger Dateityp',
        invalidFileTypeDesc: 'Bitte wähle eine Bilddatei aus.',
        noFileSelected: 'Keine Datei ausgewählt',
        userNotLoggedIn: 'Benutzer nicht angemeldet',
        uploadSuccess: 'Avatar erfolgreich hochgeladen',
        uploadSuccessDesc: 'Dein Avatar wurde aktualisiert.',
        uploadFailed: 'Avatar-Upload fehlgeschlagen',
        uploading: 'Wird hochgeladen...',
        uploadButton: 'Avatar hochladen',
        profileImage: 'Profilbild',
        newFileSelected: 'Neue Datei ausgewählt',
      },
      
      documents: {
        title: 'Dokumente hochladen',
        finished: 'Fertig',
        cancel: 'Abbrechen',
        pleaseWait: 'Bitte warten...',
        addMoreFiles: 'Weitere Dateien hinzufügen',
        selectFiles: 'Dateien auswählen',
        supportedFormats: 'Unterstützte Formate: JPG, PNG, PDF (max. 10 MB)',
        encryptionEnabled: 'Verschlüsselung aktiviert',
        standardUpload: 'Standard-Upload',
        encryptionDescription: 'Dokumente werden clientseitig verschlüsselt für maximale Sicherheit',
        standardDescription: 'Dokumente werden unverschlüsselt gespeichert (nicht empfohlen für sensible Daten)',
        encrypting: 'Verschlüsselung läuft...',
        uploading: 'Wird hochgeladen...',
        uploadFiles: 'hochladen',
        encrypted: 'verschlüsselt',
        preview: 'Vorschau',
        uploadProgress: 'Upload-Fortschritt',
        encryptionProgress: 'Verschlüsselung & Upload',
        fileTooLarge: 'ist zu groß (max. 10 MB).',
        invalidFormat: 'hat ein ungültiges Format (nur JPG, PNG, PDF).',
        selectAtLeastOne: 'Bitte wähle mindestens eine Datei aus.',
        noFilesToUpload: 'Keine Dateien zum Hochladen vorhanden.',
        uploadSuccess: 'Dokumente hochgeladen',
        uploadSuccessDesc: 'erfolgreich hochgeladen.',
        loginRequired: 'Du musst angemeldet sein, um Dokumente hochzuladen.',
        uploadError: 'Upload-Fehler',
        databaseError: 'Datenbankfehler',
      },
    },

    // Note: documentChecklist is now defined later with extended properties

    // Common UI elements
    ui: {
      loading: 'Wird geladen...',
      save: 'Speichern',
      cancel: 'Abbrechen',
      delete: 'Löschen',
      edit: 'Bearbeiten',
      view: 'Ansehen',
      upload: 'Hochladen',
      download: 'Herunterladen',
      back: 'Zurück',
      next: 'Weiter',
      continue: 'Fortfahren',
      finish: 'Fertig',
      close: 'Schließen',
      open: 'Öffnen',
      search: 'Suchen',
      refresh: 'Aktualisieren',
    },

    // Status messages
    status: {
      success: 'Erfolgreich',
      error: 'Fehler',
      warning: 'Warnung',
      info: 'Information',
      complete: 'Abgeschlossen',
      pending: 'Ausstehend',
      processing: 'Wird verarbeitet',
    },

    // Yes/No Form
    yesNoForm: {
      yes: 'Ja',
      no: 'Nein',
      yesDescription: 'Diese Angabe trifft auf mich zu.',
      noDescription: 'Diese Angabe trifft nicht auf mich zu.',
      moreInfo: 'Mehr Informationen',
      answerSaved: 'Änderung gespeichert',
      answerSavedDescription: 'Deine Antwort wurde aktualisiert.',
      answerError: 'Fehler bei der Antwort',
      answerErrorDescription: 'Bitte versuche es erneut.',
      questions: {
        income: {
          hasPension: {
            text: 'Erhältst du Renten aus Sozialversicherungen oder einer Pensionskasse?',
            explanation: 'Dazu gehören AHV-Renten, IV-Renten, Pensionskassenrenten, berufliche Vorsorge (BVG), Unfallrenten, Militärversicherungsrenten sowie ausländische Sozialversicherungsrenten. Auch Renten von Freizügigkeitsstiftungen und vorzeitige Pensionierungsleistungen zählen dazu.'
          },
          hasGiftInheritance: {
            text: 'Hast du eine Schenkung oder einen Erbvorbezug erhalten?',
            explanation: 'Schenkungen sind unentgeltliche Zuwendungen von Dritten wie Geldgeschenke, Immobilien oder andere Wertsachen. Erbvorbezüge sind Vermögenswerte, die du bereits zu Lebzeiten der Erblasser erhalten hast und die später vom Erbe abgezogen werden. Beide müssen in der Steuererklärung deklariert werden.'
          },
          hasPensionPayout: {
            text: 'Hast du eine Kapitalauszahlung aus der Säule 2 oder Säule 3 erhalten?',
            explanation: 'Kapitalauszahlungen aus der beruflichen Vorsorge (Säule 2) oder der gebundenen Selbstvorsorge (Säule 3a) bei Pensionierung, Invalidität, Auswanderung oder Aufnahme einer selbständigen Erwerbstätigkeit. Diese werden separat und zu einem reduzierten Steuersatz besteuert.'
          },
          hasRental: {
            text: 'Hast du Mieteinnahmen?',
            explanation: 'Mieteinnahmen aus der Vermietung von Wohnungen, Häusern, Gewerberäumen oder anderen Immobilien müssen als Einkommen deklariert werden. Dies umfasst auch Untervermietungen und kurzfristige Vermietungen über Plattformen wie Airbnb.'
          },
          hasDividends: {
            text: 'Hast du Dividenden oder Kapitalerträge erhalten?',
            explanation: 'Dividenden aus Aktien, Genossenschaftsanteilen und anderen Beteiligungen sowie Zinserträge aus Obligationen und anderen Wertpapieren müssen als Einkommen deklariert werden. Dies gilt für in- und ausländische Erträge.'
          },
          hasOtherIncome: {
            text: 'Hast du weitere Einkommen generiert?',
            explanation: 'Weitere Einkommen umfassen Nebeneinkommen aus Teilzeitarbeit, Pachterträge, Tantiemen, Gratifikationen, Honorare aus selbständiger Nebentätigkeit sowie alle anderen nicht bereits erfassten Einkommensarten.'
          },
          hasFreelance: {
            text: 'Bist du selbständigerwerbend?',
            explanation: 'Selbständigerwerbend sind Personen, die ein eigenes Unternehmen führen, freiberuflich tätig sind oder als Einzelfirma, GmbH oder AG geschäftlich aktiv sind. Dazu gehören auch Ärzte mit eigener Praxis, Anwälte, Berater, Handwerker mit eigenem Betrieb sowie Online-Unternehmer und Influencer.'
          },
          hasSalary: {
            text: 'Bist du Arbeitnehmer?',
            explanation: 'Als Arbeitnehmer gelten alle Personen in einem Anstellungsverhältnis mit einem Arbeitsvertrag. Dazu gehören Vollzeit- und Teilzeitangestellte, Lehrlinge, Praktikanten, Temporärangestellte sowie Personen mit mehreren Arbeitgebern. Der Lohn wird durch den Lohnausweis dokumentiert.'
          }
        },
        assets: {
          hasVehicle: {
            text: 'Besitzt du Fahrzeuge?',
            explanation: 'Alle motorisierten Fahrzeuge wie Autos, Motorräder, Wohnmobile, Boote, Jet-Skis und andere Wasserfahrzeuge müssen als Vermögen deklariert werden. Der Verkehrswert zum Stichtag 31. Dezember ist massgebend, nicht der ursprüngliche Kaufpreis. Leasingfahrzeuge gehören nicht zum steuerbaren Vermögen.'
          },
          hasProperty: {
            text: 'Besitzt du Immobilien?',
            explanation: 'Zu den Immobilien gehören das selbstbewohnte Eigenheim, Ferienhäuser, vermietete Liegenschaften, Eigentumswohnungen, Bauland, landwirtschaftliche Grundstücke sowie Anteile an Immobilienfonds oder Immobilien-AGs. Der Steuerwert wird meist durch die Steuerbehörden festgelegt und kann vom Marktwert abweichen.'
          },
          hasMortgage: {
            text: 'Hast du Hypotheken oder Immobilienkredite?',
            explanation: 'Hypotheken und andere Immobilienkredite sind abzugsfähige Schulden. Dazu gehören erste und zweite Hypotheken, Vorfinanzierungskredite für den Hausbau, Renovationskredite sowie private Darlehen für Immobilienkäufe. Der Schuldsaldo per 31. Dezember ist massgebend für die Steuererklärung.'
          },
          hasDebt: {
            text: 'Hast du Schulden?',
            explanation: 'Abzugsfähige Schulden umfassen Bankkredite, Privatkredite, Kreditkartenschulden, Leasingverpflichtungen, geschäftliche Darlehen, Steuerschulden sowie Verbindlichkeiten gegenüber Dritten. Nicht abzugsfähig sind Schulden für den Lebensunterhalt oder Konsumschulden ohne wirtschaftlichen Zweck.'
          },
          hasDepositAccount: {
            text: 'Hast du ein Depotkonto?',
            explanation: 'Depotkonten enthalten Wertpapiere wie Aktien, Obligationen, Anlagefonds, ETFs, strukturierte Produkte sowie andere börsengehandelte Anlagen. Alle Wertpapiere in der Schweiz und im Ausland müssen mit dem Kurswert per 31. Dezember deklariert werden. Auch ausländische Depots und Online-Broker wie Interactive Brokers, Swissquote oder Trading 212 gehören dazu.'
          },
          hasCrypto: {
            text: 'Besitzt du Kryptowährungen?',
            explanation: 'Kryptowährungen wie Bitcoin, Ethereum, Litecoin und alle anderen digitalen Assets gelten als steuerbares Vermögen. Der Wert per 31. Dezember gemäss offiziellen Kurslisten der Eidgenössischen Steuerverwaltung ist massgebend. Auch DeFi-Tokens, NFTs und Staking-Rewards müssen deklariert werden.'
          },
          hasOtherAssets: {
            text: 'Hast du weitere Vermögen?',
            explanation: 'Weitere Vermögenswerte umfassen Kunstwerke, Antiquitäten, Schmuck, Edelmetalle, Sammlungen, Lebensversicherungen mit Rückkaufswert, Forderungen gegenüber Dritten, Beteiligungen an nicht kotierten Unternehmen sowie alle anderen Wertsachen mit einem Verkehrswert über 5000 Franken.'
          }
        },
        deductions: {
          hasPillar3a: {
            text: 'Zahlst du in die Säule 3a ein?',
            explanation: 'Die Säule 3a ist die steuerlich begünstigte, gebundene Selbstvorsorge. Einzahlungen können bis zum gesetzlichen Maximum (aktuell 7056 CHF für Angestellte, 35280 CHF für Selbständige ohne Pensionskasse) vollständig vom steuerbaren Einkommen abgezogen werden. Die Einzahlungen müssen bis zum 31. Dezember erfolgen.'
          },
          hasBVGPurchase: {
            text: 'Hast du Einkäufe in die Pensionskasse getätigt?',
            explanation: 'Freiwillige Einkäufe in die berufliche Vorsorge (BVG) zur Verbesserung der Alters- und Invalidenleistungen sind vollständig steuerlich abzugsfähig. Der mögliche Einkaufsbetrag wird durch die Pensionskasse berechnet und im Vorsorgeausweis ausgewiesen. Bei Kapitalbezug innerhalb von drei Jahren sind Einschränkungen zu beachten.'
          },
          hasEducationExpenses: {
            text: 'Hast du Weiterbildungskosten?',
            explanation: 'Abzugsfähig sind berufsorientierte Aus- und Weiterbildungskosten, Umschulungen, Studiengänge zur beruflichen Verbesserung, Sprachkurse mit beruflichem Bezug, Fachliteratur, Seminar- und Kursgebühren. Reine Hobbyaktivitäten oder allgemeinbildende Kurse ohne beruflichen Bezug sind nicht abzugsfähig.'
          },
          hasDonations: {
            text: 'Hast du Spenden geleistet?',
            explanation: 'Spenden an gemeinnützige, mildtätige oder kirchliche Organisationen mit Sitz in der Schweiz sind bis zu 20% des Reineinkommens abzugsfähig. Die Organisation muss von der Steuerbehörde als gemeinnützig anerkannt sein. Spenden an politische Parteien oder ausländische Organisationen sind grundsätzlich nicht abzugsfähig.'
          },
          hasPropertyMaintenance: {
            text: 'Hast du Unterhaltskosten für Liegenschaften?',
            explanation: 'Abzugsfähig sind Kosten für den Unterhalt und die Renovation von selbstbewohnten und vermieteten Liegenschaften. Dazu gehören Reparaturen, Erneuerungen, energetische Sanierungen, Gartenpflege und Schneeräumung. Wertvermehrende Investitionen können über mehrere Jahre verteilt abgezogen werden.'
          },
          hasOtherDeductions: {
            text: 'Hast du weitere Abzüge?',
            explanation: 'Weitere abzugsfähige Kosten umfassen Verwaltungskosten für Wertschriften, Steuerberatungskosten, Versicherungsprämien für Erwerbs- und Berufsunfähigkeit, Kranken- und Unfallversicherungsprämien sowie außerordentliche Belastungen wie hohe Krankheitskosten oder Katastrophenschäden.'
          },
          hasSupportedPersons: {
            text: 'Unterstützt du andere Personen finanziell?',
            explanation: 'Unterstützungsleistungen an bedürftige Angehörige wie Eltern, Grosseltern, erwachsene Kinder oder andere Verwandte sind abzugsfähig, wenn diese nicht über ausreichende eigene Mittel verfügen. Die Unterstützung muss regelmässig und in erheblichem Umfang erfolgen. Ein Nachweis der Bedürftigkeit ist erforderlich.'
          },
          hasMaintenancePayments: {
            text: 'Zahlst du Unterhaltsbeiträge?',
            explanation: 'Gesetzlich oder gerichtlich festgelegte Unterhaltszahlungen an geschiedene oder getrennt lebende Ehegatten sowie Alimente für Kinder sind vollständig vom Einkommen abzugsfähig. Freiwillige Zahlungen über das gesetzlich Vorgeschriebene hinaus sind nur in Ausnahmefällen abzugsfähig. Kinderalimente werden beim Empfänger als Einkommen besteuert.'
          },
          hasChildcare: {
            text: 'Hast du Kinderbetreuungskosten?',
            explanation: 'Kosten für die Betreuung von Kindern unter 14 Jahren durch Dritte sind abzugsfähig, wenn beide Elternteile erwerbstätig sind oder sich in Ausbildung befinden. Dazu gehören Kosten für Krippen, Kindergärten, Horte, Tagesmütter und Babysitter. Die Betreuung durch Verwandte ist nur bei nachgewiesener Entlohnung abzugsfähig.'
          }
        }
      }
    },

    // Onboarding/Welcome
    onboarding: {
      consentTitle: 'Datenschutz & Einwilligungen',
      nameTitle: 'Wie lautet dein Vorname?',
      yearTitle: 'Grüezi {name}, welches Steuerjahr möchtest du erstellen?',
      termsAccept: 'Ich akzeptiere die',
      privacyPolicy: 'Datenschutzbestimmungen',
      termsOfService: 'Nutzungsbedingungen',
      newsletterTitle: 'Newsletter & Marketing-E-Mails',
      newsletterDescription: 'Erhalte Updates zu Steueränderungen und hilfreiche Tipps (optional)',
      next: 'Weiter',
      letsGo: "Los geht's!",
      firstName: 'Vorname',
      acceptTermsError: 'Bitte akzeptiere die Datenschutzbestimmungen und Nutzungsbedingungen',
      enterNameError: 'Bitte gib deinen Namen ein',
      authError: 'Authentifizierung fehlgeschlagen',
      genericError: 'Ein Fehler ist aufgetreten',
      familyHintTitle: 'Steuererklärung für andere?',
      familyHintDescription: 'Du kannst auch Steuererklärungen für Familienmitglieder (Kinder, Ehepartner) unter deinem Account erstellen.',
      familyHintLater: 'Später einrichten',
      familyHintNow: 'Jetzt hinzufügen'
    },

    // Documents Page
    documentsPage: {
      title: 'Dokumente',
      taxYear: 'Steuerjahr',
      uploadDocuments: 'Dokumente hochladen',
      noDocuments: 'Keine Dokumente',
      noDocumentsDescription: 'Lade deine erste Unterlage hoch',
      uploadFirst: 'Erste Unterlage hochladen',
      sortByDateDesc: 'Datum (Neueste zuerst)',
      sortByDateAsc: 'Datum (Älteste zuerst)',
      sortByNameAsc: 'Name (A-Z)',
      sortByNameDesc: 'Name (Z-A)',
      sortByType: 'Dateityp',
      search: 'Suchen...',
      error: 'Fehler',
      loadError: 'Dokumente konnten nicht geladen werden',
      uploadSuccess: 'Upload erfolgreich',
      uploadSuccessDescription: '{count} Datei(en) hochgeladen',
      fileTooLarge: 'ist zu gross (max. 10 MB)',
      invalidFormat: 'hat ein ungültiges Format',
      uploadFailed: 'Dateien konnten nicht hochgeladen werden',
      filterSort: 'Sortieren',
      upload: 'Hochladen',
      collectReceipts: 'Belege sammeln',
      collectReceiptsDescription: 'Füge deine Rechnungen und Quittungen direkt hinzu.',
      lockedBanner: 'Diese Steuererklärung wurde eingereicht. Dokumente können nicht mehr geändert werden.',
      pleaseLogin: 'Bitte melde dich an',
    },

    // Invite Friends Page
    inviteFriends: {
      title: 'Freunde einladen',
      subtitle: 'Teile deinen Code und erhalte CHF 20.- Rabatt für jede erfolgreiche Einladung',
      yourCode: 'Dein persönlicher Empfehlungscode',
      yourCodeDescription: 'Teile diesen Code mit Freunden und Familie',
      clickToCopy: 'Klicken zum Kopieren',
      successfulInvites: 'Erfolgreiche Einladungen',
      remaining: 'Verbleibend',
      shareViaWhatsApp: 'WhatsApp',
      shareViaEmail: 'E-Mail',
      copyCode: 'Code kopieren',
      errorLoading: 'Fehler beim Laden des Codes',
      howItWorks: 'So funktioniert\'s',
      step1Title: 'Code teilen',
      step1Description: 'Teile deinen persönlichen Code mit Freunden',
      step2Title: 'Freund registriert sich',
      step2Description: 'Dein Freund gibt den Code bei der Registrierung ein',
      step3Title: 'Beide erhalten CHF 20.-',
      step3Description: 'Du und dein Freund erhalten sofort einen Rabattcode',
      yourDiscountCodes: 'Deine Rabattcodes',
      autoApplied: 'Diese Codes werden automatisch beim Checkout angewendet',
      earnedByInvite: 'Verdient durch Einladung',
      referralDiscount: 'Empfehlungsrabatt',
      recentInvites: 'Letzte Einladungen',
      successfulInvite: 'Erfolgreiche Einladung',
    },

    // Add Tax Year
    addTaxYear: {
      newYear: 'Neues Jahr',
      newTaxReturn: 'Neue Steuererklärung',
      startNewTaxReturn: 'Starten Sie eine neue Steuererklärung',
      selectTaxYear: 'Steuerjahr auswählen',
      addTaxYear: 'Steuerjahr hinzufügen',
      chooseYear: 'Wähle ein Steuerjahr aus',
      taxYear: 'Steuerjahr',
      createTaxReturn: 'Steuererklärung erstellen',
      allYearsCreated: 'Alle Jahre erstellt',
      yearsAlreadyExist: '2024-2030 sind bereits vorhanden',
    },

    // MultiStep Contact Form
    multiStepContactForm: {
      title: 'Kontaktangaben',
      personalData: 'Persönliche Daten',
      personalDataDescription: 'Name, Geburtsdatum, Religion, Zivilstand',
      currentAddress: 'Aktuelle Adresse',
      currentAddressDescription: 'Strasse, PLZ, Stadt, Kanton',
      additionalInfo: 'Zusätzliche Angaben',
      additionalInfoDescription: 'Adresse per 31.12., Feuerwehrdienst',
      family: 'Familie',
      familyDescription: 'Ehepartner und Kinder',
      street: 'Strasse',
      streetNumber: 'Nr.',
      selectCanton: 'Kanton auswählen',
      notAvailableYet: 'noch nicht verfügbar',
      addressAsOf: 'Adresse per 31.12.',
      differentAddressAsOf: 'Andere Adresse per 31.12.',
      firefighterLabel: 'Feuerwehrdienst',
      iDoFirefighterService: 'Ich leiste Feuerwehrdienst',
      spouseTitle: 'Ehepartner/in',
      childrenLabel: 'Kinder',
      iHaveChildren: 'Ich habe Kinder',
      finish: 'Abschliessen',
      continue: 'Weiter',
      back: 'Zurück',
      fillRequired: 'Pflichtfelder ausfüllen',
      fillRequiredDescription: 'Bitte füllen Sie alle erforderlichen Felder aus.',
    },

    // Document Checklist
    documentChecklist: {
      title: 'Unterlagen',
      generateChecklist: 'Checkliste jetzt generieren',
      generating: 'Wird geladen...',
      loading: 'Wird geladen...',
      authRequired: 'Authentifizierung erforderlich',
      authRequiredDesc: 'Du musst angemeldet sein, um deine Dokumente zu verwalten.',
      goToLogin: 'Zur Anmeldung',
      checkSession: 'Session prüfen',
      errorLoading: 'Fehler beim Laden der Dokumente',
      updateStarted: 'Aktualisierung gestartet',
      updateDescription: 'Die Dokumentenliste wird aktualisiert.',
      noDocuments: 'Keine Dokumente',
      noDocumentsDesc: 'Für diesen Punkt wurden keine Dokumente gefunden.',
      description: 'Die Dokumenten-Checkliste wird basierend auf deinen Angaben erstellt.',
      loadingMessage: 'Bitte warte, während deine Daten geladen werden.',
      categories: {
        general: 'Allgemeine Dokumente',
        income: 'Einkommen',
        assets: 'Vermögen',
        deductions: 'Abzüge',
      },
      required: 'Pflicht',
      or: 'oder',
      view: 'Ansehen',
      delete: 'Löschen',
      upload: 'Hochladen',
      assign: 'Zuweisen',
      mandatoryDocuments: 'Pflichtdokumente',
      documents: 'Dokumente',
      uploaded: 'hochgeladen',
      stillRequired: 'erforderlich',
      allMandatoryPresent: 'Alle Pflichtdokumente vorhanden',
      completedOf: 'von',
      file: 'Datei',
      files: 'Dateien',
      viewDocs: 'Ansehen',
      remove: 'Entfernen',
      generateNow: 'Checkliste jetzt generieren',
      dialogTitle: 'Alle Unterlagen vollständig!',
      taxReturnYear: 'Steuererklärung',
      dialogDescription: 'Du hast alle benötigten Unterlagen hochgeladen. Möchtest du jetzt deine Steuererklärung erstellen lassen?',
      later: 'Später',
      createNow: 'Ja, jetzt erstellen',
    },

    // Tour
    tour: {
      welcomeGreeting: 'Grüezi',
      welcomeDescription: 'Wir stellen dir die App kurz vor, damit du weisst, wie es funktioniert.',
      addYearTitle: 'Neues Steuerjahr',
      addYearDescription: 'Hier kannst du eine neue Steuererklärung starten.',
      chatTitle: 'Chat',
      chatDescription: 'Hier kannst du mit uns chatten und Fragen stellen.',
      documentsTitle: 'Unterlagen hochladen',
      documentsDescription: 'Mit diesem Button kannst du jederzeit Dokumente hochladen.',
      continueCardTitle: 'Steuerjahr fortsetzen',
      continueCardDescription: 'Steuererklärung öffnen und weiter bearbeiten.',
      skip: 'Überspringen',
      back: 'Zurück',
      next: 'Weiter',
      finish: 'Fertig',
      closeTour: 'Tour schließen',
    },

    // Auth
    authFlow: {
      login: 'Anmelden',
      loginSubtitle: 'Melde dich mit deiner E-Mail an',
      emailLabel: 'Email:',
      emailPlaceholder: 'name@mail.com',
      sendCode: 'Login Code senden',
      sendingCode: 'Code wird gesendet...',
      codeDisabled: 'E-Mail-Codes deaktiviert',
      enterCode: 'Code eingeben',
      codeSentTo: 'Wir haben dir einen Code an {email} gesendet',
      verifyButton: 'Anmelden',
      verifying: 'Wird überprüft...',
      sixDigitCode: '6-stelliger Code',
      changeEmail: 'E-Mail ändern',
      passkeyLogin: 'Mit Fingerprint anmelden',
      passkeyAuthenticating: 'Authentifizierung...',
      orEnterCode: 'oder Code eingeben',
      otpDisabled: 'OTP deaktiviert',
      otpDisabledHint: 'E-Mail-Codes sind für dieses Konto deaktiviert. Verwende deinen Fingerprint.',
      noAccount: 'Haben Sie noch kein Konto?',
      registerNow: 'Jetzt registrieren',
      codeSent: 'Code gesendet',
      codeSentDescription: 'Wir haben dir einen Anmeldecode per E-Mail gesendet.',
      loginSuccess: 'Anmeldung erfolgreich',
      loginSuccessDescription: 'Du wurdest erfolgreich angemeldet.',
      sendError: 'Fehler beim Senden',
      invalidCode: 'Ungültiger Code',
      passkeyError: 'Fehler bei Fingerprint-Anmeldung',
    },

    // Form Mode Toggle
    formModeToggle: {
      selectMode: 'Ausfüll-Modus wählen',
      yesNo: 'Ja/Nein',
      expertMode: 'Experten-Modus',
      yesNoDescription: 'Einzelne Fragen mit Ja/Nein beantworten',
      expertDescription: 'Alle Felder auf einmal ausfüllen',
    },

    // Toast Messages
    toasts: {
      answerError: 'Fehler bei der Antwort',
      answerErrorDescription: 'Bitte versuche es erneut.',
      changeSaved: 'Änderung gespeichert',
      changeSavedDescription: 'Deine Antwort wurde aktualisiert.',
      saveError: 'Fehler beim Speichern',
      saveErrorDescription: 'Die Daten konnten nicht gespeichert werden.',
      navigationError: 'Navigation Error',
      navigationErrorDescription: 'Bitte versuche es erneut.',
    },

    // Tax Return Actions Page
    taxReturnActions: {
      title: 'Steuererklärung',
      loading: 'Laden...',
      notFound: 'Keine Steuererklärung gefunden',
      backToOverview: 'Zurück zur Übersicht',
      actionRequired: 'Aktion erforderlich',
      signatureRequired: 'Unterschrift erforderlich',
      signatureDescription: 'Bitte unterschreibe deine Steuererklärung elektronisch, damit wir sie beim Steueramt einreichen können.',
      signNow: 'Jetzt unterschreiben',
      electronicallySigned: 'Elektronisch unterschrieben',
      signedAt: 'Am {date}',
      signedDescription: 'Deine Steuererklärung wurde signiert und kann eingereicht werden.',
      completed: 'Abgeschlossen',
      taxYear: 'Steuerjahr',
      view: 'Ansehen',
      download: 'Herunterladen',
      available: 'Vorhanden',
      pending: 'Ausstehend',
      definitiveTaxBill: 'Definitive Steuerrechnung',
      viewBill: 'Rechnung ansehen',
      downloadBill: 'Rechnung herunterladen',
      noBillYet: 'Noch keine Steuerrechnung vorhanden. Lade sie hier hoch, sobald du sie erhalten hast.',
      uploadBill: 'Steuerrechnung hochladen',
      support: 'Support',
      ticket: 'Ticket',
      tickets: 'Tickets',
      needHelp: 'Hilfe benötigt?',
      statusOpen: 'Offen',
      statusInProgress: 'In Bearbeitung',
      statusResolved: 'Erledigt',
      statusClosed: 'Geschlossen',
      viewTickets: 'Tickets anzeigen',
      newTicket: 'Neues Ticket',
      contactUs: 'Falls du Fragen hast oder ein Problem feststellst, kannst du uns hier kontaktieren.',
      reportProblem: 'Problem melden',
      uploadTaxBill: 'Steuerrechnung hochladen',
      selectFile: 'PDF-Datei oder Bild auswählen',
      cancel: 'Abbrechen',
      upload: 'Hochladen',
      fileNotFound: 'Datei nicht gefunden',
      fileNotFoundDescription: 'Die Datei wurde im Speicher nicht gefunden.',
      downloadSuccess: 'Download erfolgreich',
      downloadSuccessDescription: '{fileName} wurde heruntergeladen.',
      downloadFailed: 'Download fehlgeschlagen',
      downloadFailedDescription: 'Fehler beim Herunterladen.',
      fileOpened: 'Datei geöffnet',
      fileOpenedDescription: '{fileName} wurde in einem neuen Tab geöffnet.',
      viewFailed: 'Anzeige fehlgeschlagen',
      viewFailedDescription: 'Fehler beim Öffnen der Datei.',
      billOpened: 'Steuerrechnung geöffnet',
      billOpenedDescription: '{fileName} wurde in einem neuen Tab geöffnet.',
      uploadSuccess: 'Erfolg',
      uploadSuccessDescription: 'Steuerrechnung wurde erfolgreich hochgeladen.',
      uploadFailed: 'Fehler',
      uploadFailedDescription: 'Upload fehlgeschlagen.',
      error: 'Fehler',
      selectFileFirst: 'Bitte wähle eine Datei aus.',
      dataLoadError: 'Daten konnten nicht geladen werden.',
    },

    // User Dashboard (Main Page /)
    userDashboard: {
      greeting: 'Grüezi,',
      fallbackUser: 'Benutzer',
      taxReturn: 'Steuererklärung',
      active: 'Aktiv',
      processing: 'In Bearbeitung',
      completed: 'Abgeschlossen',
      expressService: 'Express',
      standardService: 'Standard',
      upgradeAvailable: 'Upgrade möglich',
      continue: 'Weiter',
      delete: 'Löschen',
      tracking: 'Tracking',
      details: 'Details',
      sign: 'Unterschreiben',
      activeDescription: 'Erfassung läuft. Belege werden automatisch kategorisiert.',
      processingDescription: 'Deine Steuererklärung wird aktuell erstellt.',
      signatureRequired: 'Bitte unterschreibe deine Steuererklärung.',
      signaturePending: 'Signatur ausstehend',
      finished: 'Fertig',
      actionRequired: 'Aktion nötig',
      decisionFrom: 'Bescheid vom {date} liegt vor.',
      deleteDialogTitle: 'Steuererklärung löschen?',
      deleteDialogDescription: 'Möchtest du die Steuererklärung für {year} wirklich löschen? Alle zugehörigen Daten und Dokumente werden unwiderruflich entfernt.',
      deleting: 'Wird gelöscht...',
      cancelDelete: 'Abbrechen',
      documents: 'Dokumente',
      uploadDocuments: 'hochladen',
      taxReturnNotFound: 'Steuererklärung nicht gefunden',
      taxReturnDeleted: 'Steuererklärung {year} wurde gelöscht',
      deleteError: 'Fehler beim Löschen der Steuererklärung',
      taxReturnExists: 'Steuererklärung für {year} existiert bereits',
      taxReturnAlreadyExists: 'Steuererklärung für {year} bereits vorhanden',
      taxReturnCreated: 'Neue Steuererklärung für {year} erstellt',
      createError: 'Fehler beim Erstellen der Steuererklärung',
    },

    // Form Dashboard (/form)
    formDashboard: {
      title: 'Steuererklärung {year}',
      personalInfo: 'Persönliche Angaben',
      tasksCompleted: '{completed} von {total} erledigt',
      contactInfo: 'Kontaktangaben',
      deductions: 'Abzüge',
      income: 'Einkommen',
      assets: 'Vermögen',
      documentsTitle: 'Belege & Unterlagen',
      uploadDocuments: 'Dokumente hochladen',
      completeStep1First: 'Zuerst Schritt 1 abschliessen',
      reviewAndSubmit: 'Prüfung & Versand',
      completeAndPay: 'Abschliessen & bezahlen',
      completeSteps12First: 'Zuerst Schritt 1 & 2 abschliessen',
    },

    // Missing Items Alert
    missingItems: {
      actionRequired: 'Aktion erforderlich',
      documentsNeeded: '{count} Unterlagen werden benötigt',
      documentsNeededSingular: '{count} Unterlage wird benötigt',
      infoNeeded: '{count} Angaben werden benötigt',
      infoNeededSingular: '{count} Angabe wird benötigt',
      bothNeeded: '{docs} Unterlagen und {info} Angaben werden benötigt',
    },

    // Menu
    menu: {
      navigation: 'Navigation',
      taxes: 'Steuern',
      documents: 'Dokumente',
      chat: 'Chat',
      inviteFriends: 'Freunde einladen',
      managePeople: 'Personen verwalten',
      help: 'Hilfe',
      knowledgeBase: 'Wissensdatenbank',
      startGuide: 'Anleitung starten',
      startDocumentsGuide: 'Dokumenten Anleitung starten',
      feedbackAndRoadmap: 'Feedback & Roadmap',
      feedback: 'Feedback',
      roadmap: 'Roadmap',
      legal: 'Rechtliches',
      privacy: 'Datenschutz',
      terms: 'Nutzungsbedingungen',
      cookiePolicy: 'Cookie-Richtlinie',
      cookieSettings: 'Cookie-Einstellungen',
      privacySettings: 'Datenschutz-Einstellungen',
      profile: 'Profil',
      logout: 'Abmelden',
    },

    // Cookie Consent
    cookieConsent: {
      title: 'Cookie-Einstellungen',
      description: 'Wir verwenden Cookies, um deine Erfahrung zu verbessern und unsere Dienste zu optimieren. Du kannst deine Präferenzen jederzeit anpassen.',
      acceptAll: 'Alle akzeptieren',
      essentialOnly: 'Nur essenzielle',
      settings: 'Einstellungen',
      saveSettings: 'Einstellungen speichern',
      cancel: 'Abbrechen',
      readPrivacyPolicy: 'Datenschutzerklärung lesen',
      essential: {
        title: 'Essenzielle Cookies',
        description: 'Diese Cookies sind für das Funktionieren der Website unerlässlich.',
      },
      functional: {
        title: 'Funktionale Cookies',
        description: 'Helfen dabei, erweiterte Funktionalitäten bereitzustellen.',
      },
      analytics: {
        title: 'Analyse-Cookies',
        description: 'Helfen uns zu verstehen, wie Besucher die Website nutzen.',
      },
      marketing: {
        title: 'Marketing-Cookies',
        description: 'Werden verwendet, um relevante Werbung anzuzeigen.',
      },
    },
  },
  
  en: {
    navigation: {
      dashboard: 'Dashboard',
      taxReturn: 'Tax Return',
      chatSupport: 'Chat Support',
      help: 'Help',
      feedback: 'Feedback',
      adminPanel: 'Admin Panel',
      profile: 'Profile',
      logout: 'Logout',
    },
    
    legal: {
      privacy: 'Privacy',
      terms: 'Terms of Service',
      cookies: 'Cookie Policy',
      privacySettings: 'Privacy Settings',
      acceptableUse: 'Acceptable Use',
    },
    
    auth: {
      title: "Welcome back",
      subtitle: "Sign in with your email address",
      emailPlaceholder: "your.email@example.com",
      loginButton: "Sign In",
      googleSignIn: "Sign in with Google",
      or: "or",
      sending: "Sending...",
      
      verifyTitle: "Enter code",
      verifySubtitle: "We sent you a 6-digit code",
      resendCode: "Resend code",
      resending: "Resending...",
      backButton: "Back",
      continueButton: "Continue",
      verifying: "Verifying...",
      
      welcomeBack: "Welcome back",
      welcome: "Redirecting...",
      
      codeSent: "Code sent",
      codeResent: "Code resent",
      invalidCode: "Invalid code",
      loginSuccess: "Successfully signed in",
      
      sessionError: "Session error",
      sessionErrorDescription: "Your session has expired. Please sign in again.",
      notLoggedIn: "Not Logged In",
      notLoggedInDescription: "You need to log in to continue.",
      authFailed: "Authentication failed",
      authFailedDescription: "Please try again.",
      autoLogout: "Automatically logged out",
      autoLogoutDescription: "You were logged out due to inactivity.",
      sessionExtended: "Session extended",
      sessionExtendedDescription: "Your session has been successfully extended.",
      successfulLogout: "Successfully logged out",
      successfulLogoutMessage: "You have been successfully logged out.",
      logoutError: "Logout error",
      logoutErrorMessage: "An error occurred during logout.",
      
      termsText: "By signing in, you agree to our Terms of Service and Privacy Policy."
    },
    
    contact: {
      title: 'Contact Information',
      personalInfo: 'Personal Information',
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email',
      phone: 'Phone',
      address: 'Address',
      postalCode: 'Postal Code',
      city: 'City',
      addressNumber: 'Address Number',
      canton: 'Canton',
      birthDate: 'Date of Birth',
      religion: 'Religion',
      maritalStatus: 'Marital Status',
      firefighterService: 'I serve in the fire department',
      firefighterServiceExplanation: 'Active firefighters may claim a tax deduction depending on the canton.',
      spouseInfo: 'Spouse Information',
      spouseFirstName: 'First Name',
      spouseLastName: 'Last Name',
      spouseReligion: 'Religion',
      children: 'Children',
      hasChildren: 'I have children',
      hasChildrenExplanation: 'Provide information about your children for whom you want to claim child deductions.',
      childFirstName: 'First Name',
      childLastName: 'Last Name',
      childBirthDate: 'Date of Birth',
      childSchoolLevel: 'School Level',
      childReligion: 'Religion',
      childDeduction: 'Deduction',
      addChild: 'Add Child',
      removeChild: 'Remove',
      religionCatholic: 'Roman Catholic',
      religionReformed: 'Reformed',
      religionChristCatholic: 'Christ Catholic',
      religionOther: 'Other/None',
      maritalSingle: 'Single',
      maritalMarried: 'Married',
      maritalWidowed: 'Widowed',
      cantonZH: 'Zurich',
      cantonAG: 'Aargau',
      cantonZG: 'Zug',
      cantonSZ: 'Schwyz',
      deductionFatherHigher: 'Father earns higher income.',
      deductionMotherHigher: 'Mother earns higher income.',
      deductionChildSelf: 'Child is mainly self-sufficient.',
      deductionChildDifferent: 'Child does not live in the same household.',
      firstNamePlaceholder: 'First Name',
      lastNamePlaceholder: 'Last Name',
      addressPlaceholder: 'Street and House Number',
      postalCodePlaceholder: 'Postal Code',
      cityPlaceholder: 'City',
      addressNumberPlaceholder: 'Address Number',
      spouseFirstNamePlaceholder: 'Spouse\'s First Name',
      spouseLastNamePlaceholder: 'Spouse\'s Last Name',
      childFirstNamePlaceholder: 'Child\'s First Name',
      childLastNamePlaceholder: 'Child\'s Last Name',
      childSchoolLevelPlaceholder: 'e.g. Kindergarten, Primary School',
    },

    contactForm: {
      // Section titles
      personalDataSection: 'Personal Information',
      spouseSection: 'Spouse Information',
      childrenSection: 'Children',
      
      // Form labels
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email',
      phone: 'Phone',
      address: 'Address',
      postalCode: 'Postal Code',
      city: 'City',
      addressNumber: 'Address Number',
      canton: 'Canton',
      birthDate: 'Date of Birth',
      religion: 'Religion',
      maritalStatus: 'Marital Status',
      firefighterService: 'I serve in the fire department',
      firefighterServiceInfo: 'Active firefighters may claim a tax deduction depending on the canton.',
      
      // Spouse fields
      spouseFirstName: 'Spouse\'s First Name',
      spouseLastName: 'Spouse\'s Last Name',
      spouseReligion: 'Spouse\'s Religion',
      hasSpouse: 'Married',
      
      // Children fields
      hasChildren: 'I have children',
      hasChildrenInfo: 'Provide information about your children for whom you want to claim child deductions.',
      childFirstName: 'Child\'s First Name',
      childLastName: 'Child\'s Last Name',
      childBirthDate: 'Child\'s Date of Birth',
      childSchoolLevel: 'School Level',
      childReligion: 'Child\'s Religion',
      childDeduction: 'Deduction',
      addChild: 'Add Child',
      removeChild: 'Remove Child',
      
      // Options
      religionOptions: {
        catholic: 'Roman Catholic',
        reformed: 'Reformed',
        christCatholic: 'Christ Catholic',
        other: 'Other',
        none: 'None',
      },
      
      maritalOptions: {
        single: 'Single',
        married: 'Married',
        divorced: 'Divorced',
        widowed: 'Widowed',
        separated: 'Separated',
        registeredPartnership: 'Registered Partnership',
      },
      
      cantonOptions: {
        zh: 'Zurich',
        ag: 'Aargau',
        zg: 'Zug',
        sz: 'Schwyz',
        be: 'Bern',
        lu: 'Lucerne',
        ur: 'Uri',
        ow: 'Obwalden',
        nw: 'Nidwalden',
        gl: 'Glarus',
        fr: 'Fribourg',
        so: 'Solothurn',
        bs: 'Basel-Stadt',
        bl: 'Basel-Landschaft',
        sh: 'Schaffhausen',
        ar: 'Appenzell Ausserrhoden',
        ai: 'Appenzell Innerrhoden',
        sg: 'St. Gallen',
        gr: 'Graubünden',
        tg: 'Thurgau',
        ti: 'Ticino',
        vd: 'Vaud',
        vs: 'Valais',
        ne: 'Neuchâtel',
        ge: 'Geneva',
        ju: 'Jura',
      },
      
      childDeductionOptions: {
        fatherHigher: 'Father earns higher income',
        motherHigher: 'Mother earns higher income',
        childSelf: 'Child is mainly self-sufficient',
        differentHousehold: 'Child does not live in the same household',
      },
      
      // Buttons and actions
      save: 'Save',
      saveAndContinue: 'Save and Continue',
      cancel: 'Cancel',
      back: 'Back',
      next: 'Next',
      
      // Messages
      saveSuccess: 'Successfully saved',
      saveSuccessMessage: 'Your contact information has been successfully saved.',
      saveError: 'Save Error',
      saveErrorMessage: 'An error occurred while saving. Please try again.',
      validationError: 'Validation Error',
      requiredField: 'This field is required',
      
      // Placeholders
      firstNamePlaceholder: 'First name',
      lastNamePlaceholder: 'Last name',
      emailPlaceholder: 'your.email@example.com',
      phonePlaceholder: '+41 XX XXX XX XX',
      addressPlaceholder: 'Sample Street 1',
      postalCodePlaceholder: '8000',
      cityPlaceholder: 'Zurich',
      addressNumberPlaceholder: '1',
      spouseFirstNamePlaceholder: 'Spouse\'s first name',
      spouseLastNamePlaceholder: 'Spouse\'s last name',
      childFirstNamePlaceholder: 'Child\'s first name',
      childLastNamePlaceholder: 'Child\'s last name',
      childSchoolLevelPlaceholder: 'e.g. Kindergarten, Primary School',
    },

    deductions: {
      title: 'Deductions',
      hasPillar3a: 'I have paid into pillar 3a',
      hasPillar3aExplanation: 'Contributions to pillar 3a can be deducted from taxable income up to a certain maximum amount. This applies to both employed and self-employed individuals.',
      hasBVGPurchase: 'I have made pension fund (BVG) purchases',
      hasBVGPurchaseExplanation: 'Pension fund purchases are tax-deductible under certain conditions. This applies to both voluntary purchases to improve retirement benefits and the purchase of contribution years.',
      hasEducationExpenses: 'I have paid education and training costs',
      hasEducationExpensesExplanation: 'Costs for your own education and training can be deducted from taxable income under certain conditions. This includes course fees, teaching materials, and travel costs.',
      hasDonations: 'I have made donations',
      hasDonationsExplanation: 'Donations to charitable organizations can be deducted from taxable income up to a certain amount. The organization must be recognized as tax-exempt in the respective canton.',
      hasPropertyMaintenance: 'I have paid value-preserving maintenance costs for my property',
      hasPropertyMaintenanceExplanation: 'As a property owner, you can claim maintenance costs for tax purposes. This includes repairs, renovations, and other value-preserving measures.',
      hasSupportedPersons: 'I support persons in need',
      hasSupportedPersonsExplanation: 'If you support persons who live in your household or are financially dependent on you, you may be able to claim a support deduction under certain circumstances.',
      hasMaintenancePayments: 'I make maintenance payments',
      hasMaintenancePaymentsExplanation: 'Maintenance payments to divorced spouses or children can be deducted from taxable income under certain conditions.',
      hasChildcare: 'I have childcare costs',
      hasChildcareExplanation: 'Costs for childcare can be deducted from taxable income up to a certain maximum amount. This applies to both daycare and childminder care.',
      hasOtherDeductions: 'I have other deductions',
      hasOtherDeductionsExplanation: 'Here you can claim other costs that are not covered in the other categories. This includes, for example, medical costs or disability-related costs.',
      otherDeductions: 'Other Deductions',
      otherDeductionsPlaceholder: 'Describe your other deductions',
      supportedPersons: 'Supported Persons',
      addPerson: 'Add Person',
      addPersonButton: 'Add Person',
      addPersonPrompt: 'Add supported persons to record the details.',
      personDetails: 'Person Details',
      supportAmount: 'Support Amount',
      maintenancePayments: 'Maintenance Payments',
      addPayment: 'Add Payment',
      addPaymentButton: 'Add Payment',
      addPaymentPrompt: 'Add maintenance payments to record the details.',
      paymentDetails: 'Payment Details',
      recipient: 'Recipient',
      amount: 'Amount',
      paymentType: 'Type',
      paymentTypePaid: 'Paid',
      paymentTypeReceived: 'Received',
      selectPaymentType: 'Select the type',
    },

    assets: {
      title: 'Assets',
      hasVehicle: 'I own a vehicle',
      hasVehicleExplanation: 'Include all vehicles you own - cars, motorcycles, boats, etc.',
      hasProperty: 'I own real estate or land',
      hasPropertyExplanation: 'Real estate includes houses, apartments, land, or other properties that you own.',
      hasMortgage: 'I have a mortgage',
      hasMortgageExplanation: 'A mortgage is a loan secured by real estate. Indicate whether you have taken out such a loan.',
      hasDebt: 'I have debts',
      hasDebtExplanation: 'Debts include all outstanding loans, credits, and other financial obligations that you must repay.',
      hasDepositAccount: 'I have a securities account',
      hasDepositAccountExplanation: 'A securities account contains securities such as stocks, bonds, ETFs, or other investments that you hold with a bank or broker.',
      hasCrypto: 'I own cryptocurrencies',
      hasCryptoExplanation: 'Cryptocurrencies such as Bitcoin, Ethereum, or other digital currencies that you owned as of the reference date.',
      hasOtherAssets: 'I own other assets',
      hasOtherAssetsExplanation: 'Other assets may include collections, precious metals, art, or other valuables not covered in the previous categories.',
      otherAssetsDescription: 'Description of other assets',
      vehicleDetails: 'Vehicle Details',
      vehicleName: 'Description',
      purchasePrice: 'Purchase Price',
      purchaseYear: 'Purchase Year',
      addVehicle: 'Add Vehicle',
      propertyDetails: 'Property Details',
      propertyType: 'Type',
      propertyLocation: 'Canton or Country',
      taxValue: 'Tax Value',
      rentalValue: 'Rental Value',
      propertyOutsideCanton: 'Is the property located in another canton or abroad?',
      propertyOlderThanFive: 'Is the property more than 5 years old?',
      addProperty: 'Add Property',
      debtDetails: 'Debt Details',
      debtDescription: 'Description of debt',
      debtAmount: 'Value of debt',
      addDebt: 'Add Debt',
      propertyHouse: 'Single-family house',
      propertyApartment: 'Condominium',
      propertyMultiFamily: 'Multi-family house',
      propertyLand: 'Building land',
      propertyMeadow: 'Meadow',
      propertyInheritance: 'Property from undivided inheritance',
      propertyOther: 'Other',
      selectPropertyType: 'Select a type',
    },
    
    profile: {
      title: 'Profile',
      loading: 'Loading profile...',
      signOutSuccess: 'Successfully signed out',
      signOutError: 'Error signing out',
      profilePicture: 'Profile Picture',
      profilePictureDescription: 'Upload or change your profile picture.',
      profileInfo: 'Profile Information',
      profileInfoDescription: 'Your personal data and account information.',
      nameNotAvailable: 'Name not available',
      emailNotAvailable: 'Email not available',
      edit: 'Edit',
      inviteFriends: 'Invite Friends',
      inviteFriendsDescription: 'Invite friends and get CHF 20.- discount.',
      inviteFriendsReward: 'CHF 20.- for you & your friends',
      shareYourCode: 'Share your personal code',
      signOut: 'Sign Out',
      personalInfo: 'Personal Information',
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email',
      phone: 'Phone',
      address: 'Address',
      dateOfBirth: 'Date of Birth',
      avatar: 'Profile Picture',
      saveChanges: 'Save Changes',
      profileUpdated: 'Profile Updated',
      profileUpdatedDescription: 'Your profile information has been successfully saved.',
      uploadError: 'Upload Error',
      uploadErrorDescription: 'An error occurred while uploading the image.',
      privacySettings: 'Privacy Settings',
      dataProcessing: 'Data Processing',
      marketing: 'Marketing',
      analytics: 'Analytics',
      cookiePreferences: 'Cookie Preferences',
      functional: 'Functional',
      performance: 'Performance',
      targeting: 'Targeting',
      savePreferences: 'Save Preferences',
      preferencesUpdated: 'Preferences Updated',
      preferencesUpdatedDescription: 'Your privacy settings have been saved.',
      managePeople: 'People',
      managePeopleDescription: 'Manage people for whom you create tax returns.',
      managePeopleCard: 'Manage people',
      managePeopleCardDescription: 'Tax returns for family members',
    },
    
    forms: {
      save: 'Save',
      cancel: 'Cancel',
      reset: 'Reset',
      clear: 'Clear',
      next: 'Next',
      previous: 'Previous',
      submit: 'Submit',
      saving: 'Saving...',
      saved: 'Saved',
      savedAt: 'Saved at',
      required: 'Required',
      optional: 'Optional',
      fieldReset: 'Reset field',
      sectionReset: 'Reset section',
      resetSection: 'Reset Section',
      resetConfirm: 'Are you sure you want to reset all entries in the section?',
      resetConfirmDescription: 'This action cannot be undone.',
      resetButton: 'Reset',
      importFromPreviousYear: 'Import from {year}',
      importSuccessful: 'Import Successful',
      importSuccessfulDescription: 'Data from {section} for {year} has been successfully imported.',
      importFailed: 'Import Failed',
      importFailedDescription: 'An error occurred during import.',
      importing: 'Importing...',
      importConfirm: 'Import data from {year}?',
      importConfirmDescription: 'Do you want to import your {section} data from {year}? This will overwrite current entries.',
      import: 'Import',
      back: 'Back',
      continue: 'Continue',
      savedSuccessfully: 'Saved',
      savedSuccessfullyDescription: 'Your data has been successfully saved.',
      saveError: 'Save Error',
      saveErrorDescription: 'An error occurred while saving. Please try again.',
    },
    
    taxReturn: {
      title: 'Tax Return',
      taxReturns: 'Tax Returns',
      newTaxReturn: 'New Tax Return',
      personalData: 'Personal Data',
      income: 'Income',
      deductions: 'Deductions',
      assets: 'Assets',
      documents: 'Documents',
      summary: 'Summary',
      completedReturns: 'Completed Tax Returns',
      status: 'Status',
      year: 'Year',
      created: 'Created',
      updated: 'Updated',
      download: 'Download',
      view: 'View',
      noReturns: 'No Tax Returns',
      noReturnsDescription: 'You have no completed tax returns yet.',
      paymentStatus: 'Payment Status',
      paid: 'Paid',
      pending: 'Pending',
      draft: 'Draft',
      submitted: 'Submitted',
      completed: 'Completed',
      processing: 'Processing',
      addTaxYear: 'Add Tax Year',
      selectYear: 'Select a year',
      createSuccess: 'Tax Return Created',
      createSuccessDescription: 'The tax return has been successfully created.',
      createError: 'Creation Error',
      createErrorDescription: 'There was a problem creating the tax return.',
      deleteSuccess: 'Successfully Deleted',
      deleteSuccessDescription: 'The tax return has been removed.',
      deleteError: 'Deletion Error',
      deleteErrorDescription: 'The tax return could not be deleted.',
      noCompletedReturns: 'No completed tax returns found',
      noCompletedReturnsDescription: 'Your completed tax returns will appear here once they have been uploaded by our team.',
      loadingError: 'Loading Error',
      loadingErrorDescription: 'Please try again later.',
      // Progress tracker translations
      dataCollection: 'Data Collection',
      dataCollectionDescription: 'Your data is being collected',
      documentUpload: 'Document Upload',
      documentUploadDescription: 'Documents are being processed',
      submission: 'Submission',
      submissionDescription: 'Being submitted',
      inCreation: 'Tax Return Creation',
      inCreationDescription: 'Being created',
      completedMessage: 'Tax Return has been sent',
      completedDescription: 'Completed',
      currentProcessing: 'Your tax return is currently being processed by our team.',
      actionDialogTitle: 'Tax Return',
      actionDialogDescription: 'Choose an action for your tax return:',
      downloadAction: 'Download',
      viewAction: 'View',
      downloadSuccess: 'Download successful',
      downloadSuccessDescription: 'has been downloaded.',
      downloadFailed: 'Download failed',
      downloadFailedDescription: 'The file could not be downloaded:',
      viewSuccess: 'File opened',
      viewSuccessDescription: 'is being opened in a new tab.',
      viewFailed: 'View failed',
      viewFailedDescription: 'The file could not be opened:',
      fileNotFound: 'File not found',
      fileNotFoundDescription: 'The file does not exist in storage. Please contact the administrator.',
      // Dashboard specific translations
      dashboard: {
        tasksCompleted: 'of {total} tasks completed',
        completeFirst: 'Please complete first: {dependencies}',
        sections: {
          contact: 'Contact Information',
          income: 'Income',
          deductions: 'Deductions',
          assets: 'Assets',
          summary: 'Summary',
          documents: 'Documents',
          submit: 'Submit'
        }
      }
    },
    
    chat: {
      title: 'Chat',
      support: 'Support',
      typeMessage: 'Type a message...',
      send: 'Send',
      attachFile: 'Attach File',
      online: 'Online',
      offline: 'Offline',
      connecting: 'Connecting...',
      messageRead: 'Read',
      messageDelivered: 'Delivered',
      noMessages: 'No Messages',
      noMessagesDescription: 'Start a conversation with our support team.',
    },
    
    admin: {
      panel: 'Admin Panel',
      users: 'Users',
      documents: 'Documents',
      reports: 'Reports',
      settings: 'Settings',
      userDetail: 'User Details',
      userDocuments: 'User Documents',
      userNotes: 'User Notes',
      addNote: 'Add Note',
      saveNote: 'Save Note',
      noteAdded: 'Note Added',
      noteAddedDescription: 'The note has been successfully saved.',
      accessLog: 'Access Log',
      downloadDocuments: 'Download Documents',
      downloadFormData: 'Download Form Data',
      viewDocument: 'View Document',
      documentPreview: 'Document Preview',
      closePreview: 'Close Preview',
      accessDenied: 'Access Denied',
      accessDeniedDescription: 'You do not have permission to access this page.',
    },
    
    help: {
      title: 'Help',
      faq: 'Frequently Asked Questions',
      contact: 'Contact',
      guides: 'Guides',
      tutorials: 'Tutorials',
      searchHelp: 'Search Help',
      categories: 'Categories',
      gettingStarted: 'Getting Started',
      taxQuestions: 'Tax Questions',
      technical: 'Technical',
      account: 'Account',
    },
    
    feedback: {
      title: 'Feedback',
      yourFeedback: 'Your Feedback',
      rating: 'Rating',
      comments: 'Comments',
      category: 'Category',
      general: 'General',
      bug: 'Bug',
      feature: 'Feature Request',
      improvement: 'Improvement',
      submitFeedback: 'Submit Feedback',
      thankYou: 'Thank You',
      feedbackSubmitted: 'Feedback Submitted',
      feedbackSubmittedDescription: 'Thank you for your feedback!',
      anonymous: 'Anonymous',
    },

    // Feedback Page
    feedbackPage: {
      title: 'Feedback',
      satisfactionQuestion: 'How satisfied are you with Ditax?',
      featureRequestLabel: 'What features would you like to see?',
      featureRequestOptional: '(optional)',
      featureRequestPlaceholder: 'e.g. Automatic receipt capture, iOS widget, export function...',
      submitButton: 'Submit Feedback',
      submitting: 'Submitting...',
      ratingRequired: 'Rating required',
      ratingRequiredDescription: 'Please select a rating.',
      notLoggedIn: 'Not logged in',
      notLoggedInDescription: 'Please log in to submit feedback.',
      error: 'Error',
      errorDescription: 'An error occurred while submitting. Please try again.',
      thankYouTitle: 'Thank you for your feedback!',
      thankYouMessage: 'Your opinion helps us continuously improve Ditax.',
      backToHome: 'Back to Home',
      successToast: 'Thank you! 🎉',
      successToastDescription: 'Your feedback has been successfully submitted.',
      ratings: {
        veryUnsatisfied: 'Very unsatisfied',
        unsatisfied: 'Unsatisfied',
        neutral: 'Neutral',
        satisfied: 'Satisfied',
        verySatisfied: 'Very satisfied',
      },
    },

    // Privacy Settings Page
    privacySettingsPage: {
      title: 'Privacy Settings',
      pleaseLogin: 'Please log in.',
      privacyPreferences: 'Privacy Preferences',
      marketingEmails: 'Marketing Emails',
      marketingEmailsDescription: 'Receive updates, newsletters and exclusive offers.',
      saveSettings: 'Save Settings',
      settingsSaved: 'Settings Saved',
      settingsSavedDescription: 'Your privacy settings have been updated.',
      saveError: 'Error',
      saveErrorDescription: 'Settings could not be saved.',
      dataPortability: 'Data Portability',
      dataPortabilityDescription: 'Download a copy of all your stored data including settings and history in JSON format.',
      downloadMyData: 'Download My Data',
      dataDownloaded: 'Data Downloaded',
      dataDownloadedDescription: 'Your data has been downloaded as a JSON file.',
      downloadError: 'Error',
      downloadErrorDescription: 'Data could not be downloaded.',
      deleteAccount: 'Delete Account',
      deleteAccountDescription: 'This action will permanently delete all your data. Once you proceed, this process cannot be undone.',
      deleteAccountButton: 'Delete Account',
      whyLeaving: 'Why are you leaving?',
      feedbackHelps: 'Your feedback helps us improve our service.',
      reasonRequired: 'Reason required',
      reasonRequiredDescription: 'Please select a reason for account deletion.',
      additionalFeedback: 'Additional feedback (optional)',
      additionalFeedbackPlaceholder: 'What can we do better?',
      cancel: 'Cancel',
      next: 'Next',
      finalConfirmation: 'Final Confirmation',
      warningLabel: 'Warning:',
      deleteWarningList: {
        profile: 'Your user profile',
        taxReturns: 'All tax returns',
        documents: 'All uploaded documents',
        chatMessages: 'All chat messages',
      },
      typeToConfirm: 'Type {word} to confirm',
      deleteConfirmWord: 'DELETE',
      confirmRequired: 'Confirmation required',
      confirmRequiredDescription: "Please type 'DELETE' to proceed.",
      deleting: 'Deleting...',
      dataDeleted: 'Data Deleted',
      dataDeletedDescription: 'Your data has been deleted. You will now be logged out.',
      accountDeleted: 'Account Completely Deleted',
      accountDeletedDescription: 'Your account and all data have been successfully deleted.',
      noActiveSession: 'No active session found',
      deletionReasons: {
        notUsing: "I'm not using the service anymore",
        tooExpensive: 'Too expensive',
        privacyConcerns: 'Privacy concerns',
        badExperience: 'Bad user experience',
        foundAlternative: 'Found another tax solution',
        other: 'Other',
      },
    },

    // Terms Page
    termsPage: {
      title: 'Terms of Service',
    },

    // Privacy Policy Page
    privacyPolicyPage: {
      title: 'Privacy Policy',
    },
    
    payment: {
      title: 'Payment',
      success: 'Successful',
      failed: 'Failed',
      pending: 'Pending',
      amount: 'Amount',
      date: 'Date',
      reference: 'Reference',
      receipt: 'Receipt',
      download: 'Download',
      backToDashboard: 'Back to Dashboard',
    },

    tickets: {
      status: {
        open: 'Open',
        inProgress: 'In Progress',
        resolved: 'Resolved',
        closed: 'Closed',
      },
      priority: {
        low: 'Low',
        medium: 'Medium',
        high: 'High',
        urgent: 'Urgent',
      },
      create: 'Create Ticket',
      title: 'Title',
      description: 'Description',
      assignedTo: 'Assigned To',
      createdBy: 'Created By',
      lastUpdated: 'Last Updated',
      resolvedAt: 'Resolved At',
    },

    taxFilers: {
      title: 'Tax Filer',
      pageTitle: 'Manage Persons',
      pageDescription: 'Manage the persons for whom you want to create tax returns. For example, for your children or parents.',
      selectPerson: 'Select person',
      primary: 'Primary',
      manage: 'Manage',
      addPerson: 'Add person',
      editPerson: 'Edit person',
      deletePerson: 'Delete person',
      addPersonHint: 'You can add more persons to manage their tax returns.',
      noPersons: 'No persons found.',
      firstName: 'First name',
      lastName: 'Last name',
      dateOfBirth: 'Date of birth',
      relationship: 'Relationship',
      relationships: {
        self: 'Myself',
        child: 'Child',
        spouse: 'Spouse',
        parent: 'Parent',
        other: 'Other',
      },
      addDescription: 'Add a new person for whom you want to create tax returns.',
      editDescription: 'Edit the person\'s details.',
      deleteTitle: 'Delete person?',
      deleteDescription: 'Do you really want to delete this person? All associated tax returns and documents will also be deleted. This action cannot be undone.',
      deleteConfirm: 'Delete',
      infoTitle: 'Note',
      infoDescription: 'Each person has separate form data and documents. The primary person (yourself) cannot be deleted.',
    },
    
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      warning: 'Warning',
      info: 'Info',
      yes: 'Yes',
      no: 'No',
      ok: 'OK',
      cancel: 'Cancel',
      close: 'Close',
      open: 'Open',
      edit: 'Edit',
      delete: 'Delete',
      view: 'View',
      download: 'Download',
      upload: 'Upload',
      search: 'Search',
      filter: 'Filter',
      sort: 'Sort',
      refresh: 'Refresh',
      back: 'Back',
      continue: 'Continue',
      finish: 'Finish',
      languages: 'Languages',
      german: 'Deutsch',
      english: 'English',
      remove: 'Remove',
    },
    
    idle: {
      title: 'Session Expiring',
      message: 'Your session is expiring due to inactivity.',
      timeLeft: 'Time Left',
      extendSession: 'Extend Session',
      minutes: 'minutes',
      seconds: 'seconds',
    },
    
    cookies: {
      title: 'Cookie Settings',
      message: 'We use cookies to enhance your experience.',
      accept: 'Accept All',
      decline: 'Decline',
      settings: 'Settings',
      necessary: 'Necessary',
      functional: 'Functional',
      analytics: 'Analytics',
      marketing: 'Marketing',
      cookiePolicy: 'Cookie Policy',
    },
    
    errors: {
      pageNotFound: 'Page Not Found',
      pageNotFoundDescription: 'The requested page could not be found.',
      goHome: 'Go Home',
      serverError: 'Server Error',
      networkError: 'Network Error',
      validationError: 'Validation Error',
      permissionDenied: 'Access Denied',
      sessionExpired: 'Session Expired',
      tryAgain: 'Try Again',
    },

    // Upload functionality
    upload: {
      avatar: {
        fileTooLarge: 'File too large',
        fileTooLargeDesc: 'Avatar files must be smaller than 10MB.',
        invalidFileType: 'Invalid file type',
        invalidFileTypeDesc: 'Please select an image file.',
        noFileSelected: 'No file selected',
        userNotLoggedIn: 'User not logged in',
        uploadSuccess: 'Avatar uploaded successfully',
        uploadSuccessDesc: 'Your avatar has been updated.',
        uploadFailed: 'Avatar upload failed',
        uploading: 'Uploading...',
        uploadButton: 'Upload avatar',
        profileImage: 'Profile image',
        newFileSelected: 'New file selected',
      },
      
      documents: {
        title: 'Upload documents',
        finished: 'Finished',
        cancel: 'Cancel',
        pleaseWait: 'Please wait...',
        addMoreFiles: 'Add more files',
        selectFiles: 'Select files',
        supportedFormats: 'Supported formats: JPG, PNG, PDF (max. 10 MB)',
        encryptionEnabled: 'Encryption enabled',
        standardUpload: 'Standard upload',
        encryptionDescription: 'Documents are encrypted client-side for maximum security',
        standardDescription: 'Documents are stored unencrypted (not recommended for sensitive data)',
        encrypting: 'Encrypting...',
        uploading: 'Uploading...',
        uploadFiles: 'upload',
        encrypted: 'encrypted',
        preview: 'Preview',
        uploadProgress: 'Upload progress',
        encryptionProgress: 'Encryption & Upload',
        fileTooLarge: 'is too large (max. 10 MB).',
        invalidFormat: 'has an invalid format (only JPG, PNG, PDF).',
        selectAtLeastOne: 'Please select at least one file.',
        noFilesToUpload: 'No files to upload.',
        uploadSuccess: 'Documents uploaded',
        uploadSuccessDesc: 'successfully uploaded.',
        loginRequired: 'You must be logged in to upload documents.',
        uploadError: 'Upload error',
        databaseError: 'Database error',
      },
    },

    // Document checklist
    documentChecklist: {
      title: 'Documents',
      generateChecklist: 'Generate checklist now',
      generating: 'Loading...',
      loading: 'Loading...',
      authRequired: 'Authentication required',
      authRequiredDesc: 'You must be logged in to manage your documents.',
      goToLogin: 'Go to login',
      checkSession: 'Check session',
      errorLoading: 'Error loading documents',
      updateStarted: 'Update started',
      updateDescription: 'The document list is being updated.',
      noDocuments: 'No documents',
      noDocumentsDesc: 'No documents were found for this item.',
      description: 'The document checklist is created based on your information.',
      loadingMessage: 'Please wait while your data is being loaded.',
      categories: {
        general: 'General documents',
        income: 'Income',
        assets: 'Assets',
        deductions: 'Deductions',
      },
      required: 'Required',
      or: 'or',
      view: 'View',
      delete: 'Delete',
      upload: 'Upload',
      assign: 'Assign',
      mandatoryDocuments: 'Mandatory documents',
      documents: 'Documents',
      uploaded: 'uploaded',
      stillRequired: 'required',
      allMandatoryPresent: 'All mandatory documents present',
      completedOf: 'of',
      file: 'File',
      files: 'Files',
      viewDocs: 'View',
      remove: 'Remove',
      generateNow: 'Generate checklist now',
      dialogTitle: 'All documents complete!',
      taxReturnYear: 'Tax return',
      dialogDescription: 'You have uploaded all required documents. Would you like to create your tax return now?',
      later: 'Later',
      createNow: 'Yes, create now',
    },

    // Common UI elements
    ui: {
      loading: 'Loading...',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      view: 'View',
      upload: 'Upload',
      download: 'Download',
      back: 'Back',
      next: 'Next',
      continue: 'Continue',
      finish: 'Finish',
      close: 'Close',
      open: 'Open',
      search: 'Search',
      refresh: 'Refresh',
    },

    // Status messages
    status: {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Information',
      complete: 'Complete',
      pending: 'Pending',
      processing: 'Processing',
    },

    // Yes/No Form
    yesNoForm: {
      yes: 'Yes',
      no: 'No',
      yesDescription: 'This applies to me.',
      noDescription: 'This does not apply to me.',
      moreInfo: 'More information',
      answerSaved: 'Answer saved',
      answerSavedDescription: 'Your answer has been updated.',
      answerError: 'Error saving answer',
      answerErrorDescription: 'Please try again.',
      questions: {
        income: {
          hasPension: {
            text: 'Do you receive pensions from social insurance or a pension fund?',
            explanation: 'This includes AHV pensions, IV pensions, pension fund pensions, occupational pension (BVG), accident pensions, military insurance pensions, and foreign social insurance pensions. Pensions from vested benefits foundations and early retirement benefits also count.'
          },
          hasGiftInheritance: {
            text: 'Have you received a gift or inheritance advance?',
            explanation: 'Gifts are gratuitous contributions from third parties such as cash gifts, real estate, or other valuables. Inheritance advances are assets received during the lifetime of the testator that are later deducted from the inheritance. Both must be declared in the tax return.'
          },
          hasPensionPayout: {
            text: 'Have you received a capital payout from Pillar 2 or Pillar 3?',
            explanation: 'Capital payouts from occupational pension (Pillar 2) or tied private pension (Pillar 3a) upon retirement, disability, emigration, or starting self-employment. These are taxed separately at a reduced rate.'
          },
          hasRental: {
            text: 'Do you have rental income?',
            explanation: 'Rental income from renting apartments, houses, commercial spaces, or other properties must be declared as income. This also includes subletting and short-term rentals via platforms like Airbnb.'
          },
          hasDividends: {
            text: 'Have you received dividends or capital gains?',
            explanation: 'Dividends from shares, cooperative shares, and other investments, as well as interest income from bonds and other securities, must be declared as income. This applies to both domestic and foreign income.'
          },
          hasOtherIncome: {
            text: 'Have you generated other income?',
            explanation: 'Other income includes part-time employment income, lease income, royalties, bonuses, fees from self-employed side activities, and all other income types not already covered.'
          },
          hasFreelance: {
            text: 'Are you self-employed?',
            explanation: 'Self-employed persons are those who run their own business, work freelance, or are commercially active as a sole proprietorship, GmbH, or AG. This also includes doctors with their own practice, lawyers, consultants, craftsmen with their own business, and online entrepreneurs and influencers.'
          },
          hasSalary: {
            text: 'Are you an employee?',
            explanation: 'Employees are all persons in an employment relationship with an employment contract. This includes full-time and part-time employees, apprentices, interns, temporary workers, and persons with multiple employers. The salary is documented by the salary certificate.'
          }
        },
        assets: {
          hasVehicle: {
            text: 'Do you own vehicles?',
            explanation: 'All motorized vehicles such as cars, motorcycles, motorhomes, boats, jet skis, and other watercraft must be declared as assets. The market value as of December 31 is relevant, not the original purchase price. Leased vehicles are not part of taxable assets.'
          },
          hasProperty: {
            text: 'Do you own real estate?',
            explanation: 'Real estate includes owner-occupied homes, vacation homes, rental properties, condominiums, building land, agricultural land, and shares in real estate funds or real estate companies. The tax value is usually set by the tax authorities and may differ from market value.'
          },
          hasMortgage: {
            text: 'Do you have mortgages or real estate loans?',
            explanation: 'Mortgages and other real estate loans are deductible debts. This includes first and second mortgages, pre-financing loans for home construction, renovation loans, and private loans for real estate purchases. The debt balance as of December 31 is relevant for the tax return.'
          },
          hasDebt: {
            text: 'Do you have debts?',
            explanation: 'Deductible debts include bank loans, private loans, credit card debts, leasing obligations, business loans, tax debts, and liabilities to third parties. Debts for living expenses or consumer debts without economic purpose are not deductible.'
          },
          hasDepositAccount: {
            text: 'Do you have a securities account?',
            explanation: 'Securities accounts contain securities such as stocks, bonds, investment funds, ETFs, structured products, and other exchange-traded investments. All securities in Switzerland and abroad must be declared at market value as of December 31. This also includes foreign accounts and online brokers like Interactive Brokers, Swissquote, or Trading 212.'
          },
          hasCrypto: {
            text: 'Do you own cryptocurrencies?',
            explanation: 'Cryptocurrencies like Bitcoin, Ethereum, Litecoin, and all other digital assets are taxable assets. The value as of December 31 according to official price lists from the Federal Tax Administration is relevant. DeFi tokens, NFTs, and staking rewards must also be declared.'
          },
          hasOtherAssets: {
            text: 'Do you have other assets?',
            explanation: 'Other assets include artworks, antiques, jewelry, precious metals, collections, life insurance with surrender value, claims against third parties, participations in unlisted companies, and all other valuables with a market value over 5,000 francs.'
          }
        },
        deductions: {
          hasPillar3a: {
            text: 'Do you pay into Pillar 3a?',
            explanation: 'Pillar 3a is the tax-advantaged, tied private pension. Contributions can be fully deducted from taxable income up to the legal maximum (currently CHF 7,056 for employees, CHF 35,280 for self-employed without pension fund). Contributions must be made by December 31.'
          },
          hasBVGPurchase: {
            text: 'Have you made pension fund purchases?',
            explanation: 'Voluntary purchases into occupational pension (BVG) to improve retirement and disability benefits are fully tax-deductible. The possible purchase amount is calculated by the pension fund and shown in the pension certificate. Restrictions apply if capital is withdrawn within three years.'
          },
          hasEducationExpenses: {
            text: 'Do you have education costs?',
            explanation: 'Deductible are job-related education and training costs, retraining, degree programs for career advancement, language courses with professional relevance, specialist literature, and seminar and course fees. Pure hobby activities or general education courses without professional relevance are not deductible.'
          },
          hasDonations: {
            text: 'Have you made donations?',
            explanation: 'Donations to charitable, benevolent, or ecclesiastical organizations based in Switzerland are deductible up to 20% of net income. The organization must be recognized as charitable by the tax authority. Donations to political parties or foreign organizations are generally not deductible.'
          },
          hasPropertyMaintenance: {
            text: 'Do you have property maintenance costs?',
            explanation: 'Deductible are costs for maintenance and renovation of owner-occupied and rented properties. This includes repairs, renewals, energy-efficient renovations, garden care, and snow removal. Value-enhancing investments can be deducted over several years.'
          },
          hasOtherDeductions: {
            text: 'Do you have other deductions?',
            explanation: 'Other deductible costs include securities management costs, tax consulting fees, disability insurance premiums, health and accident insurance premiums, and extraordinary burdens such as high medical costs or disaster damage.'
          },
          hasSupportedPersons: {
            text: 'Do you financially support other persons?',
            explanation: 'Support payments to needy relatives such as parents, grandparents, adult children, or other relatives are deductible if they do not have sufficient means of their own. Support must be regular and substantial. Proof of need is required.'
          },
          hasMaintenancePayments: {
            text: 'Do you pay alimony?',
            explanation: 'Legally or judicially determined maintenance payments to divorced or separated spouses and child support are fully deductible from income. Voluntary payments beyond legal requirements are only deductible in exceptional cases. Child support is taxed as income for the recipient.'
          },
          hasChildcare: {
            text: 'Do you have childcare costs?',
            explanation: 'Costs for childcare by third parties for children under 14 are deductible if both parents are employed or in education. This includes costs for daycare, kindergartens, after-school care, childminders, and babysitters. Care by relatives is only deductible with documented compensation.'
          }
        }
      }
    },

    // Onboarding/Welcome
    onboarding: {
      consentTitle: 'Privacy & Consent',
      nameTitle: 'What is your first name?',
      yearTitle: 'Hello {name}, which tax year would you like to create?',
      termsAccept: 'I accept the',
      privacyPolicy: 'Privacy Policy',
      termsOfService: 'Terms of Service',
      newsletterTitle: 'Newsletter & Marketing Emails',
      newsletterDescription: 'Receive updates on tax changes and helpful tips (optional)',
      next: 'Next',
      letsGo: "Let's go!",
      firstName: 'First name',
      acceptTermsError: 'Please accept the privacy policy and terms of service',
      enterNameError: 'Please enter your name',
      authError: 'Authentication failed',
      genericError: 'An error occurred',
      familyHintTitle: 'File for others?',
      familyHintDescription: 'You can also create tax returns for family members (children, spouse) under your account.',
      familyHintLater: 'Set up later',
      familyHintNow: 'Add now'
    },

    // Documents Page
    documentsPage: {
      title: 'Documents',
      taxYear: 'Tax year',
      uploadDocuments: 'Upload documents',
      noDocuments: 'No documents',
      noDocumentsDescription: 'Upload your first document',
      uploadFirst: 'Upload first document',
      sortByDateDesc: 'Date (Newest first)',
      sortByDateAsc: 'Date (Oldest first)',
      sortByNameAsc: 'Name (A-Z)',
      sortByNameDesc: 'Name (Z-A)',
      sortByType: 'File type',
      search: 'Search...',
      error: 'Error',
      loadError: 'Could not load documents',
      uploadSuccess: 'Upload successful',
      uploadSuccessDescription: '{count} file(s) uploaded',
      fileTooLarge: 'is too large (max. 10 MB)',
      invalidFormat: 'has an invalid format',
      uploadFailed: 'Could not upload files',
      filterSort: 'Sort',
      upload: 'Upload',
      collectReceipts: 'Collect receipts',
      collectReceiptsDescription: 'Add your invoices and receipts directly.',
      lockedBanner: 'This tax return has been submitted. Documents can no longer be changed.',
      pleaseLogin: 'Please log in',
    },

    // Invite Friends Page
    inviteFriends: {
      title: 'Invite Friends',
      subtitle: 'Share your code and get CHF 20.- discount for each successful invite',
      yourCode: 'Your personal referral code',
      yourCodeDescription: 'Share this code with friends and family',
      clickToCopy: 'Click to copy',
      successfulInvites: 'Successful invites',
      remaining: 'Remaining',
      shareViaWhatsApp: 'WhatsApp',
      shareViaEmail: 'Email',
      copyCode: 'Copy code',
      errorLoading: 'Error loading code',
      howItWorks: 'How it works',
      step1Title: 'Share code',
      step1Description: 'Share your personal code with friends',
      step2Title: 'Friend registers',
      step2Description: 'Your friend enters the code during registration',
      step3Title: 'Both get CHF 20.-',
      step3Description: 'You and your friend both receive a discount code immediately',
      yourDiscountCodes: 'Your discount codes',
      autoApplied: 'These codes are automatically applied at checkout',
      earnedByInvite: 'Earned by invitation',
      referralDiscount: 'Referral discount',
      recentInvites: 'Recent invites',
      successfulInvite: 'Successful invite',
    },

    // Add Tax Year
    addTaxYear: {
      newYear: 'New Year',
      newTaxReturn: 'New Tax Return',
      startNewTaxReturn: 'Start a new tax return',
      selectTaxYear: 'Select tax year',
      addTaxYear: 'Add tax year',
      chooseYear: 'Choose a tax year',
      taxYear: 'Tax year',
      createTaxReturn: 'Create tax return',
      allYearsCreated: 'All years created',
      yearsAlreadyExist: '2024-2030 already exist',
    },

    // MultiStep Contact Form
    multiStepContactForm: {
      title: 'Contact Information',
      personalData: 'Personal Data',
      personalDataDescription: 'Name, date of birth, religion, marital status',
      currentAddress: 'Current Address',
      currentAddressDescription: 'Street, postal code, city, canton',
      additionalInfo: 'Additional Information',
      additionalInfoDescription: 'Address as of Dec 31, firefighter service',
      family: 'Family',
      familyDescription: 'Spouse and children',
      street: 'Street',
      streetNumber: 'No.',
      selectCanton: 'Select canton',
      notAvailableYet: 'not available yet',
      addressAsOf: 'Address as of Dec 31',
      differentAddressAsOf: 'Different address as of Dec 31',
      firefighterLabel: 'Firefighter Service',
      iDoFirefighterService: 'I perform firefighter service',
      spouseTitle: 'Spouse',
      childrenLabel: 'Children',
      iHaveChildren: 'I have children',
      finish: 'Finish',
      continue: 'Continue',
      back: 'Back',
      fillRequired: 'Fill in required fields',
      fillRequiredDescription: 'Please fill in all required fields.',
    },

    // Tour
    tour: {
      welcomeGreeting: 'Hello',
      welcomeDescription: 'Let us show you around the app so you know how it works.',
      addYearTitle: 'New Tax Year',
      addYearDescription: 'Here you can start a new tax return.',
      chatTitle: 'Chat',
      chatDescription: 'Here you can chat with us and ask questions.',
      documentsTitle: 'Upload Documents',
      documentsDescription: 'Use this button to upload documents anytime.',
      continueCardTitle: 'Continue Tax Year',
      continueCardDescription: 'Open and continue editing your tax return.',
      skip: 'Skip',
      back: 'Back',
      next: 'Next',
      finish: 'Finish',
      closeTour: 'Close tour',
    },

    // Auth
    authFlow: {
      login: 'Sign In',
      loginSubtitle: 'Sign in with your email',
      emailLabel: 'Email:',
      emailPlaceholder: 'name@mail.com',
      sendCode: 'Send Login Code',
      sendingCode: 'Sending code...',
      codeDisabled: 'Email codes disabled',
      enterCode: 'Enter Code',
      codeSentTo: 'We sent you a code to {email}',
      verifyButton: 'Sign In',
      verifying: 'Verifying...',
      sixDigitCode: '6-digit code',
      changeEmail: 'Change email',
      passkeyLogin: 'Sign in with Fingerprint',
      passkeyAuthenticating: 'Authenticating...',
      orEnterCode: 'or enter code',
      otpDisabled: 'OTP Disabled',
      otpDisabledHint: 'Email codes are disabled for this account. Use your fingerprint.',
      noAccount: "Don't have an account?",
      registerNow: 'Register now',
      codeSent: 'Code sent',
      codeSentDescription: 'We sent you a login code via email.',
      loginSuccess: 'Login successful',
      loginSuccessDescription: 'You have been successfully signed in.',
      sendError: 'Error sending code',
      invalidCode: 'Invalid code',
      passkeyError: 'Fingerprint login error',
    },

    // Form Mode Toggle
    formModeToggle: {
      selectMode: 'Select fill mode',
      yesNo: 'Yes/No',
      expertMode: 'Expert Mode',
      yesNoDescription: 'Answer individual questions with Yes/No',
      expertDescription: 'Fill in all fields at once',
    },

    // Toast Messages
    toasts: {
      answerError: 'Error with answer',
      answerErrorDescription: 'Please try again.',
      changeSaved: 'Change saved',
      changeSavedDescription: 'Your answer has been updated.',
      saveError: 'Save error',
      saveErrorDescription: 'Data could not be saved.',
      navigationError: 'Navigation error',
      navigationErrorDescription: 'Please try again.',
    },

    // Tax Return Actions Page
    taxReturnActions: {
      title: 'Tax Return',
      loading: 'Loading...',
      notFound: 'No tax return found',
      backToOverview: 'Back to overview',
      actionRequired: 'Action required',
      signatureRequired: 'Signature required',
      signatureDescription: 'Please sign your tax return electronically so we can submit it to the tax office.',
      signNow: 'Sign now',
      electronicallySigned: 'Electronically signed',
      signedAt: 'On {date}',
      signedDescription: 'Your tax return has been signed and can be submitted.',
      completed: 'Completed',
      taxYear: 'Tax year',
      view: 'View',
      download: 'Download',
      available: 'Available',
      pending: 'Pending',
      definitiveTaxBill: 'Definitive tax bill',
      viewBill: 'View bill',
      downloadBill: 'Download bill',
      noBillYet: 'No tax bill yet. Upload it here once you receive it.',
      uploadBill: 'Upload tax bill',
      support: 'Support',
      ticket: 'Ticket',
      tickets: 'Tickets',
      needHelp: 'Need help?',
      statusOpen: 'Open',
      statusInProgress: 'In progress',
      statusResolved: 'Resolved',
      statusClosed: 'Closed',
      viewTickets: 'View tickets',
      newTicket: 'New ticket',
      contactUs: 'If you have questions or notice a problem, you can contact us here.',
      reportProblem: 'Report problem',
      uploadTaxBill: 'Upload tax bill',
      selectFile: 'Select PDF file or image',
      cancel: 'Cancel',
      upload: 'Upload',
      fileNotFound: 'File not found',
      fileNotFoundDescription: 'The file was not found in storage.',
      downloadSuccess: 'Download successful',
      downloadSuccessDescription: '{fileName} was downloaded.',
      downloadFailed: 'Download failed',
      downloadFailedDescription: 'Error downloading file.',
      fileOpened: 'File opened',
      fileOpenedDescription: '{fileName} was opened in a new tab.',
      viewFailed: 'View failed',
      viewFailedDescription: 'Error opening file.',
      billOpened: 'Tax bill opened',
      billOpenedDescription: '{fileName} was opened in a new tab.',
      uploadSuccess: 'Success',
      uploadSuccessDescription: 'Tax bill was uploaded successfully.',
      uploadFailed: 'Error',
      uploadFailedDescription: 'Upload failed.',
      error: 'Error',
      selectFileFirst: 'Please select a file.',
      dataLoadError: 'Data could not be loaded.',
    },

    // User Dashboard (Main Page /)
    userDashboard: {
      greeting: 'Hello,',
      fallbackUser: 'User',
      taxReturn: 'Tax Return',
      active: 'Active',
      processing: 'Processing',
      completed: 'Completed',
      expressService: 'Express',
      standardService: 'Standard',
      upgradeAvailable: 'Upgrade available',
      continue: 'Continue',
      delete: 'Delete',
      tracking: 'Tracking',
      details: 'Details',
      sign: 'Sign',
      activeDescription: 'Data entry in progress. Documents are automatically categorized.',
      processingDescription: 'Your tax return is currently being prepared.',
      signatureRequired: 'Please sign your tax return.',
      signaturePending: 'Signature pending',
      finished: 'Done',
      actionRequired: 'Action required',
      decisionFrom: 'Decision from {date} is available.',
      deleteDialogTitle: 'Delete tax return?',
      deleteDialogDescription: 'Do you really want to delete the tax return for {year}? All associated data and documents will be permanently removed.',
      deleting: 'Deleting...',
      cancelDelete: 'Cancel',
      documents: 'Documents',
      uploadDocuments: 'upload',
      taxReturnNotFound: 'Tax return not found',
      taxReturnDeleted: 'Tax return {year} has been deleted',
      deleteError: 'Error deleting tax return',
      taxReturnExists: 'Tax return for {year} already exists',
      taxReturnAlreadyExists: 'Tax return for {year} already exists',
      taxReturnCreated: 'New tax return for {year} created',
      createError: 'Error creating tax return',
    },

    // Form Dashboard (/form)
    formDashboard: {
      title: 'Tax Return {year}',
      personalInfo: 'Personal Information',
      tasksCompleted: '{completed} of {total} completed',
      contactInfo: 'Contact Info',
      deductions: 'Deductions',
      income: 'Income',
      assets: 'Assets',
      documentsTitle: 'Documents & Receipts',
      uploadDocuments: 'Upload documents',
      completeStep1First: 'Complete step 1 first',
      reviewAndSubmit: 'Review & Submit',
      completeAndPay: 'Complete & pay',
      completeSteps12First: 'Complete steps 1 & 2 first',
    },

    // Missing Items Alert
    missingItems: {
      actionRequired: 'Action required',
      documentsNeeded: '{count} documents needed',
      documentsNeededSingular: '{count} document needed',
      infoNeeded: '{count} items of information needed',
      infoNeededSingular: '{count} item of information needed',
      bothNeeded: '{docs} documents and {info} items of information needed',
    },

    // Menu
    menu: {
      navigation: 'Navigation',
      taxes: 'Taxes',
      documents: 'Documents',
      chat: 'Chat',
      inviteFriends: 'Invite Friends',
      managePeople: 'Manage people',
      help: 'Help',
      knowledgeBase: 'Knowledge Base',
      startGuide: 'Start Guide',
      startDocumentsGuide: 'Start Documents Guide',
      feedbackAndRoadmap: 'Feedback & Roadmap',
      feedback: 'Feedback',
      roadmap: 'Roadmap',
      legal: 'Legal',
      privacy: 'Privacy',
      terms: 'Terms of Service',
      cookiePolicy: 'Cookie Policy',
      cookieSettings: 'Cookie Settings',
      privacySettings: 'Privacy Settings',
      profile: 'Profile',
      logout: 'Logout',
    },

    // Cookie Consent
    cookieConsent: {
      title: 'Cookie Settings',
      description: 'We use cookies to improve your experience and optimize our services. You can adjust your preferences at any time.',
      acceptAll: 'Accept All',
      essentialOnly: 'Essential Only',
      settings: 'Settings',
      saveSettings: 'Save Settings',
      cancel: 'Cancel',
      readPrivacyPolicy: 'Read Privacy Policy',
      essential: {
        title: 'Essential Cookies',
        description: 'These cookies are necessary for the website to function.',
      },
      functional: {
        title: 'Functional Cookies',
        description: 'Help provide enhanced functionality.',
      },
      analytics: {
        title: 'Analytics Cookies',
        description: 'Help us understand how visitors use the website.',
      },
      marketing: {
        title: 'Marketing Cookies',
        description: 'Used to display relevant advertising.',
      },
    },
  },
};
