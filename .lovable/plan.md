## Ziel

Beim Onboarding (/welcome) wird die Zustimmung zu Datenschutzerklärung und Nutzungsbedingungen rechtsgültig und nachweisbar (Beweispflicht nach DSG/DSGVO) festgehalten — nicht nur als Flag im Profil, sondern als unveränderliche Audit-Spur mit Zeitstempel, Version, IP, User-Agent und Dokument-Hash.

## Status heute

- `WelcomeFlow.tsx` setzt nur `profiles.terms_accepted_at` + `terms_version: '1.0'`.
- Es wird **kein** Eintrag in `user_consents` geschrieben (nur `ConsentStep.tsx` macht das, wird im Welcome-Flow aber nicht verwendet).
- IP-Adresse, exakte Policy-Version und Marketing-Consent werden nicht protokolliert.
- `user_consents` hat heute INSERT-Policy für User selbst → manipulierbar; kein UPDATE/DELETE-Schutz; keine serverseitige IP-Erfassung.

## Lösung

### 1. Versionierte Rechtsdokumente (DB)

Neue Tabelle `legal_document_versions`:
- `document_type` (`privacy` | `terms`)
- `version` (z. B. `2026-05-29`)
- `content_hash` (SHA-256 des veröffentlichten Texts)
- `effective_from` timestamptz
- `published_url` text
- Public read (anon + authenticated), nur service_role schreibt.

Aktuell gültige Versionen werden seedweise eingefügt (Privacy v `2026-05-29`, Terms v `1.0`). Bei künftigen Änderungen an `Privacy.tsx`/`Terms.tsx` wird ein neuer Eintrag angelegt → User müssen bei Login zu neuer Version erneut zustimmen (separater Re-Consent-Flow, hier nicht im Scope).

### 2. Edge Function `record-consent` (Server-seitig, manipulationssicher)

Neu: `supabase/functions/record-consent/index.ts`
- Validiert JWT (User muss eingeloggt sein).
- Liest IP aus `CF-Connecting-IP` / `x-forwarded-for`.
- Body: `{ consents: [{ type: 'privacy' | 'terms' | 'marketing_emails', consented: boolean }] }`.
- Lädt aktuelle `legal_document_versions` für `privacy`/`terms` → schreibt `consent_version` + `document_hash` in jeden Datensatz.
- Schreibt mit `service_role` in `user_consents` (umgeht Client-Manipulation).
- Spiegelt zusätzlich `profiles.terms_accepted_at` / `marketing_consent_at` für schnelle Reads.
- Gibt `{ ok: true, recorded: [...ids] }` zurück.

### 3. `user_consents` härten

Migration:
- Spalten ergänzen: `document_hash text`, `document_url text`, `accepted_via text` (`onboarding_welcome` | `consent_step` | `reconsent_modal`).
- RLS: Client-INSERT-Policy entfernen (nur noch service_role darf schreiben). SELECT für User & Admin bleibt.
- Trigger `prevent_consent_mutation`: blockiert UPDATE und DELETE auf allen Zeilen (nur service_role-Bypass für DSGVO-Löschung via separate Funktion).
- Index auf `(user_id, consent_type, created_at DESC)`.

### 4. `WelcomeFlow.tsx` anpassen

- Auf Step 0 (Consent) zusätzlich speichern: ob Marketing aktiv ist, in lokalen State (heute schon vorhanden).
- In `handleSaveData` **vor** dem Profile-Update: `supabase.functions.invoke('record-consent', { body: { consents: [{type:'privacy',consented:true},{type:'terms',consented:true},{type:'marketing_emails',consented:marketingConsent}] } })`.
- Bei Fehler: harter Stopp mit Toast „Zustimmung konnte nicht gespeichert werden" — kein weiterleiten, keine Profil-Updates. Onboarding bleibt blockiert (rechtlich sauberer als „weiter trotz Fehler").
- `profiles.terms_accepted_at` wird weiterhin als schneller Lookup-Spiegel beschrieben (durch Edge Function).
- Checkbox-Label um expliziten Hinweis ergänzen: „Ich habe die [Datenschutzerklärung] und [Nutzungsbedingungen] gelesen und stimme zu" — formal korrekter Wortlaut, weiterhin Du-Form (Memory).

### 5. Admin-Nachweisbarkeit

- `src/pages/UserDetail.tsx` (bereits vorhanden) bekommt einen Abschnitt „Einwilligungen" mit allen `user_consents`-Einträgen: Typ, Version, Hash, IP, User-Agent, Zeitstempel — exportierbar als JSON (1-Klick-Download für DSGVO-Auskunft).

### Out of Scope

- Re-Consent-Modal bei neuer Policy-Version (separater Auftrag).
- `ConsentStep.tsx` Refactor (wird im aktiven Flow nicht verwendet).
- Cookie-Consent-Banner.
- Übersetzungen.

## Technische Details

```text
Welcome Step 0 (Checkbox)
   │
   ▼
handleSaveData()
   │
   ├──► invoke('record-consent')  ──► Edge Function
   │                                    ├─ verify JWT
   │                                    ├─ extract IP, UA
   │                                    ├─ load current legal_document_versions
   │                                    └─ INSERT user_consents (service_role)
   │                                         × privacy, terms, [marketing]
   │
   ├──► UPDATE profiles (mirror flags)
   └──► continue onboarding
```

`user_consents` Zeilenbeispiel nach Onboarding:
```
user_id | privacy | true | 2026-05-29 | <sha256> | 1.2.3.4 | Mozilla/5.0… | onboarding_welcome | 2026-05-29T10:00:00Z
user_id | terms   | true | 1.0        | <sha256> | 1.2.3.4 | Mozilla/5.0… | onboarding_welcome | 2026-05-29T10:00:00Z
```

Migrations-Reihenfolge: (1) `legal_document_versions` + GRANTs + RLS + Seed, (2) `user_consents` ALTER + Trigger + Policy-Update. Danach Edge Function deployen, dann `WelcomeFlow.tsx` umstellen.
