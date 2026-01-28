import { QuestionConfig } from '../types/multiStepYesNo';

export const incomeQuestions: QuestionConfig = {
  section: 'income',
  questions: [
    {
      id: 'hasPension',
      text: 'Erhältst du Renten aus Sozialversicherungen oder einer Pensionskasse?',
      explanation: 'Dazu gehören AHV-Renten, IV-Renten, Pensionskassenrenten, berufliche Vorsorge (BVG), Unfallrenten, Militärversicherungsrenten sowie ausländische Sozialversicherungsrenten. Auch Renten von Freizügigkeitsstiftungen und vorzeitige Pensionierungsleistungen zählen dazu.'
    },
    {
      id: 'hasGiftInheritance',
      text: 'Hast du eine Schenkung oder einen Erbvorbezug erhalten?',
      explanation: 'Schenkungen sind unentgeltliche Zuwendungen von Dritten wie Geldgeschenke, Immobilien oder andere Wertsachen. Erbvorbezüge sind Vermögenswerte, die du bereits zu Lebzeiten der Erblasser erhalten hast und die später vom Erbe abgezogen werden. Beide müssen in der Steuererklärung deklariert werden.'
    },
    {
      id: 'hasPensionPayout',
      text: 'Hast du eine Kapitalauszahlung aus der Säule 2 oder Säule 3 erhalten?',
      explanation: 'Kapitalauszahlungen aus der beruflichen Vorsorge (Säule 2) oder der gebundenen Selbstvorsorge (Säule 3a) bei Pensionierung, Invalidität, Auswanderung oder Aufnahme einer selbständigen Erwerbstätigkeit. Diese werden separat und zu einem reduzierten Steuersatz besteuert.'
    },
    {
      id: 'hasOtherIncome',
      text: 'Hast du weitere Einkommen generiert?',
      explanation: 'Weitere Einkommen umfassen Nebeneinkommen aus Teilzeitarbeit, Mieteinnahmen aus vermieteten Immobilien, Pachterträge, Dividenden und Zinserträge, Tantiemen, Gratifikationen, Honorare aus selbständiger Nebentätigkeit sowie alle anderen nicht bereits erfassten Einkommensarten.'
    },
    {
      id: 'hasFreelance',
      text: 'Bist du selbständigerwerbend?',
      explanation: 'Selbständigerwerbend sind Personen, die ein eigenes Unternehmen führen, freiberuflich tätig sind oder als Einzelfirma, GmbH oder AG geschäftlich aktiv sind. Dazu gehören auch Ärzte mit eigener Praxis, Anwälte, Berater, Handwerker mit eigenem Betrieb sowie Online-Unternehmer und Influencer.'
    },
    {
      id: 'hasSalary',
      text: 'Bist du Arbeitnehmer?',
      explanation: 'Als Arbeitnehmer gelten alle Personen in einem Anstellungsverhältnis mit einem Arbeitsvertrag. Dazu gehören Vollzeit- und Teilzeitangestellte, Lehrlinge, Praktikanten, Temporärangestellte sowie Personen mit mehreren Arbeitgebern. Der Lohn wird durch den Lohnausweis dokumentiert.',
      requiresRepeater: {
        component: 'EmployerRepeater',
        minimumEntries: 1,
        title: 'Arbeitgeber Details'
      }
    }
  ]
};

export const assetsQuestions: QuestionConfig = {
  section: 'assets',
  questions: [
    {
      id: 'hasVehicle',
      text: 'Besitzt du Fahrzeuge?',
      explanation: 'Alle motorisierten Fahrzeuge wie Autos, Motorräder, Wohnmobile, Boote, Jet-Skis und andere Wasserfahrzeuge müssen als Vermögen deklariert werden. Der Verkehrswert zum Stichtag 31. Dezember ist massgebend, nicht der ursprüngliche Kaufpreis. Leasingfahrzeuge gehören nicht zum steuerbaren Vermögen.',
      requiresRepeater: {
        component: 'VehicleRepeater',
        minimumEntries: 1,
        title: 'Fahrzeug Details'
      }
    },
    {
      id: 'hasProperty',
      text: 'Besitzt du Immobilien?',
      explanation: 'Zu den Immobilien gehören das selbstbewohnte Eigenheim, Ferienhäuser, vermietete Liegenschaften, Eigentumswohnungen, Bauland, landwirtschaftliche Grundstücke sowie Anteile an Immobilienfonds oder Immobilien-AGs. Der Steuerwert wird meist durch die Steuerbehörden festgelegt und kann vom Marktwert abweichen.',
      requiresRepeater: {
        component: 'PropertyRepeater',
        minimumEntries: 1,
        title: 'Immobilien Details'
      }
    },
    {
      id: 'hasMortgage',
      text: 'Hast du Hypotheken oder Immobilienkredite?',
      explanation: 'Hypotheken und andere Immobilienkredite sind abzugsfähige Schulden. Dazu gehören erste und zweite Hypotheken, Vorfinanzierungskredite für den Hausbau, Renovationskredite sowie private Darlehen für Immobilienkäufe. Der Schuldsaldo per 31. Dezember ist massgebend für die Steuererklärung.'
    },
    {
      id: 'hasDebt',
      text: 'Hast du Schulden?',
      explanation: 'Abzugsfähige Schulden umfassen Bankkredite, Privatkredite, Kreditkartenschulden, Leasingverpflichtungen, geschäftliche Darlehen, Steuerschulden sowie Verbindlichkeiten gegenüber Dritten. Nicht abzugsfähig sind Schulden für den Lebensunterhalt oder Konsumschulden ohne wirtschaftlichen Zweck.',
      requiresRepeater: {
        component: 'DebtRepeater',
        minimumEntries: 1,
        title: 'Schulden Details'
      }
    },
    {
      id: 'hasDepositAccount',
      text: 'Hast du ein Depotkonto?',
      explanation: 'Depotkonten enthalten Wertpapiere wie Aktien, Obligationen, Anlagefonds, ETFs, strukturierte Produkte sowie andere börsengehandelte Anlagen. Alle Wertpapiere in der Schweiz und im Ausland müssen mit dem Kurswert per 31. Dezember deklariert werden. Auch ausländische Depots und Online-Broker wie Interactive Brokers, Swissquote oder Trading 212 gehören dazu.'
    },
    {
      id: 'hasCrypto',
      text: 'Besitzt du Kryptowährungen?',
      explanation: 'Kryptowährungen wie Bitcoin, Ethereum, Litecoin und alle anderen digitalen Assets gelten als steuerbares Vermögen. Der Wert per 31. Dezember gemäss offiziellen Kurslisten der Eidgenössischen Steuerverwaltung ist massgebend. Auch DeFi-Tokens, NFTs und Staking-Rewards müssen deklariert werden.'
    },
    {
      id: 'hasOtherAssets',
      text: 'Hast du weitere Vermögen?',
      explanation: 'Weitere Vermögenswerte umfassen Kunstwerke, Antiquitäten, Schmuck, Edelmetalle, Sammlungen, Lebensversicherungen mit Rückkaufswert, Forderungen gegenüber Dritten, Beteiligungen an nicht kotierten Unternehmen sowie alle anderen Wertsachen mit einem Verkehrswert über 5000 Franken.'
    }
  ]
};

export const deductionsQuestions: QuestionConfig = {
  section: 'deductions',
  questions: [
    {
      id: 'hasPillar3a',
      text: 'Zahlst du in die Säule 3a ein?',
      explanation: 'Die Säule 3a ist die steuerlich begünstigte, gebundene Selbstvorsorge. Einzahlungen können bis zum gesetzlichen Maximum (aktuell 7056 CHF für Angestellte, 35280 CHF für Selbständige ohne Pensionskasse) vollständig vom steuerbaren Einkommen abgezogen werden. Die Einzahlungen müssen bis zum 31. Dezember erfolgen.'
    },
    {
      id: 'hasBVGPurchase',
      text: 'Hast du Einkäufe in die Pensionskasse getätigt?',
      explanation: 'Freiwillige Einkäufe in die berufliche Vorsorge (BVG) zur Verbesserung der Alters- und Invalidenleistungen sind vollständig steuerlich abzugsfähig. Der mögliche Einkaufsbetrag wird durch die Pensionskasse berechnet und im Vorsorgeausweis ausgewiesen. Bei Kapitalbezug innerhalb von drei Jahren sind Einschränkungen zu beachten.'
    },
    {
      id: 'hasEducationExpenses',
      text: 'Hast du Weiterbildungskosten?',
      explanation: 'Abzugsfähig sind berufsorientierte Aus- und Weiterbildungskosten, Umschulungen, Studiengänge zur beruflichen Verbesserung, Sprachkurse mit beruflichem Bezug, Fachliteratur, Seminar- und Kursgebühren. Reine Hobbyaktivitäten oder allgemeinbildende Kurse ohne beruflichen Bezug sind nicht abzugsfähig.'
    },
    {
      id: 'hasDonations',
      text: 'Hast du Spenden geleistet?',
      explanation: 'Spenden an gemeinnützige, mildtätige oder kirchliche Organisationen mit Sitz in der Schweiz sind bis zu 20% des Reineinkommens abzugsfähig. Die Organisation muss von der Steuerbehörde als gemeinnützig anerkannt sein. Spenden an politische Parteien oder ausländische Organisationen sind grundsätzlich nicht abzugsfähig.'
    },
    {
      id: 'hasPropertyMaintenance',
      text: 'Hast du Unterhaltskosten für Liegenschaften?',
      explanation: 'Abzugsfähig sind Kosten für den Unterhalt und die Renovation von selbstbewohnten und vermieteten Liegenschaften. Dazu gehören Reparaturen, Erneuerungen, energetische Sanierungen, Gartenpflege und Schneeräumung. Wertvermehrende Investitionen können über mehrere Jahre verteilt abgezogen werden.'
    },
    {
      id: 'hasOtherDeductions',
      text: 'Hast du weitere Abzüge?',
      explanation: 'Weitere abzugsfähige Kosten umfassen Verwaltungskosten für Wertschriften, Steuerberatungskosten, Versicherungsprämien für Erwerbs- und Berufsunfähigkeit, Kranken- und Unfallversicherungsprämien sowie außerordentliche Belastungen wie hohe Krankheitskosten oder Katastrophenschäden.'
    },
    {
      id: 'hasSupportedPersons',
      text: 'Unterstützt du andere Personen finanziell?',
      explanation: 'Unterstützungsleistungen an bedürftige Angehörige wie Eltern, Grosseltern, erwachsene Kinder oder andere Verwandte sind abzugsfähig, wenn diese nicht über ausreichende eigene Mittel verfügen. Die Unterstützung muss regelmässig und in erheblichem Umfang erfolgen. Ein Nachweis der Bedürftigkeit ist erforderlich.'
    },
    {
      id: 'hasMaintenancePayments',
      text: 'Zahlst du Unterhaltsbeiträge?',
      explanation: 'Gesetzlich oder gerichtlich festgelegte Unterhaltszahlungen an geschiedene oder getrennt lebende Ehegatten sowie Alimente für Kinder sind vollständig vom Einkommen abzugsfähig. Freiwillige Zahlungen über das gesetzlich Vorgeschriebene hinaus sind nur in Ausnahmefällen abzugsfähig. Kinderalimente werden beim Empfänger als Einkommen besteuert.'
    },
    {
      id: 'hasChildcare',
      text: 'Hast du Kinderbetreuungskosten?',
      explanation: 'Kosten für die Betreuung von Kindern unter 14 Jahren durch Dritte sind abzugsfähig, wenn beide Elternteile erwerbstätig sind oder sich in Ausbildung befinden. Dazu gehören Kosten für Krippen, Kindergärten, Horte, Tagesmütter und Babysitter. Die Betreuung durch Verwandte ist nur bei nachgewiesener Entlohnung abzugsfähig.'
    }
  ]
};

export const getQuestionsForSection = (section: 'income' | 'assets' | 'deductions'): QuestionConfig => {
  switch (section) {
    case 'income':
      return incomeQuestions;
    case 'assets':
      return assetsQuestions;
    case 'deductions':
      return deductionsQuestions;
    default:
      throw new Error(`Unknown section: ${section}`);
  }
};