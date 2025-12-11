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

  // Document checklist
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
  };

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
      sessionErrorDescription: "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.",
      notLoggedIn: "Nicht angemeldet",
      notLoggedInDescription: "Du musst dich anmelden, um fortzufahren.",
      authFailed: "Authentifizierung fehlgeschlagen",
      authFailedDescription: "Bitte versuchen Sie es erneut.",
      autoLogout: "Automatisch abgemeldet",
      autoLogoutDescription: "Sie wurden aufgrund von Inaktivität abgemeldet.",
      sessionExtended: "Sitzung verlängert",
      sessionExtendedDescription: "Ihre Sitzung wurde erfolgreich verlängert.",
      successfulLogout: "Erfolgreich abgemeldet",
      successfulLogoutMessage: "Sie wurden erfolgreich abgemeldet.",
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
      hasPropertyMaintenanceExplanation: 'Als Eigentümer einer Liegenschaft können Sie die Kosten für deren Unterhalt steuerlich geltend machen. Dazu gehören Reparaturen, Renovationen und andere werterhaltende Massnahmen.',
      hasSupportedPersons: 'Ich unterstütze unterstützungsbedürftige Personen',
      hasSupportedPersonsExplanation: 'Wenn Sie Personen unterstützen, die in Ihrem Haushalt leben oder von Ihnen finanziell abhängig sind, können Sie unter Umständen einen Unterstützungsabzug geltend machen.',
      hasMaintenancePayments: 'Ich leiste Unterhaltszahlungen',
      hasMaintenancePaymentsExplanation: 'Unterhaltszahlungen an geschiedene Ehepartner oder Kinder können unter bestimmten Voraussetzungen vom steuerbaren Einkommen abgezogen werden.',
      hasChildcare: 'Ich habe Kinderbetreuungskosten',
      hasChildcareExplanation: 'Kosten für die Betreuung Ihrer Kinder können bis zu einem bestimmten Maximalbetrag vom steuerbaren Einkommen abgezogen werden. Dies gilt sowohl für die Betreuung in einer Kita als auch für die Betreuung durch eine Tagesmutter.',
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
      hasVehicleExplanation: 'Schliessen Sie hier alle Fahrzeuge ein, die Sie besitzen - Autos, Motorräder, Boote usw.',
      hasProperty: 'Ich besitze eine Liegenschaft oder ein Grundstück',
      hasPropertyExplanation: 'Als Liegenschaft gelten Häuser, Wohnungen, Grundstücke oder andere Immobilien, die sich in Ihrem Besitz befinden.',
      hasMortgage: 'Ich habe eine Hypothek',
      hasMortgageExplanation: 'Eine Hypothek ist ein Darlehen, das durch eine Immobilie besichert ist. Geben Sie an, ob Sie ein solches Darlehen aufgenommen haben.',
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
        invalidFileTypeDesc: 'Bitte wählen Sie eine Bilddatei aus.',
        noFileSelected: 'Keine Datei ausgewählt',
        userNotLoggedIn: 'Benutzer nicht angemeldet',
        uploadSuccess: 'Avatar erfolgreich hochgeladen',
        uploadSuccessDesc: 'Ihr Avatar wurde aktualisiert.',
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
        selectAtLeastOne: 'Bitte wählen Sie mindestens eine Datei aus.',
        noFilesToUpload: 'Keine Dateien zum Hochladen vorhanden.',
        uploadSuccess: 'Dokumente hochgeladen',
        uploadSuccessDesc: 'erfolgreich hochgeladen.',
        loginRequired: 'Du musst angemeldet sein, um Dokumente hochzuladen.',
        uploadError: 'Upload-Fehler',
        databaseError: 'Datenbankfehler',
      },
    },

    // Document checklist
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
      required: 'Erforderlich',
      or: 'oder',
      view: 'Ansehen',
      delete: 'Löschen',
      upload: 'Hochladen',
      assign: 'Zuweisen',
    },

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
  },
};
