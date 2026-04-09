

## Plan: DSGVO-konformes Newsletter/E-Mail-System im Adminbereich

### Übersicht
Ein Newsletter-Versandsystem im Adminbereich, das die bestehende `marketing_consent_at`-Spalte in `profiles` nutzt. Admins können E-Mails an alle abonnierten Benutzer senden. Benutzer können sich im `/welcome`-Flow und in den Datenschutzeinstellungen an-/abmelden. Bestehende Benutzer gelten als angemeldet.

### Datenbank-Änderungen

1. **Neue Tabelle `newsletter_campaigns`** — Protokollierung aller versendeten Kampagnen (DSGVO-Nachweispflicht):
   - `id`, `subject`, `html_content`, `sent_by` (admin user_id), `sent_at`, `recipient_count`, `status` (draft/sending/sent/failed)
   - RLS: Nur Admins via `has_role()`

2. **Neue Tabelle `newsletter_send_log`** — Pro Empfänger-Log:
   - `id`, `campaign_id` (FK), `user_id`, `email`, `status` (sent/failed/bounced), `sent_at`, `error_message`
   - RLS: Nur Admins via `has_role()`

3. **Migration für bestehende Benutzer**: `UPDATE profiles SET marketing_consent_at = NOW() WHERE marketing_consent_at IS NULL` — alle bestehenden User als Newsletter-Abonnenten markieren

### Edge Function: `send-newsletter`

- Empfängt `campaign_id` vom Admin-Frontend
- Lädt alle Profile mit `marketing_consent_at IS NOT NULL`
- Versendet E-Mails via Resend (bereits konfiguriert mit `RESEND_API_KEY`)
- Jede E-Mail enthält einen Abmelde-Link (`/privacy-settings`)
- Protokolliert jeden Versand in `newsletter_send_log`
- Nur per `service_role` / Admin aufrufbar

### Frontend-Änderungen

1. **Neue Admin-Seite `/admin/newsletter`**:
   - E-Mail-Composer: Betreff, HTML-Inhalt (Rich-Text oder Textarea)
   - Vorschau der Empfängeranzahl (Benutzer mit `marketing_consent_at IS NOT NULL`)
   - Senden-Button mit Bestätigungsdialog
   - Kampagnen-Historie mit Status und Empfängeranzahl
   - Design: Globales Admin-Glasmorphismus-Design

2. **AdminSidebar**: Neuer Eintrag "Newsletter" unter "Verwaltung" mit `Mail`-Icon

3. **WelcomeFlow** (`/welcome`): Bereits vorhanden — `marketingConsent` wird als `marketing_consent_at` gespeichert. Keine Änderung nötig.

4. **PrivacySettings** (`/privacy-settings`): Bereits vorhanden — Marketing-E-Mail-Toggle existiert. Keine Änderung nötig.

5. **Admin.tsx**: Neue Route `/admin/newsletter` registrieren

### DSGVO-Konformität

- Opt-in bei Registrierung (bereits in WelcomeFlow)
- Jederzeit abmeldbar in Datenschutzeinstellungen (bereits vorhanden)
- Jede E-Mail enthält Abmelde-Link
- Vollständige Protokollierung aller Kampagnen und Zustellungen
- Bestehende User: Annahme der Zustimmung (mit Hinweis in erster E-Mail)

### Technische Details

- **Dateien**: ~3 neue Dateien (Admin-Komponente, Edge Function, Migration)
- **Geänderte Dateien**: `AdminSidebar.tsx`, `Admin.tsx`
- **Abhängigkeiten**: Resend API (bereits vorhanden), bestehende Supabase-Infrastruktur

