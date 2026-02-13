

## Feedback-System komplett ueberarbeiten

### Uebersicht

Alle drei Feedback-Komponenten (Popup, Seite, Admin) werden nach der Vorlage modernisiert: Sterne statt Emojis, Quick-Tags (Fehler/Feature/Lob), Kontakt-Checkbox. Datenbank wird um zwei Spalten erweitert.

### 1. Datenbank-Migration

Zwei neue Spalten auf `user_feedback`:

```text
ALTER TABLE public.user_feedback 
  ADD COLUMN IF NOT EXISTS feedback_category text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS contact_consent boolean DEFAULT false;
```

### 2. Feedback-Popup (`src/components/feedback/FeedbackPrompt.tsx`)

Komplettes Redesign des Modals das nach X Anmeldungen erscheint:

- **Titel**: "Wie gefaellt dir die App?" + Untertitel
- **5 Sterne-Rating** statt Emoji-Buttons, mit Labels "Gar nicht" / "Sehr gut" links und rechts
- **Quick-Tags**: 3 Pill-Buttons (Fehler, Feature, Lob) mit Icons (Bug, Lightbulb, Heart)
- **Textarea**: "Was koennen wir besser machen?"
- **Kontakt-Checkbox**: "Darf das Team mich bei Rueckfragen kontaktieren?"
- **Buttons**: "Spaeter" (outline, left-aligned) + "Absenden" (primary blue gradient, right-aligned) in einer Row
- **Direkt-Submit**: Feedback wird direkt aus dem Popup an Supabase gesendet (kein Redirect mehr zu /feedback)
- Button-Design: `rounded-xl h-11` (Ditax-Standard), kein rounded-full
- i18n-Strings verwenden

### 3. Feedback-Seite (`src/pages/Feedback.tsx`)

Gleiches Layout wie das Popup, aber als Full-Page:

- Sterne-Rating mit "Gar nicht" / "Sehr gut" Labels
- Quick-Tags (Fehler/Feature/Lob)
- Textarea fuer Verbesserungsvorschlaege
- Kontakt-Checkbox
- "Spaeter" + "Absenden" Buttons unten
- URL-Parameter `?rating=X` weiterhin unterstuetzt (pre-select)
- Submit sendet `feedback_category` und `contact_consent` an DB
- Success-Screen bleibt erhalten

### 4. Admin-Dashboard (`src/pages/admin/UserFeedback.tsx`)

Erweitert um neue Daten:

- **Neue Statistik-Karten**: Kategorie-Verteilung (Bug/Feature/Lob), Kontakt-Consent-Quote
- **Rating-Verteilung**: Sterne statt Emojis in der Balkenanzeige
- **Feedback-Liste**: Kategorie-Badge anzeigen, Kontakt-Icon (Mail-Check) wenn consent=true
- **Filter**: Zusaetzlich nach Kategorie filtern (Alle/Fehler/Feature/Lob)
- Interface `FeedbackItem` um `feedback_category` und `contact_consent` erweitern

### 5. i18n-Strings (`src/i18n/translations.ts`)

Typ-Definition und beide Sprachen erweitern:

```text
// Neue Strings:
feedbackPromptTitle: "Wie gefällt dir die App?"
feedbackPromptSubtitle: "Dein Feedback hilft uns, das Erlebnis zu verbessern."
ratingLabelLeft: "Gar nicht" / "Not at all"
ratingLabelRight: "Sehr gut" / "Very good"
categoryBug: "Fehler" / "Bug"
categoryFeature: "Feature"
categoryPraise: "Lob" / "Praise"
improvementLabel: "Verbesserungsvorschläge" / "Improvement suggestions"
improvementPlaceholder: "Was können wir besser machen?"
contactConsent: "Darf das Team mich bei Rückfragen kontaktieren?"
laterButton: "Später" / "Later"
sendButton: "Absenden" / "Submit"
```

### Betroffene Dateien

1. **SQL-Migration** -- 2 neue Spalten
2. **`src/components/feedback/FeedbackPrompt.tsx`** -- Komplettes Redesign mit direktem Submit
3. **`src/pages/Feedback.tsx`** -- Redesign mit Sternen, Tags, Checkbox
4. **`src/pages/admin/UserFeedback.tsx`** -- Neue Statistiken und Filter
5. **`src/i18n/translations.ts`** -- Typ-Definition + DE/EN Strings

