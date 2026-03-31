import { BookOpen, FileText, Upload, CheckCircle, CreditCard, Shield } from 'lucide-react';

export interface DocsArticle {
  id: string;
  title: string;
  content: string;
  keywords: string[];
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
    description: 'Registrierung, Login und Steuerjahr anlegen',
    icon: BookOpen,
    articles: [
      {
        id: 'registration',
        title: 'Registrierung & Login',
        content: `## Registrierung

So erstellst du dein DiTax-Konto:

1. Öffne die DiTax-App oder besuche die Website
2. Tippe auf **"Konto erstellen"**
3. Gib deine E-Mail-Adresse ein und wähle ein sicheres Passwort
4. Bestätige deine E-Mail-Adresse über den Link in der Bestätigungsmail
5. Melde dich mit deinen Zugangsdaten an

### Login

Nach der Registrierung kannst du dich jederzeit mit deiner E-Mail und deinem Passwort anmelden. Optional kannst du auch **Passkeys** oder **Zwei-Faktor-Authentifizierung (2FA)** einrichten für zusätzliche Sicherheit.

### Passwort vergessen?

Falls du dein Passwort vergessen hast, tippe auf dem Login-Bildschirm auf **"Passwort vergessen"** und folge den Anweisungen in der E-Mail.`,
        keywords: ['registrierung', 'login', 'anmelden', 'konto', 'passwort', 'email'],
      },
      {
        id: 'create-tax-year',
        title: 'Steuerjahr anlegen',
        content: `## Steuerjahr anlegen

Nach dem Login siehst du das Dashboard. Um mit deiner Steuererklärung zu beginnen:

1. Tippe auf **"Steuerjahr hinzufügen"** auf dem Dashboard
2. Wähle das gewünschte Steuerjahr aus (z.B. 2024)
3. Wähle ob du den **Express-Service** (10 Arbeitstage) oder den **Standard-Service** (60 Arbeitstage) möchtest
4. Dein Steuerjahr wird erstellt und du kannst mit der Erfassung beginnen

### Mehrere Steuerjahre

Du kannst mehrere Steuerjahre gleichzeitig bearbeiten. Jedes Steuerjahr wird als eigene Karte auf dem Dashboard angezeigt.

### Steuerpflichtige Personen

Falls du die Steuererklärung auch für andere Personen einreichen möchtest (z.B. Ehepartner, Kinder), kannst du unter **Profil → Steuerpflichtige Personen** weitere Personen hinzufügen.`,
        keywords: ['steuerjahr', 'anlegen', 'hinzufügen', 'dashboard', 'express', 'standard'],
      },
    ],
  },
  {
    id: 'data-entry',
    title: 'Angaben erfassen',
    description: 'Persönliche Daten, Einkommen, Vermögen & Abzüge',
    icon: FileText,
    articles: [
      {
        id: 'personal-data',
        title: 'Persönliche Angaben',
        content: `## Persönliche Angaben

Im ersten Schritt erfasst du deine persönlichen Daten:

- **Name und Vorname**
- **Geburtsdatum**
- **Adresse** (Strasse, PLZ, Ort)
- **AHV-Nummer** (wird verschlüsselt gespeichert)
- **Zivilstand**
- **Konfession**

### Ja/Nein-Modus vs. Experten-Modus

Du kannst zwischen zwei Erfassungsmodi wählen:

- **Ja/Nein-Modus**: Einfache Fragen die mit Ja oder Nein beantwortet werden – ideal für Einsteiger
- **Experten-Modus**: Direktes Formular mit allen Feldern – für erfahrene Nutzer

Du kannst jederzeit zwischen den Modi wechseln über den Button oben rechts im Formular.`,
        keywords: ['persönlich', 'angaben', 'name', 'adresse', 'ahv', 'zivilstand'],
      },
      {
        id: 'income',
        title: 'Einkommen erfassen',
        content: `## Einkommen erfassen

Im Bereich Einkommen gibst du alle Einkommensquellen an:

- **Lohn aus unselbständiger Erwerbstätigkeit** (gemäss Lohnausweis)
- **Einkommen aus selbständiger Erwerbstätigkeit**
- **Nebeneinkünfte**
- **Renten und Pensionen** (AHV, IV, Pensionskasse)
- **Taggelder** (ALV, KTG, Unfallversicherung)
- **Mieteinnahmen**
- **Wertschriftenertrag** (Dividenden, Zinsen)

### Lohnausweis

Falls du einen Lohnausweis hast, kannst du diesen als Dokument hochladen. Die wichtigsten Daten werden automatisch erkannt (OCR).

### Mehrere Arbeitgeber

Falls du bei mehreren Arbeitgebern beschäftigt warst, erfasse jeden Lohnausweis einzeln.`,
        keywords: ['einkommen', 'lohn', 'gehalt', 'rente', 'pension', 'lohnausweis', 'nebeneinkünfte'],
      },
      {
        id: 'assets',
        title: 'Vermögen erfassen',
        content: `## Vermögen erfassen

Im Bereich Vermögen gibst du dein gesamtes Vermögen per 31. Dezember an:

- **Bankkonten** (Spar-, Privat-, Lohnkonto)
- **Wertschriften** (Aktien, Obligationen, Fonds)
- **Immobilien** (Eigentumswohnungen, Häuser)
- **Fahrzeuge** (Auto, Motorrad)
- **Lebensversicherungen** (Rückkaufswert)
- **Kryptowährungen**
- **Bargeld und übrige Vermögenswerte**

### Bankbelege

Für jeden Kontostand solltest du einen Bankbeleg (Kontoauszug per 31.12.) als Dokument hochladen.`,
        keywords: ['vermögen', 'bank', 'konto', 'wertschriften', 'aktien', 'immobilien', 'auto'],
      },
      {
        id: 'deductions',
        title: 'Abzüge erfassen',
        content: `## Abzüge erfassen

Hier kannst du alle steuerlich abzugsfähigen Ausgaben angeben:

- **Berufsauslagen** (Fahrkosten, Verpflegung, Berufskleidung)
- **Weiterbildungskosten**
- **Versicherungsprämien** (Krankenkasse, Unfallversicherung)
- **Krankheitskosten** (über dem Selbstbehalt)
- **Säule 3a Einzahlungen**
- **Schuldzinsen**
- **Spenden** (an gemeinnützige Organisationen)
- **Kinderbetreuungskosten**
- **Liegenschaftsunterhalt**

### Belege aufbewahren

Für alle Abzüge solltest du die entsprechenden Belege hochladen. Bei einer Überprüfung durch das Steueramt müssen die Abzüge nachgewiesen werden können.`,
        keywords: ['abzüge', 'berufsauslagen', 'versicherung', 'krankenkasse', '3a', 'säule', 'spenden', 'schuldzinsen'],
      },
    ],
  },
  {
    id: 'documents',
    title: 'Dokumente hochladen',
    description: 'Checkliste, Upload-Methoden & OCR-Scan',
    icon: Upload,
    articles: [
      {
        id: 'document-checklist',
        title: 'Dokumenten-Checkliste',
        content: `## Dokumenten-Checkliste

Die Checkliste zeigt dir alle Dokumente die du für deine Steuererklärung benötigst:

- ✅ **Lohnausweis** – Von deinem Arbeitgeber
- ✅ **Bankbelege** – Kontoauszüge per 31.12.
- ✅ **Wertschriftenverzeichnis** – Von der Bank
- ✅ **Krankenkassenprämie** – Jahresabrechnung
- ✅ **Säule 3a Bescheinigung** – Von der Vorsorgeeinrichtung
- ✅ **Nebenkostenabrechnung** – Bei Liegenschaftsbesitz
- ✅ **Spendenbescheinigungen** – Bei Spenden über CHF 100

### Status

Jedes Dokument hat einen Status:
- 🔴 **Fehlend** – Noch nicht hochgeladen
- 🟡 **Hochgeladen** – Noch nicht zugewiesen
- 🟢 **Zugewiesen** – Erfolgreich verarbeitet`,
        keywords: ['checkliste', 'dokumente', 'lohnausweis', 'bankbeleg', 'krankenkasse'],
      },
      {
        id: 'upload-methods',
        title: 'Upload-Methoden',
        content: `## Dokumente hochladen

Es gibt mehrere Wege, Dokumente hochzuladen:

### 📸 Foto aufnehmen
Nutze die Kamera deines Smartphones um Dokumente direkt abzufotografieren. Die App optimiert das Bild automatisch.

### 📁 Datei auswählen
Wähle PDF-, JPG- oder PNG-Dateien von deinem Gerät aus. Maximal 10 MB pro Datei.

### 🔍 OCR-Scan (automatische Texterkennung)
Nach dem Upload werden deine Dokumente automatisch analysiert:
- Der **Dokumententyp** wird erkannt (z.B. Lohnausweis, Bankbeleg)
- Das Dokument wird der **passenden Kategorie** zugeordnet
- Relevante **Daten werden extrahiert** und vorausgefüllt

### Unterstützte Formate
- PDF (empfohlen)
- JPG / JPEG
- PNG
- HEIC (iPhone-Fotos)`,
        keywords: ['upload', 'hochladen', 'foto', 'kamera', 'scan', 'ocr', 'pdf', 'datei'],
      },
    ],
  },
  {
    id: 'tax-return',
    title: 'Steuererklärung',
    description: 'Einreichen, Status verfolgen & Download',
    icon: CheckCircle,
    articles: [
      {
        id: 'submit',
        title: 'Steuererklärung einreichen',
        content: `## Steuererklärung einreichen

Wenn du alle Angaben erfasst und Dokumente hochgeladen hast:

1. Gehe zum **Dashboard** und tippe auf dein Steuerjahr
2. Überprüfe den Fortschritt – alle Bereiche sollten abgeschlossen sein
3. Tippe auf **"Bezahlen & Einreichen"**
4. Wähle deine Zahlungsmethode (TWINT oder Kreditkarte)
5. Nach der Bezahlung wird deine Steuererklärung an unsere Treuhänder übermittelt

### Was passiert nach dem Einreichen?

Unsere eidgenössisch diplomierten Treuhänder prüfen deine Angaben, optimieren deine Steuererklärung und erstellen die offizielle Steuererklärung. Du wirst benachrichtigt sobald sie fertig ist.`,
        keywords: ['einreichen', 'abschicken', 'bezahlen', 'submit', 'fertig'],
      },
      {
        id: 'status',
        title: 'Status verfolgen',
        content: `## Status deiner Steuererklärung

Auf dem Dashboard siehst du jederzeit den aktuellen Status:

- **Erfassung** – Du bist noch bei der Dateneingabe
- **Dokumente** – Dokumente werden noch benötigt
- **Eingereicht** – Die Steuererklärung wurde bezahlt und eingereicht
- **In Bearbeitung** – Unsere Treuhänder arbeiten daran
- **Fehlende Unterlagen** – Wir benötigen weitere Informationen von dir
- **Fertig** – Deine Steuererklärung ist bereit zum Download

### Benachrichtigungen

Du erhältst Push-Benachrichtigungen und E-Mails bei Statusänderungen.`,
        keywords: ['status', 'fortschritt', 'bearbeitung', 'fertig', 'benachrichtigung'],
      },
      {
        id: 'completed',
        title: 'Fertige Steuererklärung',
        content: `## Fertige Steuererklärung

Wenn deine Steuererklärung fertig ist:

1. Du erhältst eine **Benachrichtigung**
2. Öffne die Steuererklärung auf dem Dashboard
3. Prüfe die erstellte Steuererklärung als **PDF**
4. **Unterschreibe digital** die Steuererklärung
5. Die Steuererklärung wird beim Steueramt eingereicht

### Download

Du kannst die fertige Steuererklärung als PDF herunterladen und für deine Unterlagen speichern.

### Einspruch

Falls du mit der Veranlagung nicht einverstanden bist, kannst du über die App einen **Einspruch** erstellen. Wir unterstützen dich dabei.`,
        keywords: ['fertig', 'download', 'unterschrift', 'signatur', 'pdf', 'einspruch'],
      },
    ],
  },
  {
    id: 'payment',
    title: 'Bezahlung',
    description: 'Preise, Express-Service & Zahlungsmethoden',
    icon: CreditCard,
    articles: [
      {
        id: 'pricing',
        title: 'Preise & Services',
        content: `## Preise

### Standard-Service
- **Ab CHF 150** pro Steuererklärung
- Bearbeitungszeit: **ca. 60 Arbeitstage**
- Professionelle Erstellung durch Treuhänder

### Express-Service
- **Aufpreis je nach Komplexität**
- Bearbeitungszeit: **ca. 10 Arbeitstage**
- Prioritäre Bearbeitung

### Was ist im Preis enthalten?
- ✅ Professionelle Steuererklärung
- ✅ Optimierung deiner Steuerbelastung
- ✅ Digitale Einreichung beim Steueramt
- ✅ Support bei Rückfragen des Steueramts
- ✅ Sichere digitale Aufbewahrung`,
        keywords: ['preis', 'kosten', 'express', 'standard', 'service', 'chf'],
      },
      {
        id: 'payment-methods',
        title: 'Zahlungsmethoden',
        content: `## Zahlungsmethoden

Folgende Zahlungsmethoden stehen zur Verfügung:

### TWINT
Bezahle bequem mit TWINT – scanne einfach den QR-Code oder nutze die direkte TWINT-Integration.

### Kreditkarte
Visa, Mastercard und weitere Kreditkarten werden akzeptiert. Die Zahlung wird sicher über **Stripe** abgewickelt.

### Sicherheit
Alle Zahlungen werden über verschlüsselte Verbindungen abgewickelt. DiTax speichert keine Kreditkartendaten.`,
        keywords: ['zahlung', 'bezahlen', 'twint', 'kreditkarte', 'visa', 'mastercard', 'stripe'],
      },
    ],
  },
  {
    id: 'security-account',
    title: 'Sicherheit & Konto',
    description: 'Verschlüsselung, 2FA & Profil verwalten',
    icon: Shield,
    articles: [
      {
        id: 'security',
        title: 'Datensicherheit',
        content: `## Datensicherheit

DiTax nimmt den Schutz deiner Daten sehr ernst:

### Verschlüsselung
- **Ende-zu-Ende-Verschlüsselung** für sensible Daten (AHV-Nummer, Bankdaten)
- **TLS/SSL** für alle Datenübertragungen
- **Verschlüsselung at rest** für gespeicherte Dokumente

### Datenspeicherort
- Alle Daten werden in der **Schweiz und/oder EU** gespeichert
- **DSGVO-konform**
- Regelmässige Sicherheitsaudits

### Zwei-Faktor-Authentifizierung (2FA)
Aktiviere 2FA unter **Profil → Sicherheit** für zusätzlichen Schutz. Du benötigst dann bei jedem Login einen Code aus deiner Authenticator-App.

### Passkeys
Noch sicherer und bequemer: Nutze **Passkeys** (Face ID, Touch ID, Windows Hello) zum Einloggen.`,
        keywords: ['sicherheit', 'verschlüsselung', '2fa', 'passwort', 'datenschutz', 'dsgvo', 'passkey'],
      },
      {
        id: 'profile',
        title: 'Profil verwalten',
        content: `## Profil verwalten

Unter **Profil** kannst du folgende Einstellungen vornehmen:

### Persönliche Daten
- Name, E-Mail, Telefonnummer ändern
- Profilbild hochladen
- Adresse aktualisieren

### Steuerpflichtige Personen
Füge weitere steuerpflichtige Personen hinzu:
- **Ehepartner/in** – Für gemeinsame Veranlagung
- **Kinder** – Für Kinderzulagen und Kinderabzüge
- **Weitere Personen** – Für Vollmachten

### Konto löschen
Unter **Profil → Konto löschen** kannst du dein Konto und alle zugehörigen Daten unwiderruflich löschen. Diese Aktion kann nicht rückgängig gemacht werden.`,
        keywords: ['profil', 'konto', 'einstellungen', 'steuerpflichtig', 'person', 'löschen'],
      },
      {
        id: 'faq',
        title: 'Häufige Fragen (FAQ)',
        content: `## Häufige Fragen

### Wer erstellt meine Steuererklärung?
Deine Steuererklärung wird von **Treuhändern mit eidgenössischem Fachausweis** erstellt. DiTax wurde von Sandro Graber gegründet.

### Wie lange dauert die Bearbeitung?
- **Standard-Service**: ca. 60 Arbeitstage
- **Express-Service**: ca. 10 Arbeitstage

### Kann ich meine Daten aus dem Vorjahr importieren?
Ja! Wenn du bereits letztes Jahr DiTax genutzt hast, werden deine Daten automatisch vorausgefüllt.

### Was passiert wenn mir Dokumente fehlen?
Unsere Treuhänder benachrichtigen dich über die App, falls Dokumente fehlen. Du kannst diese dann direkt nachreichen.

### Ist DiTax für alle Kantone verfügbar?
Kontaktiere uns für Details zur Verfügbarkeit in deinem Kanton.

### Wie kann ich den Support kontaktieren?
Nutze den **Chat** in der App oder schreibe uns eine E-Mail. Unser Support-Team hilft dir gerne weiter.`,
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
