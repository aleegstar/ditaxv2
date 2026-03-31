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
        subtitle: 'In wenigen Minuten startklar – sicher und unkompliziert.',
        content: `## Konto erstellen

Die Registrierung dauert weniger als 2 Minuten:

1. Öffne die Ditax App
2. Tippe auf **«Konto erstellen»**
3. Gib deine E-Mail-Adresse ein und wähle ein Passwort
4. Bestätige deine E-Mail über den zugesendeten Link
5. Fertig – du kannst dich jetzt einloggen

> **Tipp:** Verwende deine alltägliche E-Mail-Adresse. Darüber erhältst du alle Updates zu deiner Steuererklärung.

## Anmelden

Melde dich mit E-Mail und Passwort an. Optional kannst du **Passkeys** aktivieren – dann reicht Face ID oder Touch ID zum Einloggen.

## Passwort vergessen?

Tippe auf **«Passwort vergessen»** auf dem Login-Bildschirm. Du erhältst eine E-Mail mit einem Link zum Zurücksetzen.`,
        keywords: ['registrierung', 'login', 'anmelden', 'konto', 'passwort', 'email', 'passkey', '2fa'],
      },
      {
        id: 'create-tax-year',
        icon: CalendarPlus,
        title: 'Steuerjahr anlegen',
        subtitle: 'Starte dein Steuerjahr und wähle zwischen Standard und Express.',
        content: `## Dein erstes Steuerjahr starten

Nach dem Login landest du auf dem Dashboard – dem Herzstück der App. Hier siehst du alle deine Steuerjahre auf einen Blick.

1. Tippe auf **«Steuerjahr hinzufügen»**
2. Wähle das gewünschte Jahr (z.B. 2025)
3. Entscheide dich zwischen **Express** oder **Standard**
4. Dein Steuerjahr ist bereit – du kannst sofort loslegen

> **Tipp:** Mit dem **Express-Service** (ca. 10 Arbeitstage) bekommst du deine Steuererklärung deutlich schneller zurück. Ideal, wenn die Frist näher rückt.

## Für die ganze Familie

Du kannst die Steuererklärung auch für deinen **Ehepartner/in** oder deine **Kinder** einreichen. Füge sie einfach unter **Profil → Steuerpflichtige Personen** hinzu. Bei verheirateten Paaren wird automatisch eine gemeinsame Veranlagung erstellt.

## Mehrere Jahre gleichzeitig

Musst du noch Steuererklärungen aus Vorjahren nachreichen? Kein Problem – lege einfach mehrere Steuerjahre an. Jedes wird separat auf dem Dashboard angezeigt und kann unabhängig bearbeitet werden.`,
        keywords: ['steuerjahr', 'anlegen', 'hinzufügen', 'dashboard', 'express', 'standard', 'familie'],
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
        subtitle: 'Deine Grunddaten – einmal ausfüllen, bei Wiederkehr automatisch übernommen.',
        content: `## Was wird abgefragt?

Im ersten Schritt gibst du deine persönlichen Daten ein. Der Assistent führt dich mit einfachen Fragen durch den Prozess:

- **Name und Vorname**
- **Geburtsdatum**
- **Adresse** (Strasse, PLZ, Ort)
- **AHV-Nummer**
- **Zivilstand und Konfession**

Der Assistent stellt dir die Fragen Schritt für Schritt – du beantwortest sie einfach nacheinander. So ist sichergestellt, dass nichts vergessen geht.

## Daten aus dem Vorjahr

Hast du Ditax schon letztes Jahr genutzt? Dann sind deine persönlichen Angaben bereits vorausgefüllt. Du musst nur noch prüfen, ob sich etwas geändert hat – z.B. ein Umzug oder eine Heirat.

> **Tipp:** Halte deinen Lohnausweis und deine AHV-Nummer bereit, bevor du loslegst. So geht es am schnellsten.`,
        keywords: ['persönlich', 'angaben', 'name', 'adresse', 'ahv', 'zivilstand'],
      },
      {
        id: 'income',
        icon: Wallet,
        title: 'Einkommen erfassen',
        subtitle: 'Lohn, Nebeneinkünfte, Renten – alles an einem Ort.',
        content: `## Welche Einkommen gehören hierhin?

Gib alle Einkommensquellen des Steuerjahres an:

- **Lohn** aus Anstellung
- **Nebeneinkünfte** (z.B. Freelancing, Vermietung)
- **Renten und Pensionen** (AHV, Pensionskasse)
- **Taggelder** (Arbeitslosigkeit, Krankentaggeld)
- **Wertschriftenertrag** (Dividenden, Zinsen)

## Lohnausweis hochladen

Lade deinen **Lohnausweis als PDF** hoch – Ditax erkennt die wichtigsten Angaben automatisch und füllt die Felder für dich aus. Das spart Zeit und verhindert Tippfehler.

## Mehrere Arbeitgeber

Hast du den Job gewechselt oder mehrere Arbeitgeber? Erfasse jeden Lohnausweis einzeln. Die App rechnet alles zusammen.

> **Tipp:** Auch kleine Nebeneinkünfte solltest du angeben. Unsere Experten können so alle legalen Abzüge optimal nutzen.`,
        keywords: ['einkommen', 'lohn', 'gehalt', 'rente', 'pension', 'lohnausweis', 'nebeneinkünfte', 'freelancer'],
      },
      {
        id: 'assets',
        icon: PiggyBank,
        title: 'Vermögen erfassen',
        subtitle: 'Bankkonten, Wertschriften, Immobilien – Stichtag 31.12.',
        content: `## Was zählt zum Vermögen?

Erfasse dein gesamtes Vermögen per **31. Dezember** des Steuerjahres:

- **Bankkonten** – Spar-, Privat-, Lohnkonto (Saldo per 31.12.)
- **Wertschriften** – Aktien, Fonds, ETFs, Obligationen
- **Immobilien** – Eigentumswohnungen, Häuser
- **Fahrzeuge** – Zeitwert per 31.12.
- **Kryptowährungen** – Marktwert per 31.12.
- **Lebensversicherungen** – Rückkaufswert

## Belege hochladen

Lade für jedes Konto den **Kontoauszug per 31.12.** hoch. Je vollständiger deine Belege, desto schneller die Bearbeitung.

## Schulden nicht vergessen

Hypotheken, Privatkredite und andere Schulden werden vom Vermögen abgezogen und senken deine Vermögenssteuer.

> **Tipp:** Die korrekten Bewertungen für Wertschriften und Kryptowährungen kennen unsere Experten – du musst nur die Bestände angeben.`,
        keywords: ['vermögen', 'bank', 'konto', 'wertschriften', 'aktien', 'immobilien', 'auto', 'krypto', 'schulden'],
      },
      {
        id: 'deductions',
        icon: Receipt,
        title: 'Abzüge erfassen',
        subtitle: 'Hier sparst du Steuern – unsere Experten maximieren jeden Abzug.',
        content: `## Welche Abzüge gibt es?

Abzüge senken dein steuerbares Einkommen. Je mehr du angibst, desto weniger Steuern zahlst du:

- **Berufsauslagen** – Arbeitsweg, Verpflegung, Homeoffice
- **Weiterbildung** – bis CHF 12'000 pro Jahr
- **Versicherungsprämien** – Krankenkasse, Unfall, Haftpflicht
- **Krankheitskosten** – Zahnarzt, Brille, Medikamente (über Selbstbehalt)
- **Säule 3a** – bis CHF 7'056 (Angestellte) bzw. CHF 35'280 (Selbständige)
- **Schuldzinsen** – Hypothekarzinsen
- **Spenden** – an steuerbefreite Organisationen (ab CHF 100)
- **Kinderbetreuung** – Krippe, Tagesmutter, Mittagstisch
- **Liegenschaftsunterhalt** – Reparaturen, Renovationen

## Belege bereithalten

Für jeden Abzug brauchst du einen Beleg. Lade die Nachweise direkt als Dokument hoch – so bist du bei einer Prüfung auf der sicheren Seite.

> **Beispiel:** Du hast CHF 7'056 in die Säule 3a einbezahlt? Damit sparst du je nach Kanton **CHF 1'500 bis 3'000** Steuern. Lade einfach die Bescheinigung hoch.`,
        keywords: ['abzüge', 'berufsauslagen', 'versicherung', 'krankenkasse', '3a', 'säule', 'spenden', 'schuldzinsen', 'homeoffice', 'kinderbetreuung'],
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
        id: 'document-collection',
        icon: Upload,
        title: 'Dokumentensammlung',
        subtitle: 'Sammle deine Dokumente flexibel – ordne sie später der Checkliste zu.',
        content: `## Dein zentraler Ablageort für alle Steuerunterlagen

Die Dokumentensammlung unter **«Dokumente»** ist dein persönlicher Sammelordner. Hier lädst du alle relevanten Unterlagen hoch – auch wenn du noch nicht genau weisst, wohin sie gehören. So geht garantiert kein Dokument verloren.

## So funktioniert es

1. Öffne den Bereich **«Dokumente»** über das Hauptmenü
2. Tippe auf das **«+»**-Symbol, um ein neues Dokument hochzuladen
3. Fotografiere das Dokument oder wähle eine Datei von deinem Gerät
4. Das Dokument wird sicher gespeichert und ist jederzeit abrufbar

> **Tipp:** Lade Dokumente hoch, sobald du sie erhältst – z.B. den Lohnausweis direkt nach Erhalt im Januar. So hast du am Ende alles beisammen.

## Dokumente der Checkliste zuordnen

Wenn du deine Steuererklärung ausfüllst, zeigt dir die **Dokumenten-Checkliste** genau, welche Belege benötigt werden. Du kannst dann:

- Bereits hochgeladene Dokumente aus der Sammlung **direkt zuordnen**
- Neue Dokumente hochladen und sie **sofort einer Kategorie zuweisen**
- Die **automatische Erkennung (OCR)** ordnet viele Dokumente von selbst zu

So trennst du das Sammeln vom Zuordnen – das macht den Prozess entspannter und flexibler.

## Suchen & Filtern

Nutze die **Suchfunktion** oben auf der Dokumenten-Seite, um ein bestimmtes Dokument schnell zu finden. Alle Dokumente werden mit Datum und Dateiname angezeigt, sodass du immer den Überblick behältst.

## Vorschau & Löschen

Tippe auf ein Dokument, um eine **Vorschau** zu öffnen. Von dort aus kannst du es herunterladen oder bei Bedarf löschen. Gelöschte Dokumente werden endgültig entfernt und können nicht wiederhergestellt werden.

> **Wichtig:** Dokumente, die bereits der Checkliste zugewiesen sind, solltest du nur löschen, wenn du sie durch eine aktuellere Version ersetzt.`,
        keywords: ['dokumente', 'sammlung', 'ablage', 'hochladen', 'zuordnen', 'checkliste', 'collection', 'documents'],
      },
      {
        id: 'document-checklist',
        icon: ClipboardCheck,
        title: 'Dokumenten-Checkliste',
        subtitle: 'Die Checkliste zeigt dir genau, was noch fehlt – nichts wird vergessen.',
        content: `## Alles im Blick mit der Checkliste

Die intelligente Checkliste analysiert deine Angaben und zeigt dir genau, welche Dokumente du noch brauchst. So stellst du sicher, dass deine Steuererklärung vollständig ist.

### Typische Dokumente

- **Lohnausweis** – erhältst du von deinem Arbeitgeber (meist im Januar/Februar)
- **Bankbelege** – Kontoauszüge per 31.12. (Saldo-Bestätigung)
- **Wertschriftenverzeichnis** – Depotauszug von deiner Bank
- **Krankenkassenprämie** – Jahresabrechnung deiner Versicherung
- **Säule 3a Bescheinigung** – von deiner Vorsorgeeinrichtung oder Bank
- **Nebenkostenabrechnung** – bei Liegenschaftsbesitz
- **Spendenbescheinigungen** – für Spenden über CHF 100

> **Tipp:** Die meisten Dokumente erhältst du zwischen Januar und März. Lade sie hoch, sobald sie verfügbar sind – so geht nichts verloren.

## Status auf einen Blick

Jedes Dokument in der Checkliste zeigt dir seinen Status:

- 🔴 **Fehlend** – muss noch hochgeladen werden
- 🟡 **Hochgeladen** – wurde erkannt und zugeordnet
- 🟢 **Zugewiesen** – alles in Ordnung, Dokument ist bereit

Die Checkliste aktualisiert sich automatisch, sobald du ein neues Dokument hochlädst.`,
        keywords: ['checkliste', 'dokumente', 'lohnausweis', 'bankbeleg', 'krankenkasse', 'status'],
      },
      {
        id: 'upload-methods',
        icon: ScanLine,
        title: 'Hochladen & Scannen',
        subtitle: 'Fotografiere oder lade Dokumente hoch – die App erkennt den Rest.',
        content: `## So lädst du Dokumente hoch

Die Ditax App macht den Dokumenten-Upload so einfach wie möglich. Du hast mehrere Optionen:

## Foto aufnehmen

Fotografiere dein Dokument direkt mit der Smartphone-Kamera. Die App optimiert das Bild automatisch – Kontrast, Ausrichtung und Lesbarkeit werden verbessert.

> **Tipp:** Fotografiere bei guten Lichtverhältnissen und lege das Dokument auf eine dunkle Unterlage für den besten Kontrast.

## Datei auswählen

Wähle eine bereits vorhandene Datei von deinem Gerät – ideal für PDFs, die du per E-Mail erhalten hast (z.B. digitaler Lohnausweis).

## Automatische Erkennung (OCR)

Nach dem Upload analysiert Ditax dein Dokument automatisch:

1. Der **Dokumententyp** wird erkannt (z.B. Lohnausweis, Kontoauszug)
2. Das Dokument wird der **richtigen Kategorie** zugeordnet
3. Wichtige **Daten werden extrahiert** und in die Formulare übernommen

Diese intelligente Erkennung spart dir manuelle Eingaben und reduziert Fehler.

## Unterstützte Formate

**PDF** (empfohlen), JPG, PNG, HEIC, DOC, XLS, CSV, ZIP und TXT – maximal 10 MB pro Datei. PDFs bieten die beste Qualität für die automatische Texterkennung.`,
        keywords: ['upload', 'hochladen', 'foto', 'kamera', 'scan', 'ocr', 'pdf', 'datei', 'erkennung'],
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
        subtitle: 'Alle Angaben gemacht? Dann ab damit – wir übernehmen den Rest.',
        content: `## Steuererklärung einreichen

Wenn alle Angaben erfasst und Dokumente hochgeladen sind, kannst du deine Steuererklärung mit wenigen Klicks einreichen:

1. Öffne dein Steuerjahr auf dem Dashboard
2. Überprüfe den Fortschritt – alle Bereiche sollten auf **grün** stehen
3. Tippe auf **«Bezahlen & Einreichen»**
4. Wähle deine Zahlungsmethode (**TWINT** oder **Kreditkarte**)
5. Nach erfolgreicher Bezahlung übernehmen unsere Steuerexperten

> **Gut zu wissen:** Du kannst deine Angaben auch nach dem Einreichen noch ergänzen, falls unsere Experten Rückfragen haben. Du wirst dazu per Push-Nachricht und E-Mail benachrichtigt.

## Was passiert nach der Einreichung?

Unsere **eidgenössisch diplomierten Treuhänder** nehmen sich deine Steuererklärung vor:

1. **Vollständigkeitsprüfung** – Sind alle Angaben und Belege da?
2. **Optimierung** – Alle zulässigen Abzüge werden geprüft und maximiert
3. **Erstellung** – Die offizielle Steuererklärung wird erstellt
4. **Qualitätskontrolle** – Ein zweiter Experte prüft das Ergebnis
5. **Zustellung** – Du erhältst die fertige Steuererklärung in der App`,
        keywords: ['einreichen', 'abschicken', 'bezahlen', 'submit', 'fertig', 'treuhänder'],
      },
      {
        id: 'status',
        icon: BarChart3,
        title: 'Status verfolgen',
        subtitle: 'Jederzeit wissen, wo deine Steuererklärung steht.',
        content: `## Immer wissen, wo du stehst

Das Tracking auf deinem Dashboard zeigt dir in Echtzeit den Fortschritt deiner Steuererklärung. Du weisst immer genau, in welchem Schritt sich deine Erklärung befindet:

### Die einzelnen Schritte

1. **Daten eingereicht** – Deine Angaben und Dokumente sind bei uns eingegangen
2. **Unterlagen erhalten** – Alle erforderlichen Dokumente sind vollständig
3. **Zahlung bestätigt** – Deine Zahlung wurde erfolgreich verarbeitet
4. **In Bearbeitung** – Unsere Treuhänder arbeiten an deiner Steuererklärung
5. **Qualitätsprüfung** – Ein zweiter Experte prüft das Ergebnis
6. **Zustellung** – Deine fertige Steuererklärung wird dir zugestellt

> **Bearbeitungszeiten:** Standard-Service ca. 40–90 Arbeitstage, Express-Service ca. 10 Arbeitstage.

## Benachrichtigungen

Du wirst bei jeder Statusänderung automatisch benachrichtigt – per **Push-Nachricht** und **E-Mail**. So verpasst du nichts und musst nicht ständig in die App schauen.

## Fehlende Unterlagen

Falls unsere Experten noch etwas von dir brauchen, wirst du direkt in der App benachrichtigt. Du kannst fehlende Dokumente einfach nachreichen.`,
        keywords: ['status', 'fortschritt', 'bearbeitung', 'fertig', 'benachrichtigung', 'tracking'],
      },
      {
        id: 'completed',
        icon: FileCheck,
        title: 'Fertige Steuererklärung',
        subtitle: 'Prüfen, unterschreiben, einreichen – alles digital.',
        content: `## Deine Steuererklärung ist fertig

Sobald unsere Experten fertig sind, wirst du per Push-Nachricht und E-Mail benachrichtigt. So geht es weiter:

1. Öffne die fertige Steuererklärung auf dem Dashboard
2. **Prüfe** das erstellte PDF – alle Angaben im Überblick
3. **Unterschreibe digital** – rechtsgültig und unkompliziert
4. Die Steuererklärung wird **beim Steueramt eingereicht**

> **Gut zu wissen:** Die digitale Unterschrift ist in allen Kantonen rechtsgültig. Du musst nichts ausdrucken oder per Post versenden.

## Download & Archiv

Du kannst deine fertige Steuererklärung jederzeit als **PDF herunterladen** und auf deinem Gerät speichern. Alle Steuererklärungen bleiben auch in der App gespeichert – du hast jederzeit Zugriff auf vergangene Jahre.

## Einspruch bei der Veranlagung

Nicht einverstanden mit der definitiven Veranlagung des Steueramts? Über die App kannst du einen **Einspruch** einleiten. Lade die definitive Veranlagung hoch, und unsere Experten prüfen, ob ein Einspruch sinnvoll ist.`,
        keywords: ['fertig', 'download', 'unterschrift', 'signatur', 'pdf', 'einspruch', 'veranlagung'],
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
        subtitle: 'Transparente Preise ohne versteckte Kosten.',
        content: `## Transparente Preise

Bei Ditax zahlst du einen fairen Preis für eine professionelle Steuererklärung – erstellt von echten Experten, nicht von einer Software.

### Standard-Service

- **Ab CHF 150** pro Steuererklärung
- Bearbeitungszeit: **ca. 40–90 Arbeitstage**
- Professionelle Erstellung durch zertifizierte Treuhänder
- Optimierung aller Abzüge inklusive

### Express-Service

- **Aufpreis je nach Komplexität**
- Bearbeitungszeit: **ca. 10 Arbeitstage**
- Prioritäre Bearbeitung durch unser Expertenteam
- Ideal wenn die Frist drängt

> **Tipp:** Der Express-Service lohnt sich besonders, wenn du deine Steuererklärung schnell brauchst – z.B. weil die Einreichfrist näher rückt oder du eine Rückerstattung erwartest.

### Im Preis enthalten

- ✅ Professionelle Steuererklärung durch Treuhänder mit eidg. Fachausweis
- ✅ Maximale Optimierung aller Abzüge
- ✅ Digitale Einreichung beim Steueramt
- ✅ Unterstützung bei Rückfragen des Steueramts
- ✅ Sichere digitale Aufbewahrung deiner Dokumente
- ✅ Zugang zu deiner Steuererklärung in der App`,
        keywords: ['preis', 'kosten', 'express', 'standard', 'service', 'chf', 'treuhänder'],
      },
      {
        id: 'payment-methods',
        icon: CardIcon,
        title: 'Zahlungsmethoden',
        subtitle: 'Bezahle bequem mit TWINT oder Kreditkarte.',
        content: `## Bequem und sicher bezahlen

Ditax bietet dir die gängigsten Zahlungsmethoden der Schweiz:

## TWINT

Bezahle schnell und einfach mit **TWINT** – der beliebtesten Zahlungsmethode der Schweiz. Scanne den QR-Code oder nutze die direkte App-Integration. Die Zahlung wird sofort bestätigt.

## Kreditkarte

**Visa**, **Mastercard** und weitere Karten werden akzeptiert. Die Abwicklung erfolgt über **Stripe** – einen der weltweit sichersten Zahlungsdienstleister.

## Zahlungssicherheit

Alle Zahlungen werden **verschlüsselt** und über zertifizierte Zahlungsanbieter abgewickelt. Ditax speichert keine Kreditkartendaten – deine Zahlungsinformationen sind zu jeder Zeit geschützt.

> **Gut zu wissen:** Nach erfolgreicher Zahlung erhältst du eine Bestätigung per E-Mail und in der App. Die Bearbeitung deiner Steuererklärung startet sofort.`,
        keywords: ['zahlung', 'bezahlen', 'twint', 'kreditkarte', 'visa', 'mastercard', 'stripe', 'sicher'],
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
        subtitle: 'Bankensichere Verschlüsselung für deine sensibelsten Daten.',
        content: `## Deine Daten sind sicher

Steuerdaten sind hochsensibel. Bei Ditax hat Datenschutz deshalb höchste Priorität:

- Alle Daten werden in der **Schweiz und/oder EU** gespeichert
- Vollständig **DSGVO-konform** und nach Schweizer Datenschutzgesetz (nDSG)
- Sensible Daten wie AHV-Nummer und Bankdaten sind zusätzlich verschlüsselt

## Dein Konto schützen

Für zusätzlichen Schutz empfehlen wir:

**Passkeys** – Logge dich per Face ID oder Touch ID ein, ohne Passwort. Schnell, sicher und komfortabel.

**Zwei-Faktor-Authentifizierung (2FA)** – Aktiviere unter Profil → Sicherheit einen zusätzlichen Code beim Login.

> **Tipp:** Aktiviere mindestens eine der beiden Optionen für den bestmöglichen Schutz.`,
        keywords: ['sicherheit', 'verschlüsselung', '2fa', 'passwort', 'datenschutz', 'dsgvo', 'passkey', 'ndsg'],
      },
      {
        id: 'profile',
        icon: UserCog,
        title: 'Profil verwalten',
        subtitle: 'Deine Einstellungen, steuerpflichtige Personen und mehr.',
        content: `## Dein Profil

Unter **Profil** verwaltest du deine persönlichen Einstellungen und Kontodetails.

## Persönliche Daten

- Name, E-Mail und Telefonnummer ändern
- Profilbild hochladen
- Adresse aktualisieren

## Steuerpflichtige Personen

Hier verwaltest du alle Personen, für die du Steuererklärungen einreichst:

- **Ehepartner/in** – für die gemeinsame Veranlagung (bei Verheirateten Pflicht)
- **Kinder** – für Kinderzulagen und Kinderabzüge
- **Weitere Personen** – z.B. mit Vollmacht

> **Tipp:** Füge steuerpflichtige Personen am besten **vor** dem Anlegen des Steuerjahres hinzu, damit die Formulare direkt korrekt vorbereitet werden.

## Benachrichtigungen

Stelle ein, wie du über Statusänderungen informiert werden möchtest – per Push-Nachricht, E-Mail oder beides.

## Konto löschen

Unter **Profil → Konto löschen** kannst du dein Konto und alle zugehörigen Daten unwiderruflich löschen. Diese Aktion kann nicht rückgängig gemacht werden. Offene Steuererklärungen müssen vorher abgeschlossen sein.`,
        keywords: ['profil', 'konto', 'einstellungen', 'steuerpflichtig', 'person', 'löschen', 'benachrichtigung'],
      },
      {
        id: 'faq',
        icon: HelpCircle,
        title: 'Häufige Fragen',
        subtitle: 'Antworten auf die wichtigsten Fragen rund um Ditax.',
        content: `## Häufige Fragen

### Wer erstellt meine Steuererklärung?

Deine Steuererklärung wird von **eidgenössisch diplomierten Treuhändern** (Treuhänder mit eidg. Fachausweis) erstellt – keine automatisierte Software-Lösung, sondern echte Experten, die deine Situation individuell beurteilen.

### Wie lange dauert die Bearbeitung?

- **Standard-Service**: ca. 40–90 Arbeitstage
- **Express-Service**: ca. 10 Arbeitstage

Die Bearbeitungszeit beginnt nach vollständiger Einreichung aller Angaben und Dokumente.

### Kann ich Daten aus dem Vorjahr übernehmen?

Ja! Wenn du Ditax bereits genutzt hast, werden deine persönlichen Daten automatisch vorausgefüllt. Du musst nur prüfen, ob sich etwas geändert hat, und die neuen Jahresdaten ergänzen.

### Was passiert, wenn mir Dokumente fehlen?

Kein Stress – starte trotzdem mit der Erfassung. Fehlende Dokumente kannst du jederzeit nachreichen. Falls unsere Experten etwas vermissen, wirst du direkt in der App benachrichtigt.

### Ist Ditax für alle Kantone verfügbar?

Ditax ist für die meisten Schweizer Kantone verfügbar. Kontaktiere uns für Details zur Verfügbarkeit in deinem Kanton.

### Wie erreiche ich den Support?

Nutze den **Chat** in der App oder schreibe uns eine E-Mail. Unser Support-Team antwortet in der Regel innerhalb eines Arbeitstages. Für schnelle Antworten zu allgemeinen Fragen kannst du auch unseren **KI-Assistenten** auf dieser Seite nutzen.

### Was kostet Ditax?

Ab **CHF 150** pro Steuererklärung. Der genaue Preis hängt von der Komplexität deiner Steuersituation ab. Es gibt keine versteckten Kosten – der Preis wird dir vor der Bezahlung transparent angezeigt.`,
        keywords: ['faq', 'fragen', 'hilfe', 'support', 'kontakt', 'dauer', 'vorjahr', 'kosten', 'kanton'],
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
