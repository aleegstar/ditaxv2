import { BookOpen, FileText, Upload, CheckCircle, CreditCard, Shield, Home, Zap, LogIn, CalendarPlus, User, Wallet, PiggyBank, Receipt, ClipboardCheck, ScanLine, Send, BarChart3, FileCheck, DollarSign, CreditCard as CardIcon, Lock, UserCog, HelpCircle } from 'lucide-react';

export interface DocsArticle {
  id: string;
  title: string;
  subtitle?: string;
  content: string;
  keywords: string[];
  icon: typeof BookOpen;
}

export interface DocsCategory {
  id: string;
  title: string;
  description: string;
  icon: typeof BookOpen;
  articles: DocsArticle[];
}

export const docsCategories: DocsCategory[] = [
  {
    id: 'getting-started',
    title: 'Erste Schritte',
    description: 'Alles was du brauchst, um loszulegen',
    icon: BookOpen,
    articles: [
      {
        id: 'introduction',
        icon: Home,
        title: 'Einführung',
        subtitle: 'Deine Steuererklärung – einfach, sicher und von Experten erstellt.',
        content: '',
        keywords: ['einführung', 'übersicht', 'introduction', 'start', 'ditax'],
      },
      {
        id: 'registration',
        icon: LogIn,
        title: 'Registrierung & Login',
        content: `## Konto erstellen

In wenigen Schritten bist du startklar:

1. Öffne die Ditax App auf deinem Smartphone
2. Tippe auf **"Konto erstellen"**
3. Gib deine E-Mail-Adresse ein und wähle ein sicheres Passwort
4. Bestätige deine E-Mail über den zugesendeten Link
5. Fertig – du kannst dich jetzt einloggen

### Anmelden

Melde dich mit deiner E-Mail und deinem Passwort an. Für noch mehr Komfort kannst du **Passkeys** (Face ID / Touch ID) oder die **Zwei-Faktor-Authentifizierung** aktivieren.

### Passwort vergessen?

Tippe auf dem Login-Bildschirm auf **"Passwort vergessen"** – du erhältst eine E-Mail mit einem Link zum Zurücksetzen.`,
        keywords: ['registrierung', 'login', 'anmelden', 'konto', 'passwort', 'email'],
      },
      {
        id: 'create-tax-year',
        icon: CalendarPlus,
        title: 'Steuerjahr anlegen',
        content: `## Dein erstes Steuerjahr starten

Nach dem Login landest du auf dem Dashboard. So legst du los:

1. Tippe auf **"Steuerjahr hinzufügen"**
2. Wähle das gewünschte Jahr (z.B. 2024)
3. Entscheide dich zwischen **Express** (10 Arbeitstage) oder **Standard** (60 Arbeitstage)
4. Dein Steuerjahr ist bereit – du kannst sofort mit der Erfassung beginnen

### Für die ganze Familie

Du kannst die Steuererklärung auch für weitere Personen einreichen – zum Beispiel für deinen Ehepartner oder deine Kinder. Füge sie einfach unter **Profil → Steuerpflichtige Personen** hinzu.

### Mehrere Jahre gleichzeitig

Falls du Steuererklärungen für verschiedene Jahre brauchst, lege einfach mehrere Steuerjahre an. Jedes wird separat auf dem Dashboard angezeigt.`,
        keywords: ['steuerjahr', 'anlegen', 'hinzufügen', 'dashboard', 'express', 'standard'],
      },
    ],
  },
  {
    id: 'data-entry',
    title: 'Angaben erfassen',
    description: 'Schritt für Schritt zur vollständigen Steuererklärung',
    icon: FileText,
    articles: [
      {
        id: 'personal-data',
        icon: User,
        title: 'Persönliche Angaben',
        content: `## Deine persönlichen Daten

Im ersten Schritt hinterlegst du deine Grunddaten. Diese werden für die Steuererklärung benötigt:

- **Name und Vorname**
- **Geburtsdatum**
- **Adresse** (Strasse, PLZ, Ort)
- **AHV-Nummer** (wird verschlüsselt gespeichert)
- **Zivilstand und Konfession**

### Zwei Erfassungsmodi

Wähle den Modus, der zu dir passt:

- **Geführter Modus** – einfache Ja/Nein-Fragen führen dich durch den Prozess. Ideal, wenn du zum ersten Mal eine Steuererklärung machst.
- **Experten-Modus** – alle Felder auf einen Blick. Für erfahrene Nutzer, die schnell vorankommen wollen.

Du kannst jederzeit zwischen den Modi wechseln.`,
        keywords: ['persönlich', 'angaben', 'name', 'adresse', 'ahv', 'zivilstand'],
      },
      {
        id: 'income',
        icon: Wallet,
        title: 'Einkommen erfassen',
        content: `## Dein Einkommen angeben

Gib hier alle Einkommensquellen an, damit unsere Experten deine Steuererklärung korrekt erstellen können:

- **Lohn** aus unselbständiger Erwerbstätigkeit
- **Selbständige Erwerbstätigkeit**
- **Nebeneinkünfte**
- **Renten und Pensionen** (AHV, IV, Pensionskasse)
- **Taggelder** (ALV, KTG, Unfallversicherung)
- **Mieteinnahmen**
- **Wertschriftenertrag** (Dividenden, Zinsen)

### Automatische Erkennung

Wenn du deinen Lohnausweis als Dokument hochlädst, werden die wichtigsten Daten automatisch erkannt und vorausgefüllt – du sparst dir die manuelle Eingabe.

### Mehrere Arbeitgeber

Warst du bei mehreren Arbeitgebern beschäftigt? Kein Problem – erfasse jeden Lohnausweis einzeln.`,
        keywords: ['einkommen', 'lohn', 'gehalt', 'rente', 'pension', 'lohnausweis', 'nebeneinkünfte'],
      },
      {
        id: 'assets',
        icon: PiggyBank,
        title: 'Vermögen erfassen',
        content: `## Dein Vermögen angeben

Erfasse dein gesamtes Vermögen per 31. Dezember des Steuerjahres:

- **Bankkonten** (Spar-, Privat-, Lohnkonto)
- **Wertschriften** (Aktien, Obligationen, Fonds)
- **Immobilien** (Eigentumswohnungen, Häuser)
- **Fahrzeuge**
- **Lebensversicherungen** (Rückkaufswert)
- **Kryptowährungen**
- **Übrige Vermögenswerte**

### Belege nicht vergessen

Für jeden Kontostand brauchst du einen Bankbeleg (Kontoauszug per 31.12.). Lade diese einfach als Dokument hoch.`,
        keywords: ['vermögen', 'bank', 'konto', 'wertschriften', 'aktien', 'immobilien', 'auto'],
      },
      {
        id: 'deductions',
        icon: Receipt,
        title: 'Abzüge erfassen',
        content: `## Spare Steuern mit den richtigen Abzügen

Unsere Experten sorgen dafür, dass kein Abzug vergessen geht. Gib hier deine abzugsfähigen Ausgaben an:

- **Berufsauslagen** (Fahrkosten, Verpflegung, Berufskleidung)
- **Weiterbildungskosten**
- **Versicherungsprämien** (Krankenkasse, Unfallversicherung)
- **Krankheitskosten** (über dem Selbstbehalt)
- **Säule 3a Einzahlungen**
- **Schuldzinsen**
- **Spenden** an gemeinnützige Organisationen
- **Kinderbetreuungskosten**
- **Liegenschaftsunterhalt**

### Warum Belege wichtig sind

Lade für jeden Abzug den passenden Beleg hoch. Bei einer Überprüfung durch das Steueramt müssen alle Abzüge nachgewiesen werden können. So bist du auf der sicheren Seite.`,
        keywords: ['abzüge', 'berufsauslagen', 'versicherung', 'krankenkasse', '3a', 'säule', 'spenden', 'schuldzinsen'],
      },
    ],
  },
  {
    id: 'documents',
    title: 'Dokumente',
    description: 'Dokumente hochladen und verwalten',
    icon: Upload,
    articles: [
      {
        id: 'document-checklist',
        icon: ClipboardCheck,
        title: 'Dokumenten-Checkliste',
        content: `## Alles im Blick mit der Checkliste

Die Checkliste zeigt dir genau, welche Dokumente du noch brauchst. So vergisst du nichts:

- ✅ **Lohnausweis** – von deinem Arbeitgeber
- ✅ **Bankbelege** – Kontoauszüge per 31.12.
- ✅ **Wertschriftenverzeichnis** – von der Bank
- ✅ **Krankenkassenprämie** – Jahresabrechnung
- ✅ **Säule 3a Bescheinigung** – von der Vorsorgeeinrichtung
- ✅ **Nebenkostenabrechnung** – bei Liegenschaftsbesitz
- ✅ **Spendenbescheinigungen** – bei Spenden über CHF 100

### Status auf einen Blick

Jedes Dokument zeigt dir seinen Status:
- 🔴 **Fehlend** – muss noch hochgeladen werden
- 🟡 **Hochgeladen** – wartet auf Zuordnung
- 🟢 **Zugewiesen** – alles in Ordnung`,
        keywords: ['checkliste', 'dokumente', 'lohnausweis', 'bankbeleg', 'krankenkasse'],
      },
      {
        id: 'upload-methods',
        icon: ScanLine,
        title: 'Hochladen & Scannen',
        content: `## So lädst du Dokumente hoch

Es gibt mehrere bequeme Wege:

### 📸 Foto aufnehmen
Fotografiere dein Dokument direkt mit der Smartphone-Kamera. Die App optimiert das Bild automatisch für eine optimale Lesbarkeit.

### 📁 Datei auswählen
Wähle eine bereits vorhandene Datei von deinem Gerät – ideal für PDFs die du per E-Mail erhalten hast.

### 🔍 Automatische Erkennung
Nach dem Upload analysiert Ditax dein Dokument automatisch:
- Der **Dokumententyp** wird erkannt (z.B. Lohnausweis)
- Das Dokument wird der **richtigen Kategorie** zugeordnet
- Wichtige **Daten werden extrahiert** und vorausgefüllt

### Unterstützte Formate
PDF (empfohlen), JPG, PNG, HEIC, DOC, XLS, CSV, ZIP und TXT – maximal 10 MB pro Datei.`,
        keywords: ['upload', 'hochladen', 'foto', 'kamera', 'scan', 'ocr', 'pdf', 'datei'],
      },
    ],
  },
  {
    id: 'tax-return',
    title: 'Steuererklärung',
    description: 'Einreichen, Status und fertige Erklärung',
    icon: CheckCircle,
    articles: [
      {
        id: 'submit',
        icon: Send,
        title: 'Einreichen & Bezahlen',
        content: `## Steuererklärung einreichen

Wenn alle Angaben erfasst und Dokumente hochgeladen sind, geht es ganz schnell:

1. Öffne dein Steuerjahr auf dem Dashboard
2. Überprüfe den Fortschritt – alle Bereiche sollten abgeschlossen sein
3. Tippe auf **"Bezahlen & Einreichen"**
4. Wähle deine Zahlungsmethode (TWINT oder Kreditkarte)
5. Nach der Bezahlung übernehmen unsere Steuerexperten

### Was passiert dann?

Unsere eidgenössisch diplomierten Treuhänder prüfen deine Angaben, optimieren deine Abzüge und erstellen die offizielle Steuererklärung. Du wirst benachrichtigt, sobald sie fertig ist.`,
        keywords: ['einreichen', 'abschicken', 'bezahlen', 'submit', 'fertig'],
      },
      {
        id: 'status',
        icon: BarChart3,
        title: 'Status verfolgen',
        content: `## Immer wissen, wo du stehst

Auf dem Dashboard siehst du jederzeit den aktuellen Stand deiner Steuererklärung:

- **Erfassung** – du bist noch bei der Dateneingabe
- **Dokumente** – es werden noch Dokumente benötigt
- **Eingereicht** – bezahlt und bei unseren Experten
- **In Bearbeitung** – unsere Treuhänder arbeiten daran
- **Fehlende Unterlagen** – wir brauchen noch etwas von dir
- **Fertig** – deine Steuererklärung ist bereit

### Benachrichtigungen

Du erhältst automatisch Push-Benachrichtigungen und E-Mails bei jeder Statusänderung – du verpasst nichts.`,
        keywords: ['status', 'fortschritt', 'bearbeitung', 'fertig', 'benachrichtigung'],
      },
      {
        id: 'completed',
        icon: FileCheck,
        title: 'Fertige Steuererklärung',
        content: `## Deine Steuererklärung ist fertig

Sobald unsere Experten fertig sind, wirst du benachrichtigt. So geht es weiter:

1. Öffne die Steuererklärung auf dem Dashboard
2. Prüfe das erstellte PDF
3. **Unterschreibe digital** – einfach und rechtsgültig
4. Die Steuererklärung wird beim Steueramt eingereicht

### Download

Du kannst deine fertige Steuererklärung jederzeit als PDF herunterladen und für deine Unterlagen speichern.

### Einspruch

Nicht einverstanden mit der Veranlagung? Über die App kannst du einen **Einspruch** erstellen – wir unterstützen dich dabei.`,
        keywords: ['fertig', 'download', 'unterschrift', 'signatur', 'pdf', 'einspruch'],
      },
    ],
  },
  {
    id: 'payment',
    title: 'Bezahlung',
    description: 'Preise, Services und Zahlungsmethoden',
    icon: CreditCard,
    articles: [
      {
        id: 'pricing',
        icon: DollarSign,
        title: 'Preise & Services',
        content: `## Transparente Preise

### Standard-Service
- **Ab CHF 150** pro Steuererklärung
- Bearbeitungszeit: **ca. 60 Arbeitstage**
- Professionelle Erstellung durch Treuhänder

### Express-Service
- **Aufpreis je nach Komplexität**
- Bearbeitungszeit: **ca. 10 Arbeitstage**
- Prioritäre Bearbeitung

### Das ist im Preis enthalten
- ✅ Professionelle Steuererklärung durch zertifizierte Treuhänder
- ✅ Maximale Optimierung deiner Abzüge
- ✅ Digitale Einreichung beim Steueramt
- ✅ Unterstützung bei Rückfragen des Steueramts
- ✅ Sichere digitale Aufbewahrung deiner Daten`,
        keywords: ['preis', 'kosten', 'express', 'standard', 'service', 'chf'],
      },
      {
        id: 'payment-methods',
        icon: CardIcon,
        title: 'Zahlungsmethoden',
        content: `## Bequem bezahlen

### TWINT
Bezahle schnell und einfach mit TWINT – scanne den QR-Code oder nutze die direkte Integration in der App.

### Kreditkarte
Visa, Mastercard und weitere Kreditkarten werden akzeptiert. Die Zahlung erfolgt sicher über **Stripe**.

### Sicherheit
Alle Zahlungen werden verschlüsselt abgewickelt. Ditax speichert keine Kreditkartendaten – deine Zahlungsinformationen sind zu jeder Zeit geschützt.`,
        keywords: ['zahlung', 'bezahlen', 'twint', 'kreditkarte', 'visa', 'mastercard', 'stripe'],
      },
    ],
  },
  {
    id: 'security-account',
    title: 'Sicherheit & Konto',
    description: 'Datenschutz, Sicherheitseinstellungen und Profil',
    icon: Shield,
    articles: [
      {
        id: 'security',
        icon: Lock,
        title: 'Datensicherheit',
        content: `## Deine Daten sind sicher

Datenschutz hat für uns höchste Priorität. So schützen wir deine Informationen:

### Verschlüsselung
- **Ende-zu-Ende-Verschlüsselung** für sensible Daten wie AHV-Nummer und Bankdaten
- **TLS/SSL** für alle Datenübertragungen
- **Verschlüsselung at rest** für gespeicherte Dokumente

### Datenspeicherort
- Alle Daten werden in der **Schweiz und/oder EU** gespeichert
- Vollständig **DSGVO-konform**
- Regelmässige Sicherheitsaudits

### Zusätzlicher Schutz
- **Zwei-Faktor-Authentifizierung (2FA)** – aktiviere sie unter Profil → Sicherheit für einen zusätzlichen Login-Schutz
- **Passkeys** – logge dich komfortabel mit Face ID, Touch ID oder Windows Hello ein`,
        keywords: ['sicherheit', 'verschlüsselung', '2fa', 'passwort', 'datenschutz', 'dsgvo', 'passkey'],
      },
      {
        id: 'profile',
        icon: UserCog,
        title: 'Profil verwalten',
        content: `## Dein Profil

Unter **Profil** kannst du deine Einstellungen verwalten:

### Persönliche Daten
- Name, E-Mail und Telefonnummer ändern
- Profilbild hochladen
- Adresse aktualisieren

### Steuerpflichtige Personen
Verwalte alle Personen, für die du Steuererklärungen einreichen möchtest:
- **Ehepartner/in** – für die gemeinsame Veranlagung
- **Kinder** – für Kinderzulagen und Kinderabzüge
- **Weitere Personen** – für Vollmachten

### Konto löschen
Unter **Profil → Konto löschen** kannst du dein Konto und alle Daten unwiderruflich löschen. Diese Aktion kann nicht rückgängig gemacht werden.`,
        keywords: ['profil', 'konto', 'einstellungen', 'steuerpflichtig', 'person', 'löschen'],
      },
      {
        id: 'faq',
        icon: HelpCircle,
        title: 'Häufige Fragen',
        content: `## Häufige Fragen

### Wer erstellt meine Steuererklärung?
Deine Steuererklärung wird von **eidgenössisch diplomierten Treuhändern** erstellt – keine Software, echte Experten.

### Wie lange dauert die Bearbeitung?
- **Standard-Service**: ca. 60 Arbeitstage
- **Express-Service**: ca. 10 Arbeitstage

### Kann ich Daten aus dem Vorjahr übernehmen?
Ja! Wenn du Ditax bereits letztes Jahr genutzt hast, werden deine Daten automatisch vorausgefüllt.

### Was passiert, wenn mir Dokumente fehlen?
Kein Stress – unsere Treuhänder benachrichtigen dich über die App und du kannst fehlende Dokumente einfach nachreichen.

### Ist Ditax für alle Kantone verfügbar?
Kontaktiere uns für Details zur Verfügbarkeit in deinem Kanton.

### Wie erreiche ich den Support?
Nutze den **Chat** in der App oder schreibe uns eine E-Mail – wir helfen dir gerne.`,
        keywords: ['faq', 'fragen', 'hilfe', 'support', 'kontakt', 'dauer', 'vorjahr'],
      },
    ],
  },
];

// Flatten all articles for search
export const getAllArticles = (): (DocsArticle & { categoryTitle: string; categoryId: string })[] => {
  return docsCategories.flatMap(cat =>
    cat.articles.map(article => ({
      ...article,
      categoryTitle: cat.title,
      categoryId: cat.id,
    }))
  );
};

// Build the full documentation text for the chatbot system prompt
export const getFullDocsText = (): string => {
  return docsCategories
    .map(cat => {
      const articles = cat.articles.map(a => `### ${a.title}\n${a.content}`).join('\n\n');
      return `## ${cat.title}\n${cat.description}\n\n${articles}`;
    })
    .join('\n\n---\n\n');
};
