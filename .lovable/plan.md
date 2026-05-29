# Datenschutzrichtlinie: Vertex AI & KI-Verarbeitung ergänzen

## Ziel
Die Seite `/datenschutzrichtlinie` (`src/pages/Privacy.tsx`) so erweitern, dass die KI-gestützte Dokumentenanalyse (Lohnausweis-OCR, Vorjahres-Scan, Chatbot) rechtskonform und transparent offengelegt wird. Aktualisierungsdatum auf 29. Mai 2026 setzen.

## Änderungen in `src/pages/Privacy.tsx`

### 1. Neuer Hauptabschnitt „Verarbeitung durch Künstliche Intelligenz (KI)"
Wird vor „Offenlegung persönlicher Daten an Dritte" eingefügt. Inhalt:

- **Zweck**: Automatisches Auslesen von Lohnausweisen, Vorjahres-Steuererklärungen und sonstigen hochgeladenen Belegen sowie Beantwortung von Support-Fragen via Chatbot.
- **Eingesetzter Dienst**: Google Cloud Vertex AI (Modell Gemini 2.5 Flash), betrieben durch **Google Cloud Switzerland Sàrl**.
- **Datenstandort**: Ausschliesslich Region `europe-west6` (Rechenzentrum Zürich, Schweiz). Es findet keine Übermittlung in die USA oder andere Drittstaaten statt.
- **Auftragsverarbeitung (AVV/DPA)**: Mit Google Cloud besteht ein Data Processing Addendum nach DSGVO Art. 28 / DSG Art. 9.
- **Kein Modell-Training**: Hochgeladene Kundendaten werden gemäss Vertex-AI-Standardvertrag **nicht** zum Trainieren von Google-Modellen verwendet.
- **Keine dauerhafte Speicherung bei Google**: Inhalte werden nur für die Dauer der Anfrage verarbeitet; Google führt maximal ein 30-tägiges Abuse-Logging.
- **Limitierung**: Pro Upload max. 20 MB / 80 PDF-Seiten, technische Rate-Limits pro Nutzer.
- **Ende-zu-Ende-Verschlüsselung**: Steuerdokumente liegen in unserer Datenbank Client-seitig verschlüsselt; Klartext wird nur in-memory zum Zeitpunkt der KI-Analyse erzeugt und nicht persistiert.
- **US CLOUD Act – Restrisiko**: Google LLC (Muttergesellschaft) unterliegt theoretisch dem US CLOUD Act. Durch Schweizer Rechtsentität, Schweizer Speicherort, Verschlüsselung und Standardvertragsklauseln wird dieses Risiko minimiert.
- **Rechtsgrundlage**: Art. 31 Abs. 2 lit. a DSG / Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung – ohne KI-Vorbefüllung kann der Service in der versprochenen Form nicht erbracht werden).
- **Widerspruch / manuelle Verarbeitung**: Nutzer können die KI-Auswertung ablehnen und die Daten manuell eingeben. Kontakt: privacy@ditax.ch.

### 2. Abschnitt „Drittanbieter" aktualisieren (Zeile 82–86)
Liste erweitern auf den aktuellen Stand:
- **Supabase** (Hosting Datenbank & Edge Functions, Region Frankfurt EU)
- **Google Cloud (Vertex AI)** – Region Zürich, Schweiz
- **Stripe** (Zahlungsabwicklung)
- **Cloudflare** (CDN, DDoS-Schutz, Security Headers)
- **SendFox / Resend** (Transaktions- und Marketing-Mails)
- **Despia** (Native-App-Wrapper iOS/Android)

### 3. Abschnitt „Internationaler Transfer persönlicher Daten" präzisieren
Hinzufügen: Steuerdokumente und durch KI verarbeitete Daten verbleiben in der Schweiz (Vertex AI Zürich). Metadaten/DB liegen in der EU (Supabase Frankfurt). Keine Übermittlung in die USA für die KI-Verarbeitung.

### 4. Datum aktualisieren
Zeile 17: „Letzte Aktualisierung: 29. Mai 2026".

## Nicht im Scope
- Keine Logikänderungen an Edge Functions oder UI-Komponenten.
- Keine Anpassung von `ConsentStep` (separate Aufgabe falls KI-Opt-In gewünscht).
- Keine Übersetzung in andere Sprachen (Inhalt liegt nur Deutsch vor).
