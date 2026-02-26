

## Analyse

Ja, das macht absolut Sinn. Der aktuelle System-Prompt beschreibt bereits die App-Navigation und Features, aber es fehlen wichtige Informationen von der Webseite und der Wissensdatenbank:

**Von www.ditax.ch fehlt:**
- Wie der Service funktioniert (4 Schritte: Anmelden, Angaben erfassen, Unterlagen hochladen, Steuererklärung erhalten)
- Dass **Treuhänder mit eidg. Fachausweis** die Steuererklärung erstellen (nicht der User selbst)
- Preise: ab 150 CHF, transparente Preisgestaltung
- Bearbeitungsdauer: bis 60 Tage, Express-Service in 10 Tagen
- Sicherheit: Ende-zu-Ende Verschlüsselung, 2FA, Daten in Schweiz/EU, DSGVO konform
- App verfügbar im App Store und Play Store
- Gründer: Sandro Graber, Treuhänder mit eidg. Fachausweis

**Von der Wissensdatenbank fehlt:**
- Die Wissensdatenbank ist direkt in der App unter "Hilfe & Support" im Menü erreichbar
- Kategorien: Registrieren/Anmelden, Angaben hinzufügen, Dokumente hochladen, Steuererklärung anpassen lassen, Sicherheit
- Verweis darauf, dass der User dort detaillierte Anleitungen findet

**Wichtig:** Die Wissensdatenbank-Inhalte (die einzelnen Artikel) konnten nicht geladen werden, da sie hinter Unterseiten liegen. Aber der Bot kann auf die Wissensdatenbank verweisen, wenn er eine Frage nicht detailliert beantworten kann.

## Plan

Den System-Prompt in `supabase/functions/chatbot-response/index.ts` erweitern um die Webseiten- und Wissensdatenbank-Informationen. Alles in den bestehenden `systemPrompt`-String integrieren.

### Neue Abschnitte im Prompt

**1. ÜBER DITAX (neu):**
- DiTax ist eine digitale Steuerplattform für die Schweiz
- Treuhänder mit eidg. Fachausweis erstellen die Steuererklärung
- Der User füllt nicht selbst aus, sondern liefert Angaben und Dokumente
- Gründer: Sandro Graber

**2. SO FUNKTIONIERT ES (neu):**
- Schritt 1: Anmelden / Registrieren
- Schritt 2: Angaben erfassen (4 Formulare)
- Schritt 3: Unterlagen hochladen (individuelle Checkliste)
- Schritt 4: Fertige Steuererklärung erhalten

**3. PREISE & DAUER (neu):**
- Ab 150 CHF, transparente Preise ohne versteckte Kosten
- Standard: bis 60 Tage Bearbeitungszeit
- Express-Service: 10 Tage
- Individueller Preis via Preisrechner auf www.ditax.ch

**4. SICHERHEIT (neu):**
- Ende-zu-Ende Verschlüsselung
- Optionale 2FA (App oder Passkey)
- Datenspeicherung in der Schweiz/EU
- DSGVO konform, SSL/TLS verschlüsselt
- Alle Zugriffe werden protokolliert (Audit-Logs)
- Gesichert mit Aikido Security

**5. WISSENSDATENBANK (neu):**
- Verfügbar in der App unter "Hilfe & Support" im Menü
- Kategorien: Registrieren/Anmelden, Angaben hinzufügen, Dokumente hochladen, Steuererklärung anpassen, Sicherheit
- Bei detaillierten Anleitungsfragen auf die Wissensdatenbank verweisen

**6. APP-VERFÜGBARKEIT (neu):**
- iOS: App Store
- Android: Play Store
- Webseite: www.ditax.ch

### Technische Umsetzung

**Datei: `supabase/functions/chatbot-response/index.ts`**
- Zeilen 234-270: Den `systemPrompt`-String erweitern mit den neuen Abschnitten
- Der Prompt bleibt unter ~2000 Tokens — bei gpt-4o-mini kein relevanter Kosten- oder Latenz-Impact
- Bestehende Abschnitte (Navigation, Formularbereiche, Regeln, Eskalation) bleiben erhalten

### Was sich nicht ändert

- Keine Frontend-Änderungen
- Keine Datenbank-Änderungen
- Nur der System-Prompt in der Edge Function wird erweitert

