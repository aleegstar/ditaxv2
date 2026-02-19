

## OCR-Verwaltung im Admin-Bereich

Zwei neue Funktionen fuer den Admin-Bereich:

### 1. OCR-Keyword-Verwaltung (pro Dokumenttyp)

Eine neue Admin-Seite, auf der alle Dokumenttypen mit ihren OCR-Keywords, Mindest-Treffern und Konfidenz-Level angezeigt werden. Admins koennen diese Einstellungen anpassen, ohne den Code zu aendern.

**Datenbank-Aenderungen:**
- Neue Tabelle `ocr_document_configs` mit Spalten:
  - `id` (uuid, PK)
  - `document_type_id` (text, unique) - z.B. "employment-income"
  - `display_name` (text)
  - `keywords` (text[]) - Array der Schluesselwoerter
  - `min_match_count` (integer)
  - `confidence` (text) - 'high', 'medium', 'low'
  - `is_active` (boolean, default true)
  - `updated_by` (uuid)
  - `created_at`, `updated_at` (timestamptz)
- RLS: Nur Admins koennen lesen/schreiben
- Seed-Migration: Bestehende Keywords aus `documentKeywords.ts` als Initialwerte einfuegen

**Code-Aenderungen:**
- `src/utils/documentKeywords.ts`: Erweitern um eine Funktion `loadDocumentKeywordsFromDB()`, die zuerst die DB prueft und bei Fehler auf die hardcodierten Keywords zurueckfaellt (Fallback)
- Neue Komponente `src/components/admin/OcrConfigManager.tsx`: Tabelle mit allen Dokumenttypen, inline-Bearbeitung von Keywords (Tags), minMatchCount (Slider/Input), Konfidenz (Dropdown), aktiv/inaktiv (Switch)
- Route `/admin/ocr-config` in `Admin.tsx` registrieren
- Neuer Sidebar-Eintrag "OCR-Regeln" unter "Verwaltung" in `AdminSidebar.tsx`

### 2. Sammlung nicht erkannter Dokumente

Dokumente, die vom User trotz fehlgeschlagener OCR-Validierung hochgeladen wurden ("Dokument trotzdem einreichen"), sollen fuer Admins sichtbar gesammelt werden.

**Datenbank-Aenderungen:**
- Neue Tabelle `unrecognized_uploads` mit Spalten:
  - `id` (uuid, PK)
  - `document_id` (uuid, FK -> uploaded_documents.id)
  - `user_id` (uuid)
  - `tax_filer_id` (uuid, nullable)
  - `expected_doc_type` (text) - Welcher Typ war erwartet
  - `ocr_confidence` (integer) - Erreichte Konfidenz in %
  - `ocr_best_match` (text, nullable) - Bester OCR-Treffer
  - `admin_status` (text, default 'pending') - 'pending', 'approved', 'rejected'
  - `admin_notes` (text, nullable)
  - `reviewed_by` (uuid, nullable)
  - `created_at`, `reviewed_at` (timestamptz)
- RLS: Admins koennen alles, User koennen eigene Eintraege lesen

**Code-Aenderungen:**
- Upload-Flow anpassen: Wenn User auf "Dokument trotzdem einreichen" klickt, wird ein Eintrag in `unrecognized_uploads` erstellt (in `DocumentUploadSheet.tsx`, `EnhancedDocumentUploader.tsx`, `DocumentAssignmentModal.tsx`)
- Neue Komponente `src/components/admin/UnrecognizedUploadsManager.tsx`: Listenansicht mit Filtern (Status, Dokumenttyp), Dokumentvorschau, Admin-Review (genehmigen/ablehnen mit Notiz)
- Route `/admin/unrecognized-uploads` in `Admin.tsx`
- Neuer Sidebar-Eintrag "Nicht erkannte Belege" unter "Steuern" in `AdminSidebar.tsx`

### Technische Details

**Fallback-Strategie fuer OCR-Keywords:**
```text
App startet
  -> Versuche Keywords aus Supabase zu laden
  -> Erfolg: Verwende DB-Keywords (Admin-konfiguriert)
  -> Fehler/Leer: Verwende hardcodierte Keywords aus documentKeywords.ts
```

**Admin-UI OCR-Regeln:**
- Jeder Dokumenttyp wird als Karte/Zeile dargestellt
- Keywords als editierbare Tags (hinzufuegen/entfernen)
- minMatchCount als Zahleneingabe
- Konfidenz als Dropdown (hoch/mittel/niedrig)
- Aktiv/Inaktiv-Toggle pro Dokumenttyp
- "Zuruecksetzen"-Button pro Typ (auf Standard-Keywords)

**Admin-UI Nicht erkannte Belege:**
- Tabelle mit: Benutzer, Dokumentname, Erwarteter Typ, OCR-Konfidenz, Datum, Status
- Klick oeffnet Detail-Ansicht mit Dokument-Vorschau
- Aktionen: Genehmigen, Ablehnen (mit Notiz), dem richtigen Typ zuweisen

