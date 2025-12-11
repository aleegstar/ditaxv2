
import { StepConfig } from '../types/multiStepForm';

export const FORM_STEPS: StepConfig[] = [
  {
    section: 'Kontaktangaben',
    steps: [
      {
        id: 'contactInfo.firstName',
        title: 'Wie lautet dein Vorname?',
        type: 'text',
        placeholder: 'Gib deinen Vornamen ein',
        validation: { required: true, message: 'Vorname ist erforderlich' }
      },
      {
        id: 'contactInfo.lastName',
        title: 'Wie lautet dein Nachname?',
        type: 'text',
        placeholder: 'Gib deinen Nachnamen ein',
        validation: { required: true, message: 'Nachname ist erforderlich' }
      },
      {
        id: 'contactInfo.address',
        title: 'Wie lautet deine Wohnadresse?',
        type: 'address',
        explanation: 'Gib deine aktuelle Wohnadresse an. Diese wird für die Steuererklärung benötigt und bestimmt auch deine Steuergemeinde.',
        validation: { required: true, message: 'Adresse ist erforderlich' }
      },
      {
        id: 'contactInfo.adressnummer',
        title: 'Adressnummer (optional)',
        type: 'text',
        placeholder: 'z.B. A123',
        explanation: 'Manche Gemeinden vergeben zusätzliche Adressnummern oder Codes. Diese findest du meist auf deiner Steuererklärung vom Vorjahr.',
        validation: { required: false }
      },
      {
        id: 'contactInfo.kanton',
        title: 'In welchem Kanton wohnst du?',
        type: 'select',
        options: ['ZH', 'AG', 'ZG', 'SZ'],
        explanation: 'Der Wohnkanton bestimmt die kantonalen Steuersätze und die geltenden Steuergesetze für deine Steuererklärung.',
        validation: { required: true, message: 'Kanton ist erforderlich' }
      },
      {
        id: 'contactInfo.birthDate',
        title: 'Wann bist du geboren?',
        type: 'date',
        explanation: 'Dein Geburtsdatum wird für die Berechnung von Altersentlastungen und anderen altersabhängigen Abzügen benötigt.',
        validation: { required: true, message: 'Geburtsdatum ist erforderlich' }
      },
      {
        id: 'contactInfo.religion',
        title: 'Welcher Religion gehörst du an?',
        type: 'select',
        options: ['römisch-katholisch', 'reformiert', 'christkatolisch', 'andere/keine'],
        explanation: 'Die Religionszugehörigkeit bestimmt, ob du Kirchensteuern zahlen musst. Diese werden vom Kanton eingezogen.',
        validation: { required: true, message: 'Religion ist erforderlich' }
      },
      {
        id: 'contactInfo.maritalStatus',
        title: 'Wie ist dein Zivilstand?',
        type: 'select',
        options: ['ledig', 'verheiratet', 'verwitwet'],
        explanation: 'Der Zivilstand beeinflusst deine Steuersätze und bestimmt, ob du eine gemeinsame oder getrennte Steuererklärung abgibst.',
        validation: { required: true, message: 'Zivilstand ist erforderlich' }
      },
      {
        id: 'contactInfo.firefighterService',
        title: 'Leistest du Feuerwehrdienst?',
        type: 'boolean',
        explanation: 'Feuerwehrdienstleistende können in vielen Kantonen Steuerabzüge geltend machen oder sind von der Militärdienstpflicht befreit.',
        validation: { required: true }
      },
      {
        id: 'contactInfo.hasChildren',
        title: 'Hast du Kinder?',
        type: 'boolean',
        explanation: 'Kinder berechtigen zu Kinderabzügen und können die Steuerlast erheblich reduzieren. Auch Kinderbetreuungskosten sind abzugsfähig.',
        validation: { required: true },
        repeaterFields: [
          { id: 'firstName', label: 'Vorname', type: 'text', required: true, placeholder: 'Vorname des Kindes' },
          { id: 'lastName', label: 'Nachname', type: 'text', required: true, placeholder: 'Nachname des Kindes' },
          { id: 'birthDate', label: 'Geburtsdatum', type: 'date', required: true },
          { id: 'schoolLevel', label: 'Schulstufe', type: 'text', required: true, placeholder: 'z.B. Gymnasium, Berufslehre' },
          { 
            id: 'religion', 
            label: 'Religion', 
            type: 'select', 
            required: true,
            options: ['römisch-katholisch', 'reformiert', 'christkatolisch', 'andere/keine']
          },
          { 
            id: 'deduction', 
            label: 'Kinderabzug', 
            type: 'select', 
            required: true,
            options: ['higher-income-father', 'higher-income-mother', 'child-self-sufficient', 'child-different-household']
          }
        ]
      }
    ]
  },
  {
    section: 'Einkommen',
    steps: [
      {
        id: 'income.hasSalary',
        title: 'Bist du als Arbeitnehmer tätig?',
        type: 'boolean',
        explanation: 'Einkommen aus unselbständiger Erwerbstätigkeit umfasst Lohn, Gehalt, Boni und andere Vergütungen von deinem Arbeitgeber.',
        validation: { required: true },
        repeaterFields: [
          { id: 'workLocation', label: 'Arbeitsort', type: 'text', required: true, placeholder: 'Stadt oder PLZ' },
          { id: 'workload', label: 'Arbeitspensum (%)', type: 'number', required: true, placeholder: 'z.B. 100' },
          { id: 'workDays', label: 'Arbeitstage pro Woche', type: 'number', required: true, placeholder: 'z.B. 5' },
          { 
            id: 'commute', 
            label: 'Arbeitsweg', 
            type: 'select', 
            required: true,
            options: ['public', 'publicBike', 'bike', 'car']
          },
          { id: 'carReason', label: 'Grund für Autonutzung', type: 'text', required: false, placeholder: 'Falls Auto gewählt wurde' }
        ]
      },
      {
        id: 'income.hasFreelance',
        title: 'Bist du selbstständig erwerbend?',
        type: 'boolean',
        explanation: 'Selbstständige Erwerbstätigkeit umfasst Einkommen aus eigener Geschäftstätigkeit, freiberuflicher Tätigkeit oder als Einzelunternehmer.',
        validation: { required: true }
      },
      {
        id: 'income.hasPension',
        title: 'Erhältst du eine Rente?',
        type: 'boolean',
        explanation: 'Renten aus AHV, IV, Pensionskassen oder privater Vorsorge sind steuerpflichtig. Je nach Rentenart gelten unterschiedliche Bestimmungen.',
        validation: { required: true }
      },
      {
        id: 'income.hasGiftInheritance',
        title: 'Hast du Schenkungen oder Erbschaften erhalten?',
        type: 'boolean',
        explanation: 'Schenkungen und Erbschaften können je nach Kanton und Verwandtschaftsgrad unterschiedlich besteuert werden.',
        validation: { required: true }
      },
      {
        id: 'income.hasPensionPayout',
        title: 'Hast du Kapitalleistungen aus Vorsorge erhalten?',
        type: 'boolean',
        explanation: 'Kapitalleistungen aus Pensionskasse oder Säule 3a werden separat und meist zu einem reduzierten Satz besteuert.',
        validation: { required: true }
      },
      {
        id: 'income.hasOtherIncome',
        title: 'Hast du andere Einkommen?',
        type: 'boolean',
        explanation: 'Andere Einkommen können Nebentätigkeiten, Zinserträge, Gewinne aus Verkäufen oder sonstige steuerpflichtige Einnahmen sein.',
        validation: { required: true }
      }
    ]
  },
  {
    section: 'Abzüge',
    steps: [
      {
        id: 'deductions.hasPillar3a',
        title: 'Hast du in die Säule 3a eingezahlt?',
        type: 'boolean',
        explanation: 'Säule 3a ist die private, freiwillige Vorsorge. Einzahlungen können vollständig von den Steuern abgezogen werden (max. CHF 7\'056 für Angestellte).',
        validation: { required: true }
      },
      {
        id: 'deductions.hasBVGPurchase',
        title: 'Hast du BVG-Einkäufe getätigt?',
        type: 'boolean',
        explanation: 'BVG-Einkäufe sind freiwillige Einzahlungen in deine Pensionskasse. Sie können vollständig von den Steuern abgezogen werden.',
        validation: { required: true }
      },
      {
        id: 'deductions.hasEducationExpenses',
        title: 'Hast du Weiterbildungskosten?',
        type: 'boolean',
        explanation: 'Berufsbedingte Weiterbildungskosten können als Berufsauslagen abgezogen werden. Dazu gehören Kurse, Seminare und berufliche Umschulungen.',
        validation: { required: true }
      },
      {
        id: 'deductions.hasDonations',
        title: 'Hast du Spenden getätigt?',
        type: 'boolean',
        explanation: 'Spenden an gemeinnützige Organisationen können bis zu einem bestimmten Prozentsatz des Einkommens abgezogen werden.',
        validation: { required: true }
      },
      {
        id: 'deductions.hasPropertyMaintenance',
        title: 'Hast du Liegenschaftsunterhaltskosten?',
        type: 'boolean',
        explanation: 'Unterhaltskosten für selbst bewohnte oder vermietete Immobilien können abgezogen werden. Dazu gehören Reparaturen und Renovationen.',
        validation: { required: true }
      },
      {
        id: 'deductions.hasChildcare',
        title: 'Hast du Kinderbetreuungskosten?',
        type: 'boolean',
        explanation: 'Kosten für die Betreuung von Kindern unter 14 Jahren können abgezogen werden, wenn beide Elternteile erwerbstätig sind.',
        validation: { required: true }
      },
      {
        id: 'deductions.hasSupportedPersons',
        title: 'Unterstützt du andere Personen?',
        type: 'boolean',
        explanation: 'Unterstützung von bedürftigen Personen (Verwandte, etc.) kann unter bestimmten Umständen als Abzug geltend gemacht werden.',
        validation: { required: true },
        repeaterFields: [
          { id: 'firstName', label: 'Vorname', type: 'text', required: true, placeholder: 'Vorname der Person' },
          { id: 'lastName', label: 'Nachname', type: 'text', required: true, placeholder: 'Nachname der Person' },
          { id: 'birthDate', label: 'Geburtsdatum', type: 'date', required: true },
          { id: 'supportAmount', label: 'Unterstützungsbetrag (CHF)', type: 'number', required: true, placeholder: 'Jährlicher Betrag' }
        ]
      },
      {
        id: 'deductions.hasMaintenancePayments',
        title: 'Zahlst du Unterhaltsbeiträge?',
        type: 'boolean',
        explanation: 'Unterhaltsbeiträge an geschiedene Ehepartner oder Kinder können von den Steuern abgezogen werden.',
        validation: { required: true }
      },
      {
        id: 'deductions.hasOtherDeductions',
        title: 'Hast du andere Abzüge?',
        type: 'boolean',
        explanation: 'Andere Abzüge können Krankheitskosten, Zinsen auf Privatschulden oder außergewöhnliche Belastungen sein.',
        validation: { required: true }
      }
    ]
  },
  {
    section: 'Vermögen',
    steps: [
      {
        id: 'assets.hasVehicle',
        title: 'Besitzt du ein Fahrzeug?',
        type: 'boolean',  
        explanation: 'Fahrzeuge sind steuerpflichtiges Vermögen. Der Verkehrswert wird zum Steuerwert angesetzt.',
        validation: { required: true },
        repeaterFields: [
          { id: 'name', label: 'Fahrzeugname', type: 'text', required: true, placeholder: 'z.B. BMW 3er' },
          { id: 'make', label: 'Marke', type: 'text', required: true, placeholder: 'z.B. BMW' },
          { id: 'model', label: 'Modell', type: 'text', required: true, placeholder: 'z.B. 320i' },
          { id: 'year', label: 'Baujahr', type: 'number', required: true, placeholder: 'z.B. 2020' },
          { id: 'purchaseYear', label: 'Kaufjahr', type: 'number', required: true, placeholder: 'z.B. 2021' },
          { id: 'purchasePrice', label: 'Kaufpreis (CHF)', type: 'number', required: true, placeholder: 'Ursprünglicher Kaufpreis' },
          { id: 'value', label: 'Aktueller Wert (CHF)', type: 'number', required: true, placeholder: 'Geschätzter aktueller Wert' }
        ]
      },
      {
        id: 'assets.hasProperty',
        title: 'Besitzt du Immobilien?',
        type: 'boolean',
        explanation: 'Immobilien werden zum Verkehrswert besteuert. Hypotheken können als Schulden abgezogen werden.',
        validation: { required: true },
        repeaterFields: [
          { id: 'address', label: 'Adresse', type: 'text', required: true, placeholder: 'Vollständige Adresse der Immobilie' },
          { id: 'type', label: 'Immobilientyp', type: 'select', required: true, options: ['Einfamilienhaus', 'Eigentumswohnung', 'Mehrfamilienhaus', 'Gewerbeimmobilie', 'Bauland'] },
          { id: 'value', label: 'Verkehrswert (CHF)', type: 'number', required: true, placeholder: 'Geschätzter Marktwert' },
          { id: 'taxValue', label: 'Steuerwert (CHF)', type: 'number', required: false, placeholder: 'Falls bekannt' },
          { id: 'rentalValue', label: 'Eigenmietwert (CHF)', type: 'number', required: false, placeholder: 'Jährlicher Eigenmietwert' },
          { id: 'isOutsideCanton', label: 'Ausserhalb des Wohnkantons', type: 'select', required: true, options: ['ja', 'nein'] },
          { id: 'isOlderThanFiveYears', label: 'Seit mehr als 5 Jahren im Besitz', type: 'select', required: true, options: ['ja', 'nein'] },
          { id: 'purchasedThisYear', label: 'Wurde im aktuellen Steuerjahr erworben', type: 'select', required: true, options: ['ja', 'nein'] }
        ]
      },
      {
        id: 'assets.hasMortgage',
        title: 'Hast du Hypotheken?',
        type: 'boolean',
        explanation: 'Hypothekenschulden können vom steuerbaren Vermögen abgezogen werden. Auch die Zinsen sind steuerlich abzugsfähig.',
        validation: { required: true }
      },
      {
        id: 'assets.hasDebt',
        title: 'Hast du andere Schulden?',
        type: 'boolean',
        explanation: 'Andere Schulden können Bankkredite, Privatdarlehen oder Kreditkartenschulden sein. Diese reduzieren das steuerbare Vermögen.',
        validation: { required: true }
      },
      {
        id: 'assets.hasDepositAccount',
        title: 'Besitzt du Bankkonten/Sparguthaben?',
        type: 'boolean',
        explanation: 'Alle Bankguthaben, Sparkonten und andere Geldanlagen sind als Vermögen steuerpflichtig.',
        validation: { required: true }
      },
      {
        id: 'assets.hasCrypto',
        title: 'Besitzt du Kryptowährungen?',
        type: 'boolean',
        explanation: 'Kryptowährungen gelten als steuerpflichtiges Vermögen. Sie werden zum Kurswert per 31.12. bewertet.',
        validation: { required: true }
      },
      {
        id: 'assets.hasOtherAssets',
        title: 'Besitzt du andere Vermögenswerte?',
        type: 'boolean',
        explanation: 'Andere Vermögenswerte können Schmuck, Kunstwerke, Sammlungen oder andere wertvolle Gegenstände sein.',
        validation: { required: true }
      }
    ]
  }
];
