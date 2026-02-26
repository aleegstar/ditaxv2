## Analyse

Der aktuelle System-Prompt (Zeilen 234-254 in `chatbot-response/index.ts`) ist sehr generisch — "Steuerberatungskanzlei in der Schweiz". Der Bot kennt weder den App-Namen, noch die Features, noch die Navigation. Wenn ein User fragt "Wo lade ich meine Dokumente hoch?", kann der Bot nicht helfen.

## Plan

Den System-Prompt in `supabase/functions/chatbot-response/index.ts` durch einen detaillierten, app-spezifischen Prompt ersetzen. Keine Code-Änderungen am Frontend nötig.

### Neuer System-Prompt — Inhalt

Der erweiterte Prompt wird folgende Bereiche abdecken:

**1. App-Identität**

- Name: Ditax — digitale Steuerplattform für die Schweiz
- Zweck: Steuererklärung digital erstellen und einreichen

**2. Haupt-Features & Navigation**

- **Steuerjahr anlegen**: Auf der Startseite neues Steuerjahr hinzufügen
- **Vorjahres-Import**: Daten aus dem Vorjahr übernehmen
- **Formulare**: Persönliche Angaben, Einkommen, Vermögen, Abzüge — Schritt für Schritt ausfüllen
- **Dokumente hochladen**: Lohnausweise, Kontoauszüge etc. unter "Dokumente" hochladen
- **Steuererklärung einreichen**: Nach Fertigstellung über "Einreichen" absenden
- **Status verfolgen**: Unter "Meine Steuererklärungen" den Bearbeitungsstand sehen
- **Fehlende Unterlagen**: Falls Unterlagen fehlen, erscheint eine Benachrichtigung
- **Definitive Steuerrechnung**: Nach Abschluss einsehbar
- **Rechnungen**: Unter "Rechnungen" die Gebühren und Zahlungen einsehen
- **Profil**: Persönliche Daten und Einstellungen verwalten
- **Support-Tickets**: Bei Problemen ein Ticket erstellen
- **Steuerpflichtige Personen**: Ehepartner/Kinder als Steuerpflichtige hinzufügen

**3. Unterstützte Kantone**

- AG, ZH, ZG, SZ

**4. Formularbereiche**

- Persönliche Angaben (Adresse, Zivilstand, Kinder, Religion)
- Einkommen (Lohn, Selbständigkeit, Mieteinnahmen, Dividenden)
- Vermögen (Bankkonten, Aktien, Immobilien, Fahrzeuge, Krypto)
- Abzüge (Säule 3a, BVG-Einkauf, Spenden, Krankheitskosten, Kinderbetreuung)

**5. Verhaltensregeln**

- Bestehende Regeln beibehalten (keine spezifische Steuerberatung, Eskalation etc.)
- Zusätzlich: Bei Navigationsfragen konkrete Hinweise geben ("Gehen Sie auf die Startseite und tippen Sie auf '+ Steuerjahr hinzufügen'")

### Technische Umsetzung

**Datei: `supabase/functions/chatbot-response/index.ts**`

- Zeilen 233-254: Den `systemPrompt`-String durch den erweiterten Prompt ersetzen
- Sonst keine Änderungen

### Technische Details

- Der Prompt bleibt unter ~1500 Tokens — kein relevanter Einfluss auf Kosten oder Latenz bei gpt-4o-mini
- Der Prompt wird nur serverseitig gesetzt (Edge Function), nicht im Frontend — kein Sicherheitsrisiko