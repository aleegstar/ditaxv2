import React, { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { cn } from '@/lib/utils';

type Section = {
  id: string;
  number: string;
  title: string;
  content: ReactNode;
};

const sections: Section[] = [
  {
    id: 'verantwortlicher',
    number: '1',
    title: 'Verantwortlicher und Inhalt dieser Datenschutzerklärung',
    content: (
      <>
        <p>
          Wir, <strong>Ditax by Graber Sandro</strong>, Lerchenweg 49, 4552 Derendingen, Schweiz
          (nachfolgend „Ditax", „wir" oder „uns"), sind die Betreiberin der Webseite{' '}
          <a href="https://ditax.ch">www.ditax.ch</a> sowie der Webapplikation{' '}
          <a href="https://app.ditax.ch">app.ditax.ch</a> (zusammen die „Plattform") und sind, soweit
          in dieser Datenschutzerklärung nicht anders angegeben, für die hier beschriebenen
          Datenbearbeitungen verantwortlich.
        </p>
        <p>
          Damit Sie wissen, welche Personendaten wir von Ihnen erheben und für welche Zwecke wir
          sie verwenden, nehmen Sie bitte die nachstehenden Informationen zur Kenntnis. Wir
          orientieren uns beim Datenschutz vorwiegend an den gesetzlichen Vorgaben des
          Schweizerischen Datenschutzrechts, insbesondere dem Bundesgesetz über den Datenschutz
          (<strong>DSG</strong>). Für Nutzerinnen und Nutzer mit Wohnsitz in der EU/EWR weisen wir
          ergänzend auf die einschlägigen Bestimmungen der Datenschutz-Grundverordnung
          (<strong>DSGVO</strong>) hin.
        </p>
        <p>
          Bitte beachten Sie, dass die nachfolgenden Informationen von Zeit zu Zeit überprüft und
          geändert werden. Wir empfehlen Ihnen daher, diese Datenschutzerklärung regelmässig
          einzusehen.
        </p>
      </>
    ),
  },
  {
    id: 'ansprechpartner',
    number: '2',
    title: 'Ansprechpartner für Datenschutz',
    content: (
      <>
        <p>
          Wenn Sie Fragen zum Datenschutz haben oder Ihre Rechte ausüben möchten, wenden Sie sich
          bitte an unseren Ansprechpartner für Datenschutz:
        </p>
        <p>
          Ditax by Graber Sandro<br />
          Lerchenweg 49<br />
          4552 Derendingen<br />
          Schweiz<br />
          E-Mail: <a href="mailto:privacy@ditax.ch">privacy@ditax.ch</a><br />
          Interner Datenschutzverantwortlicher:{' '}
          <a href="mailto:privacyofficer@ditax.ch">privacyofficer@ditax.ch</a>
        </p>
      </>
    ),
  },
  {
    id: 'umfang-und-zweck',
    number: '3',
    title: 'Umfang und Zweck der Datenbearbeitung',
    content: (
      <>
        <h3>3.1 Kontaktaufnahme mit uns</h3>
        <p>
          Wenn Sie sich mit uns über unsere Kontaktadressen, das Help-Center oder den Support in
          Verbindung setzen, verarbeiten wir die Daten, die Sie uns zur Verfügung stellen (z. B.
          Name, E-Mail-Adresse, Anliegen) sowie den Zeitpunkt der Anfrage. Wir verarbeiten diese
          Daten ausschliesslich, um Ihr Anliegen zu bearbeiten.
        </p>
        <p>
          Rechtsgrundlage: Art. 31 Abs. 2 DSG bzw. Art. 6 Abs. 1 lit. b/f DSGVO (Vertragsanbahnung
          oder berechtigtes Interesse an der Beantwortung Ihrer Anfrage).
        </p>

        <h3>3.2 In-App-Chat und KI-Chatbot</h3>
        <p>
          In der Plattform steht Ihnen ein Chat zur Verfügung, der Anfragen zunächst durch einen
          KI-gestützten Assistenten beantwortet und sie bei Bedarf an unsere Mitarbeitenden
          eskaliert. Dabei verarbeiten wir Ihre Nachrichten, allfällige Anhänge sowie kontextuelle
          Metadaten (z. B. Status Ihrer Steuererklärung). Anhänge werden vor der Speicherung
          Ende-zu-Ende-verschlüsselt. Die KI-Verarbeitung erfolgt gemäss Ziffer 3.6.
        </p>

        <h3>3.3 Eröffnung eines Kundenkontos</h3>
        <p>Bei der Registrierung erheben wir folgende Daten:</p>
        <ul>
          <li>E-Mail-Adresse</li>
          <li>Passwort (gehasht gespeichert)</li>
          <li>Optional: Passkeys (WebAuthn) oder Mehr-Faktor-Authentifizierung (MFA)</li>
          <li>Optional: Apple- oder Google-Login (OAuth)</li>
        </ul>
        <p>
          Diese Daten dienen der Identifikation, dem sicheren Zugang und der Verwaltung Ihres
          Kontos. Rechtsgrundlage: Vertragserfüllung (Art. 31 Abs. 2 lit. a DSG / Art. 6 Abs. 1
          lit. b DSGVO).
        </p>

        <h3>3.4 Erstellung der Steuererklärung</h3>
        <p>
          Für die Erstellung Ihrer Steuererklärung erheben wir – je nach gewähltem Tarif und Ihrer
          persönlichen Situation – insbesondere folgende Daten:
        </p>
        <ul>
          <li>Personalien (Name, Vorname, Geschlecht, Geburtsdatum, AHV-Nummer)</li>
          <li>Adresse, Zivilstand, Konfession</li>
          <li>Angaben zu Ehepartner, Kindern und weiteren Personen im Haushalt</li>
          <li>Berufs-, Einkommens- und Vermögensverhältnisse</li>
          <li>Belege (Lohnausweise, Versicherungs- und Bankunterlagen, Liegenschaftsdaten etc.)</li>
        </ul>
        <p>
          Bei mehreren Steuerpflichtigen pro Konto (z. B. Ehepartner, Familienmitglieder) werden
          die Daten strikt nach <strong>Steuerpflichtiger („tax_filer")</strong> getrennt
          gespeichert und mittels Row-Level-Security in unserer Datenbank isoliert.
        </p>
        <p>
          Rechtsgrundlage: Vertragserfüllung (Art. 31 Abs. 2 lit. a DSG / Art. 6 Abs. 1 lit. b
          DSGVO). Bei besonders schützenswerten Personendaten (z. B. Konfession, Gesundheits- oder
          Sozialversicherungsdaten) stützen wir uns zusätzlich auf Ihre ausdrückliche
          Einwilligung.
        </p>

        <h3>3.5 Upload und Speicherung von Steuerdokumenten</h3>
        <p>
          Hochgeladene Steuerdokumente werden vor der Speicherung in unserer Datenbank{' '}
          <strong>client-seitig Ende-zu-Ende-verschlüsselt</strong> (AES-GCM mit nutzer­spezifischen
          Schlüsseln, verwaltet durch unseren <em>EncryptedDocumentService</em>). Ein dauerhafter
          Klartext Ihrer Dokumente existiert auf unserer Infrastruktur nicht. Eine Entschlüsselung
          erfolgt ausschliesslich kurzfristig im Arbeitsspeicher zum Zeitpunkt der Anzeige oder
          KI-Auswertung.
        </p>
        <p>Technische Limiten je Upload:</p>
        <ul>
          <li>Maximale Dateigrösse: 20 MB</li>
          <li>Maximale Seitenzahl pro PDF: 80 Seiten</li>
          <li>Rate-Limits pro Nutzer und Gerät zum Schutz vor Missbrauch</li>
        </ul>

        <h3>3.6 KI-gestützte Auswertung Ihrer Dokumente</h3>
        <p>
          Zur Vereinfachung der Steuererklärung setzen wir KI-Verfahren ein – insbesondere für das
          automatische Auslesen von Lohnausweisen, die Übernahme aus Vorjahres-Steuererklärungen
          und die Beantwortung von Hilfe-Anfragen.
        </p>
        <p>
          <strong>Eingesetzter Dienst:</strong> Google Cloud Vertex AI (Modell Gemini 2.5 Flash)
          ausschliesslich in der Region <strong>europe-west6 (Zürich, Schweiz)</strong>.
          Vertragspartner ist die <strong>Google Cloud Switzerland Sàrl</strong>. Mit Google
          besteht ein Auftragsverarbeitungsvertrag (DPA) nach Art. 9 DSG bzw. Art. 28 DSGVO.
        </p>
        <ul>
          <li>
            <strong>Kein Training:</strong> Ihre Inhalte werden gemäss Vertex-AI-Bedingungen nicht
            zum Training von Google-Modellen verwendet.
          </li>
          <li>
            <strong>Keine dauerhafte Speicherung bei Google:</strong> Verarbeitung nur für die
            Dauer der einzelnen Anfrage. Google führt unabhängig davon ein technisches
            Missbrauchs-Logging für maximal 30 Tage.
          </li>
          <li>
            <strong>Restrisiko US CLOUD Act:</strong> Die US-Muttergesellschaft Google LLC
            unterliegt theoretisch dem US CLOUD Act. Wir minimieren dieses Risiko durch die
            Schweizer Vertragsentität, den Schweizer Datenstandort, die Ende-zu-Ende-Verschlüsselung
            Ihrer Dokumente sowie EU-Standardvertragsklauseln.
          </li>
          <li>
            <strong>Widerspruchsrecht:</strong> Sie können der KI-gestützten Auswertung jederzeit
            widersprechen ({' '}
            <a href="mailto:privacy@ditax.ch">privacy@ditax.ch</a>) und Ihre Daten manuell
            erfassen.
          </li>
        </ul>

        <h3>3.7 Zahlungsabwicklung</h3>
        <p>
          Für die Abwicklung von Zahlungen (Kreditkarte, TWINT, Klarna, Apple Pay, Google Pay)
          setzen wir <strong>Stripe Payments Europe Ltd.</strong>, 1 Grand Canal Street Lower,
          Dublin, Irland, ein. Zahlungsdaten (insb. Kartennummern) werden direkt an Stripe
          übermittelt und nicht auf unseren Systemen gespeichert. Wir erhalten lediglich
          Bestätigung über erfolgte Zahlungen sowie die für Buchhaltung erforderlichen Metadaten.
          Datenschutzhinweise von Stripe:{' '}
          <a href="https://stripe.com/ch/privacy" target="_blank" rel="noopener noreferrer">
            stripe.com/ch/privacy
          </a>
          .
        </p>

        <h3>3.8 E-Mail-Kommunikation und Marketing</h3>
        <p>
          Transaktions-E-Mails (z. B. Bestätigungen, Statusänderungen, sicherheitsrelevante
          Hinweise) versenden wir über <strong>Resend</strong> (Resend, Inc., San Francisco, USA).
          Für freiwillige Marketing-Newsletter setzen wir <strong>SendFox</strong> (AppSumo LLC,
          USA) ein. Die Anmeldung zum Newsletter erfolgt ausschliesslich per Opt-in; ein Widerruf
          ist jederzeit über den Abmelde-Link in jeder E-Mail oder per Mitteilung an
          privacy@ditax.ch möglich.
        </p>

        <h3>3.9 Aktivitäts- und Sicherheits-Logs</h3>
        <p>
          Zum Schutz vor Missbrauch (insbesondere von KI-Funktionen) protokollieren wir
          pseudonymisierte Nutzungs-Events (z. B. Anzahl Auswertungen pro Nutzer, gehashte
          Gerätekennung) in der Tabelle <code>ai_usage_log</code>. Rechtsgrundlage: berechtigtes
          Interesse an der Sicherheit und Stabilität der Plattform (Art. 31 Abs. 1 DSG / Art. 6
          Abs. 1 lit. f DSGVO).
        </p>

        <h3>3.10 Feedback und Bewertungen</h3>
        <p>
          Wenn Sie uns Feedback geben (Sternebewertung, Kommentare), speichern wir dieses
          gemeinsam mit Ihrer Nutzer-ID, um Qualitätsverbesserungen vornehmen zu können.
          Veröffentlichungen erfolgen nur in anonymisierter Form oder mit Ihrer ausdrücklichen
          Zustimmung.
        </p>
      </>
    ),
  },
  {
    id: 'zentrale-speicherung',
    number: '4',
    title: 'Zentrale Datenspeicherung',
    content: (
      <>
        <p>
          Sämtliche Stamm-, Vertrags-, Nutzungs- und Steuerdaten werden zentral in unserer
          Datenbank bei <strong>Supabase</strong> in der Region <strong>Frankfurt (EU)</strong>{' '}
          gespeichert. Steuerdokumente liegen dort ausschliesslich
          Ende-zu-Ende-verschlüsselt vor (siehe Ziffer 3.5). Edge-Functions (Server-seitige Logik)
          werden ebenfalls in der EU ausgeführt.
        </p>
        <p>
          Der Zugriff auf Ihre Daten innerhalb der Datenbank ist durch Row-Level-Security
          (RLS)-Policies pro Nutzer/Steuerpflichtiger streng abgeschottet.
        </p>
      </>
    ),
  },
  {
    id: 'weitergabe-und-ausland',
    number: '5',
    title: 'Weitergabe und Übermittlung ins Ausland',
    content: (
      <>
        <h3>5.1 Eingesetzte Drittdienstleister</h3>
        <p>
          Ohne die Unterstützung anderer Unternehmen könnten wir unsere Dienste nicht in der
          gewünschten Form erbringen. Eine Weitergabe Ihrer Personendaten erfolgt an folgende
          sorgfältig ausgewählte Auftragsbearbeiter:
        </p>
        <ul>
          <li>
            <strong>Supabase</strong> (Datenbank- und Edge-Function-Hosting, Region Frankfurt/EU) –{' '}
            <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">
              supabase.com/privacy
            </a>
          </li>
          <li>
            <strong>Google Cloud Switzerland Sàrl</strong> (Vertex AI – KI-gestützte
            Dokumentenanalyse, Region Zürich/Schweiz) –{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
              policies.google.com/privacy
            </a>
          </li>
          <li>
            <strong>Stripe Payments Europe Ltd.</strong> (Zahlungsabwicklung, Sitz Irland) –{' '}
            <a href="https://stripe.com/ch/privacy" target="_blank" rel="noopener noreferrer">
              stripe.com/ch/privacy
            </a>
          </li>
          <li>
            <strong>Cloudflare, Inc.</strong> (CDN, DDoS-Schutz, Security-Header) –{' '}
            <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">
              cloudflare.com/privacypolicy
            </a>
          </li>
          <li>
            <strong>Resend, Inc.</strong> (Transaktions-E-Mails, Sitz USA) –{' '}
            <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">
              resend.com/legal/privacy-policy
            </a>
          </li>
          <li>
            <strong>SendFox / AppSumo LLC</strong> (Marketing-Newsletter, Sitz USA) –{' '}
            <a href="https://sendfox.com/privacy" target="_blank" rel="noopener noreferrer">
              sendfox.com/privacy
            </a>
          </li>
          <li>
            <strong>Despia</strong> (Native-App-Wrapper für iOS/Android) –{' '}
            <a href="https://despia.com/privacy" target="_blank" rel="noopener noreferrer">
              despia.com/privacy
            </a>
          </li>
        </ul>
        <p>
          Eine weitergehende Bekanntgabe erfolgt nur, soweit wir hierzu gesetzlich verpflichtet
          sind (Behörden, Gerichte) oder Sie ausdrücklich eingewilligt haben.
        </p>

        <h3>5.2 Übermittlung ins Ausland</h3>
        <p>
          Ihre Steuerdokumente und die durch KI verarbeiteten Inhalte verbleiben ausschliesslich in
          der <strong>Schweiz</strong> (Vertex AI, Region Zürich). Unsere Datenbank und
          Edge-Functions werden bei Supabase in <strong>Deutschland (EU)</strong> betrieben. Die EU
          verfügt aus Sicht der Schweiz über ein angemessenes Datenschutzniveau (Art. 16 DSG i. V.
          m. Anhang 1 DSV).
        </p>
        <p>
          Für Übermittlungen an Dienstleister mit Sitz in den USA (Resend, SendFox, ggf.
          US-Support-Funktionen von Cloudflare und Stripe) stützen wir uns auf
          EU-Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO) sowie das Swiss–US Data Privacy
          Framework, sofern der jeweilige Empfänger zertifiziert ist.
        </p>

        <h3>5.3 Hinweise zu Datenübermittlungen in die USA</h3>
        <p>
          Wir weisen darauf hin, dass in den USA Überwachungsmassnahmen von US-Behörden bestehen,
          die generell den Zugriff auf personenbezogene Daten ermöglichen, ohne dass den
          betroffenen Personen in der Schweiz oder der EU wirksame Rechtsbehelfe zur Verfügung
          stehen. Wir minimieren dieses Risiko durch die strikte Beschränkung der an US-Anbieter
          übermittelten Daten auf das technisch Notwendige (z. B. E-Mail-Adresse und Inhalt der
          Transaktions-E-Mail) und durch Verschlüsselung in Transit.
        </p>
      </>
    ),
  },
  {
    id: 'hintergrund',
    number: '6',
    title: 'Hintergrund-Datenverarbeitungen',
    content: (
      <>
        <h3>6.1 Logfile-Daten</h3>
        <p>
          Beim Besuch unserer Plattform werden über Cloudflare und Supabase Edge-Logs technische
          Daten temporär protokolliert: IP-Adresse, Zeitstempel, abgerufene Ressource, User-Agent,
          Betriebssystem und Browser. Diese Daten dienen der Bereitstellung, Sicherheit und
          Performance-Analyse der Plattform und werden nach kurzer Zeit automatisiert gelöscht.
        </p>

        <h3>6.2 Cookies</h3>
        <p>
          Wir verwenden technisch notwendige Cookies (z. B. zur Session-Verwaltung, Login,
          Sicherheits-Tokens, Spracheinstellung). Auf klassische Tracking- oder Analyse-Cookies
          (Google Analytics, Meta Pixel etc.) verzichten wir bewusst. Weitere Details finden Sie
          in unserer{' '}
          <a href="/cookies">Cookie-Richtlinie</a>.
        </p>

        <h3>6.3 Security-Header und CSP</h3>
        <p>
          Wir setzen eine strikte Content Security Policy (CSP), HTTP Strict Transport Security
          (HSTS) und weitere Sicherheits-Header ein, um Angriffe wie Cross-Site-Scripting und
          Clickjacking zu erschweren. CSP-Verstösse werden in pseudonymisierter Form an unsere
          Edge-Function <code>csp-report</code> gemeldet.
        </p>
      </>
    ),
  },
  {
    id: 'aufbewahrung',
    number: '7',
    title: 'Aufbewahrungsfristen',
    content: (
      <>
        <p>
          Wir bewahren Personendaten nur so lange auf, wie dies für die jeweiligen Zwecke
          erforderlich ist oder gesetzliche Aufbewahrungspflichten dies verlangen:
        </p>
        <ul>
          <li>
            <strong>Steuerunterlagen und Buchhaltungsbelege:</strong> 10 Jahre gemäss Art. 958f OR
            sowie kantonalen Steuergesetzen.
          </li>
          <li>
            <strong>Vertrags- und Kontodaten:</strong> für die Dauer des Vertragsverhältnisses
            zuzüglich der gesetzlichen Verjährungsfristen.
          </li>
          <li>
            <strong>Logfile- und Sicherheits-Daten:</strong> in der Regel 30–90 Tage.
          </li>
          <li>
            <strong>Marketing-Daten:</strong> bis zum Widerruf Ihrer Einwilligung.
          </li>
        </ul>
        <p>
          Nach Ablauf der Aufbewahrungsfristen werden Ihre Daten gelöscht oder anonymisiert. Sie
          können die Löschung Ihres Kontos jederzeit per E-Mail an{' '}
          <a href="mailto:privacy@ditax.ch">privacy@ditax.ch</a> verlangen.
        </p>
      </>
    ),
  },
  {
    id: 'datensicherheit',
    number: '8',
    title: 'Datensicherheit',
    content: (
      <>
        <p>
          Wir treffen angemessene technische und organisatorische Massnahmen, um Ihre Personendaten
          gegen Verlust, Manipulation und unberechtigten Zugriff zu schützen. Dazu gehören
          insbesondere:
        </p>
        <ul>
          <li>Ende-zu-Ende-Verschlüsselung Ihrer Steuerdokumente (AES-GCM, client-seitig)</li>
          <li>Verschlüsselte Übertragung über TLS 1.2+</li>
          <li>Row-Level-Security in der Datenbank, getrennt pro Nutzer und Steuerpflichtiger</li>
          <li>Optionale Mehr-Faktor-Authentifizierung (TOTP) und Passkeys (WebAuthn)</li>
          <li>Automatische Abmeldung nach 20 Minuten Inaktivität</li>
          <li>Regelmässige Sicherheitsüberprüfungen und Penetrationstests</li>
          <li>Strikte CSP, HSTS und weitere Sicherheits-Header</li>
        </ul>
        <p>
          Trotz aller Sorgfalt kann keine Übermittlung über das Internet absolute Sicherheit
          bieten. Bitte schützen Sie Ihre Zugangsdaten und melden Sie verdächtige Aktivitäten
          umgehend an <a href="mailto:privacy@ditax.ch">privacy@ditax.ch</a>.
        </p>
      </>
    ),
  },
  {
    id: 'rechte',
    number: '9',
    title: 'Ihre Rechte',
    content: (
      <>
        <p>Sie haben im Rahmen der anwendbaren Datenschutzgesetze insbesondere folgende Rechte:</p>
        <ul>
          <li>
            <strong>Auskunft</strong> über die zu Ihrer Person bearbeiteten Daten
          </li>
          <li>
            <strong>Berichtigung</strong> unrichtiger oder unvollständiger Daten
          </li>
          <li>
            <strong>Löschung</strong> Ihrer Daten („Recht auf Vergessen")
          </li>
          <li>
            <strong>Einschränkung</strong> der Bearbeitung
          </li>
          <li>
            <strong>Datenübertragbarkeit</strong> (Export Ihrer Daten in einem strukturierten,
            gängigen Format)
          </li>
          <li>
            <strong>Widerruf</strong> erteilter Einwilligungen mit Wirkung für die Zukunft
          </li>
          <li>
            <strong>Widerspruch</strong> gegen Bearbeitungen, die auf berechtigtem Interesse beruhen
          </li>
        </ul>
        <p>
          Zur Ausübung Ihrer Rechte genügt eine Mitteilung an{' '}
          <a href="mailto:privacy@ditax.ch">privacy@ditax.ch</a>. Wir können vor der Auskunft eine
          angemessene Identifikation verlangen.
        </p>
        <p>
          Sind Sie der Ansicht, dass wir gegen das Datenschutzrecht verstossen, können Sie eine
          Beschwerde beim <strong>Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten
          (EDÖB)</strong> in Bern einreichen. Nutzerinnen und Nutzer mit Wohnsitz in der EU können
          sich an die für sie zuständige Aufsichtsbehörde wenden.
        </p>
      </>
    ),
  },
  {
    id: 'aenderungen',
    number: '10',
    title: 'Änderungen dieser Datenschutzerklärung',
    content: (
      <>
        <p>
          Wir können diese Datenschutzerklärung jederzeit anpassen, um sie an geänderte
          rechtliche Rahmenbedingungen oder Änderungen unserer Dienste anzupassen. Massgebend ist
          jeweils die zum Zeitpunkt Ihres Besuchs auf der Plattform publizierte Fassung. Bei
          wesentlichen Änderungen informieren wir Sie zusätzlich per E-Mail oder über einen
          deutlich sichtbaren Hinweis in der App.
        </p>
      </>
    ),
  },
];

function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState<string>(ids[0] ?? '');

  useEffect(() => {
    if (ids.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [ids]);

  return active;
}

const Privacy: React.FC = () => {
  const navigate = useNavigate();
  const ids = useMemo(() => sections.map((s) => s.id), []);
  const activeId = useActiveSection(ids);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleTocClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({ top, behavior: 'smooth' });
      setMobileOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      <SubpageHeader title="Datenschutzerklärung" onBack={() => navigate(-1)} />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Page header */}
        <div className="mb-8 lg:mb-12">
          <h1 className="text-3xl lg:text-5xl font-bold text-foreground tracking-tight">
            <span className="text-primary">Datenschutzerklärung</span>{' '}
            <span className="text-foreground">Ditax</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Stand:</span> Mai 2026
          </p>
        </div>

        {/* Mobile TOC */}
        <div className="lg:hidden mb-6">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="w-full flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-left"
            aria-expanded={mobileOpen}
          >
            <span className="font-semibold text-foreground">Inhaltsverzeichnis</span>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform',
                mobileOpen && 'rotate-180'
              )}
            />
          </button>
          {mobileOpen && (
            <nav className="mt-2 rounded-2xl border border-border bg-card p-2">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  onClick={(e) => handleTocClick(e, s.id)}
                  className={cn(
                    'block rounded-xl px-3 py-2 text-sm transition-colors',
                    activeId === s.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {s.number}. {s.title}
                </a>
              ))}
            </nav>
          )}
        </div>

        <div className="flex flex-col lg:flex-row lg:gap-12">
          {/* Desktop TOC */}
          <aside className="hidden lg:block lg:w-72 shrink-0">
            <div className="sticky top-24">
              <h2 className="text-sm font-semibold text-foreground mb-4">Inhaltsverzeichnis</h2>
              <nav className="space-y-1">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    onClick={(e) => handleTocClick(e, s.id)}
                    className={cn(
                      'block rounded-xl px-3 py-2 text-sm leading-snug transition-colors',
                      activeId === s.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {s.number}. {s.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0 max-w-3xl">
            <article
              className={cn(
                'space-y-12',
                'prose prose-slate max-w-none',
                '[&_h2]:text-2xl lg:[&_h2]:text-3xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-foreground [&_h2]:mb-4',
                '[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2',
                '[&_p]:text-foreground/85 [&_p]:leading-relaxed [&_p]:my-3',
                '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-3 [&_li]:my-1 [&_li]:text-foreground/85',
                '[&_a]:text-primary [&_a]:underline-offset-2 hover:[&_a]:underline',
                '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm',
                '[&_strong]:text-foreground'
              )}
            >
              {sections.map((s) => (
                <section key={s.id} id={s.id} className="scroll-mt-24">
                  <h2>
                    {s.number}. {s.title}
                  </h2>
                  {s.content}
                </section>
              ))}
            </article>

            <div className="mt-16 pt-8 border-t border-border text-sm text-muted-foreground">
              Kontakt für Datenschutzanfragen:{' '}
              <a href="mailto:privacy@ditax.ch" className="text-primary hover:underline">
                privacy@ditax.ch
              </a>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
