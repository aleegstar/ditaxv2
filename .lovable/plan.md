

## Plan: KI-Assistent mit User-Status-Kontext (OpenAI beibehalten)

### Zusammenfassung
Die bestehende `chatbot-response` Edge Function wird erweitert, sodass der Bot den anonymisierten Fortschrittsstatus des Users kennt und kontextbezogene Hilfe geben kann. OpenAI (`gpt-4o-mini`) bleibt als Modell bestehen.

### Änderungen

#### 1. Edge Function erweitern (`supabase/functions/chatbot-response/index.ts`)

**Neuer Block: Status-Daten laden** (nach Authentifizierung, vor OpenAI-Aufruf)

Folgende Metadaten werden abgefragt (nur Zähler/Booleans, keine Inhalte):

| Abfrage | Tabelle | Was wird geladen |
|---|---|---|
| Aktive Steuerjahre | `tax_returns` | `tax_year`, `status`, `workflow_step` |
| Formular-Fortschritt | `form_progress` | Welche Sektionen erledigt (boolean-Felder) |
| Dokumente | `uploaded_documents` | `COUNT(*)` pro Steuerjahr |
| Offene Nachforderungen | `missing_item_requests` | `COUNT(*)` nach Status (`pending`/`submitted`) |
| Fertige Steuererklärungen | `completed_tax_returns` | `status`, `tax_year` |

**Dynamischer Kontext-Block im System-Prompt:**

```text
AKTUELLER STATUS DES USERS (nur Metadaten):
- Steuerjahr 2024:
  - Persönliche Angaben: ✓
  - Einkommen: ✗
  - Vermögen: ✗
  - Abzüge: ✓
  - Dokumente hochgeladen: 3
  - Status: data_collection
  - Offene Nachforderungen: 1
```

**Erweiterter System-Prompt:**
- Neuer Abschnitt mit Navigations-Hinweisen basierend auf Status
- Bot kann sagen: "Du hast den Bereich Einkommen noch nicht ausgefüllt. Tippe auf dein Steuerjahr 2024 und dann auf 'Einkommen'."
- Hinweis: "Wenn alle 4 Formulare ausgefüllt und Dokumente hochgeladen sind, kannst du die Steuererklärung einreichen."

#### 2. Keine Frontend-Änderungen nötig
- Die bestehende `ChatBotInterface` ruft weiterhin `chatbot-response` auf
- Der Bot wird durch den erweiterten Kontext automatisch intelligenter

### Datenschutz
- **Geladen**: Nur booleans (`contactInfo: true/false`), Zähler, Status-Strings
- **Nicht geladen**: Formularinhalte, Dokumentinhalte, persönliche Daten, verschlüsselte Felder
- **OpenAI**: Erhält nur Status-Metadaten, keine personenbezogenen Daten

### Technische Details

- Modell bleibt `gpt-4o-mini` (OPENAI_API_KEY bereits konfiguriert)
- Alle Datenbankabfragen nutzen den bestehenden `supabase` Service-Role-Client
- `max_tokens` wird von 500 auf 700 erhöht, da der Bot nun ausführlichere Navigations-Hilfe geben kann

