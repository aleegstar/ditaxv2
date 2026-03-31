

## Plan: Dokumentationsseite mit KI-Chatbot (OpenAI)

### Übersicht
`/help` wird von einem iframe zu einer nativen Dokumentationsseite mit integriertem Chatbot umgebaut. Der Chatbot nutzt den bestehenden `OPENAI_API_KEY` (gpt-4o-mini).

### Neue Dateien

| Datei | Beschreibung |
|-------|-------------|
| `src/components/docs/DocsContent.ts` | Strukturierter Dokumentationsinhalt (Kategorien, Artikel) |
| `src/components/docs/DocsCategory.tsx` | Kategorie-Card mit Icon und Artikelliste |
| `src/components/docs/DocsArticle.tsx` | Artikel-Detailansicht |
| `src/components/docs/DocsChatBot.tsx` | Chat-Sheet das OpenAI via neue Edge Function nutzt |
| `supabase/functions/docs-chatbot/index.ts` | Edge Function mit OpenAI API + Doku-Kontext als System-Prompt |

### Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `src/pages/Help.tsx` | Komplett umgeschrieben: Suchfeld, Kategorien-Grid, FAB für Chatbot |

### Dokumentations-Kategorien

1. **Erste Schritte** - Registrierung, Login, Steuerjahr anlegen
2. **Angaben erfassen** - Persönliche Daten, Einkommen, Vermögen, Abzüge
3. **Dokumente hochladen** - Checkliste, Upload-Methoden, OCR-Scan
4. **Steuererklärung** - Einreichen, Status, Fertige Erklärung
5. **Bezahlung** - Preise, Express-Service, Zahlungsmethoden (TWINT, Karte)
6. **Sicherheit & Konto** - Verschlüsselung, 2FA, Profil

### Edge Function: `docs-chatbot`

- Nutzt bestehenden `OPENAI_API_KEY` mit `gpt-4o-mini`
- System-Prompt enthält den gesamten Dokumentationsinhalt als Kontext
- Streaming-Response (SSE) für flüssige Antworten
- CORS-Headers, Input-Validierung mit Zod
- Conversation-History wird vom Client mitgeschickt (kein DB-Persist nötig)

### UI-Design

- Weisser Hintergrund, `SubpageHeader` oben
- Suchfeld filtert Artikel clientseitig
- Kategorien als Cards mit Icons im bestehenden Design (rounded-[2rem], Schatten)
- Artikel-Detailansicht als Slide-In
- Floating Action Button (blauer Gradient) unten rechts öffnet Chat-Sheet
- Chat-Sheet: Markdown-Rendering der Antworten via `react-markdown`
- Illustrative Platzhalter-Icons statt echte Screenshots (da Build-Time keine Screenshots möglich)

### Technische Details

- `react-markdown` wird als Dependency hinzugefügt
- Chat streamt Tokens via SSE (gleiche Parsing-Logik wie in den AI Gateway docs)
- Kein JWT-Check nötig (öffentliche Doku), aber optional Auth-Header für Rate-Limiting

