
# Datenschutzerklärung: Inhalt & Darstellung überarbeiten

## Ziel
`/datenschutzrichtlinie` inhaltlich auf Schweizer Sachverhalt (DSG, Firmensitz Derendingen, Kunden CH) ausrichten und visuell wie iqtax.ch darstellen: nummerierte Abschnitte mit klickbarem Inhaltsverzeichnis links, Inhalt rechts, aktiver Abschnitt hervorgehoben beim Scrollen.

## Was geändert wird

### 1. Inhalt komplett neu strukturieren (`src/pages/Privacy.tsx`)

Der bisherige Text ist eine generische DSGVO-Vorlage mit Mischsprache („Sie/Ihre"), unpassendem „Datenschutzbeauftragter", Personenkategorien wie „Rasse/sexuelle Orientierung", Cookies-Doppelung mit `/cookies` etc. Wir ersetzen ihn durch einen schlanken, Schweizer-rechtlich orientierten Aufbau analog iqtax — gestützt auf DSG, mit DSGVO nur als Hinweis für EU-Nutzer.

Neue Abschnitte (nummeriert wie iqtax):

1. **Verantwortlicher und Inhalt dieser Datenschutzerklärung** — Ditax by Graber Sandro, Sandro Graber, Lerchenweg 49, 4552 Derendingen, Schweiz; Plattform app.ditax.ch & ditax.ch; Orientierung am Schweizer DSG.
2. **Ansprechpartner für Datenschutz** — privacy@ditax.ch (Datenschutzanfragen), privacyofficer@ditax.ch (interner Verantwortlicher).
3. **Umfang und Zweck der Datenbearbeitung**
   - 3.1 Kontaktaufnahme (E-Mail, Help-Center, Support)
   - 3.2 In-App-Chat / KI-Chatbot (Datenfluss, Eskalation an Mitarbeitende)
   - 3.3 Eröffnung eines Kundenkontos (E-Mail, Passwort, Passkeys/WebAuthn, MFA)
   - 3.4 Erstellung der Steuererklärung (Personalien, Familien-/Finanz-/Religionsangaben, Mehrpersonen-Tax-Filer-Isolation)
   - 3.5 Upload und Verarbeitung von Steuerdokumenten (Ende-zu-Ende-Verschlüsselung via EncryptedDocumentService, 20 MB / 80 Seiten-Limit)
   - 3.6 KI-gestützte Auswertung (Vertex AI Gemini 2.5 Flash, `europe-west6` Zürich, Google Cloud Switzerland Sàrl, kein Training, max. 30 Tage Abuse-Logging, US-CLOUD-Act-Restrisiko, Widerspruchsrecht)
   - 3.7 Zahlungsabwicklung (Stripe Payments Europe, Karten/TWINT/Klarna/Apple/Google Pay; keine Speicherung von Kartendaten bei uns)
   - 3.8 E-Mail-Kommunikation und Marketing (Resend für Transaktionsmails, SendFox für Newsletter; Opt-in, Widerruf jederzeit)
   - 3.9 Aktivitäts- und Sicherheits-Logs (ai_usage_log, Device-Hashes für Rate-Limits, Pentest-Mode-Killswitch nur intern)
   - 3.10 Feedback und Bewertungen
4. **Zentrale Datenspeicherung in Supabase (EU)** — Datenbank & Edge Functions bei Supabase, Region Frankfurt/EU; Zweck: Verwaltung, Verknüpfung, Vertragsabwicklung.
5. **Weitergabe und Übermittlung ins Ausland**
   - 5.1 Drittanbieter-Liste (Supabase, Google Cloud Vertex AI Zürich, Stripe, Cloudflare, Resend, SendFox, Despia) mit Sitz/Funktion/Link zur Datenschutzerklärung
   - 5.2 Übermittlung ins Ausland (EU = angemessenes Datenschutzniveau; Standardvertragsklauseln wo nötig)
   - 5.3 Hinweise zu Datenübermittlungen in die USA (Google LLC als Muttergesellschaft, CLOUD Act, getroffene Garantien)
6. **Hintergrund-Datenverarbeitungen**
   - 6.1 Logfile-Daten (Cloudflare, Supabase Edge Logs)
   - 6.2 Cookies — Kurzfassung, Verweis auf `/cookies`
   - 6.3 Sicherheits-Header & CSP (kein Analytics-Tracking im klassischen Sinne; keine Google Analytics)
7. **Aufbewahrungsfristen** — Steuerdokumente OR-konform 10 Jahre nach letzter Bearbeitung; Logs gemäss Sicherheitspolicy; Account-Löschung auf Anfrage.
8. **Datensicherheit** — Ende-zu-Ende-Verschlüsselung, RLS, MFA/Passkeys, 20-Minuten-Inactivity-Timeout, Pentest-Programm, Verschlüsselung in Transit (TLS) & at rest.
9. **Ihre Rechte** — Auskunft, Berichtigung, Löschung, Einschränkung, Datenportabilität, Widerruf von Einwilligungen, Beschwerde beim EDÖB (für CH) bzw. zuständiger Aufsichtsbehörde (für EU).
10. **Änderungen dieser Datenschutzerklärung** — Stand 29. Mai 2026.

Sprache: höfliches „Sie" (formal, wie im Memory für Legal vorgesehen). Schweizer Rechtschreibung (ss statt ß).

### 2. Darstellung wie iqtax.ch

Neue Komponente `src/components/legal/LegalPageWithToc.tsx` (oder direkt in `Privacy.tsx`), die das aktuelle `LegalDocumentPage`/`dangerouslySetInnerHTML`-Muster für diese Seite ersetzt:

- **Header**: grosser Titel „Datenschutzerklärung" + „Stand: Mai 2026" darunter.
- **Desktop (lg+)**: zweispaltiges Layout
  - Linke Spalte (sticky, `top-24`, ca. 280 px): „Inhaltsverzeichnis" als vertikale Liste mit allen Hauptabschnitten. Aktiver Abschnitt: Hintergrund `bg-primary/10`, Text `text-primary`, sonst `text-muted-foreground`.
  - Rechte Spalte (flex-1, max-w-3xl): Inhalt mit `<h2>` pro Abschnitt, `id="abschnitt-N"` für Anker.
- **Mobile**: Inhaltsverzeichnis als zusammenklappbares Akkordeon oberhalb des Inhalts (Default kollabiert).
- **Scroll-Spy**: `IntersectionObserver` markiert den im Viewport sichtbaren Abschnitt im TOC; Klick auf TOC scrollt smooth zum Abschnitt.
- **Styling**: semantische Tokens (`bg-background`, `bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`, `text-primary`); keine harten Farben. Typografie: `prose prose-slate` (oder eigene Klassen) für saubere Lesbarkeit. Keine glassmorphen Card-Wrapper — schlichte, helle Darstellung passend zum Fintech-Hintergrund.
- Inhalt wird als strukturiertes JSX gerendert (kein `dangerouslySetInnerHTML`), damit Anker-IDs sauber gesetzt und der TOC automatisch aus dem Section-Array abgeleitet wird.

### 3. SubpageHeader und Routing

`SubpageHeader` mit Titel „Datenschutzerklärung" und Back-Button bleibt. Route `/datenschutzrichtlinie` unverändert.

## Technische Details

- Datenmodell in `Privacy.tsx`:
  ```ts
  const sections: { id: string; title: string; content: ReactNode }[] = [...]
  ```
- `useActiveSection(sections)` Hook mit `IntersectionObserver` (rootMargin `-30% 0px -60% 0px`) liefert aktive `id`.
- TOC-Links: `<a href={`#${id}`} onClick={smoothScrollTo(id)}>`.
- Keine neuen Dependencies.
- `LegalDocumentPage` bleibt für `Cookies.tsx`, `Terms.tsx`, `Impressum.tsx`, `AcceptableUse.tsx` unverändert.

## Out of Scope

- Keine Änderungen an `ConsentStep`, Cookies-Banner, anderen Legal-Seiten.
- Keine Übersetzungen (nur Deutsch).
- Keine Backend-/Edge-Function-Änderungen.
- Keine neuen Komponenten ausserhalb des Legal-Bereichs.
