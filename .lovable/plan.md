
# Analyse: Übersetzungsprobleme und Lösungsplan

## Zusammenfassung

Die i18n-Infrastruktur ist grundsätzlich vorhanden (`I18nContext`, `translations.ts`), aber es gibt **systematische Lücken** in der Anwendung. Viele Komponenten verwenden **hardcodierte deutsche Texte** statt der Übersetzungsvariablen.

---

## 1. Identifizierte Problemkategorien

### Kategorie A: Komponenten ohne `useI18n`-Import

Diese Komponenten importieren und nutzen das Übersetzungssystem gar nicht:

| Datei | Zeilen mit Hardcoded Text |
|-------|--------------------------|
| `src/components/forms/multistep/YesNoQuestion.tsx` | "Ja", "Nein", "Mehr Informationen", "Diese Angabe trifft auf mich zu" |
| `src/components/ui/form-mode-toggle.tsx` | "Ausfüll-Modus wählen", "Ja/Nein", "Experten-Modus" |
| `src/config/yesNoQuestions.ts` | Alle Fragen und Erklärungen (8 Income, 7 Assets, 9 Deductions) |
| `src/components/welcome/WelcomeFlow.tsx` | "Weiter", "Los geht's!", "Vorname", "Datenschutzbestimmungen" |
| `src/components/OnboardingTour.tsx` | Tour-Schritte (title, description) |
| `src/components/auth/EnhancedLoginFlow.tsx` | "Anmelden", "Code eingeben", "Mit Fingerprint anmelden" |

### Kategorie B: Komponenten mit `useI18n` aber Teilverwendung

Diese Komponenten haben i18n integriert, nutzen aber nicht alle Keys:

| Datei | Problem |
|-------|---------|
| `src/components/forms/IncomeForm.tsx` | Titel nutzt `t.taxReturn.dashboard.sections.income`, aber `submitLabel="Speichern"` ist hardcoded |
| `src/components/forms/DeductionsForm.tsx` | `submitLabel="Speichern"` statt `t.forms.save` |
| `src/components/forms/AssetsForm.tsx` | `submitLabel="Speichern"` statt `t.forms.save` |
| `src/components/DocumentChecklist.tsx` | Hardcoded: "Authentifizierung erforderlich", "Pflichtdokumente", "Zur Anmeldung" |

### Kategorie C: Toast-Nachrichten mit Hardcoded Text

Viele Toast-Meldungen umgehen das Übersetzungssystem:

```tsx
// Beispiel aus MultiStepYesNoForm.tsx
toast({
  title: 'Fehler bei der Antwort',  // Hardcoded!
  description: 'Bitte versuche es erneut.',
});

toast({
  title: 'Änderung gespeichert',  // Hardcoded!
  description: 'Deine Antwort wurde aktualisiert.',
});
```

---

## 2. Fehlende Übersetzungs-Keys

Diese Keys müssen in `translations.ts` hinzugefügt werden:

### Für Yes/No-Fragen

```typescript
// Neue Struktur in Translation Interface
yesNoForm: {
  yes: string;
  no: string;
  yesDescription: string;
  noDescription: string;
  moreInfo: string;
  answerSaved: string;
  answerSavedDescription: string;
  answerError: string;
  answerErrorDescription: string;
  // Alle Fragen und Erklärungen aus yesNoQuestions.ts
  questions: {
    income: {
      hasPension: { text: string; explanation: string; };
      hasSalary: { text: string; explanation: string; };
      // ... alle weiteren
    };
    assets: { /* ... */ };
    deductions: { /* ... */ };
  };
};
```

### Für Onboarding/Welcome

```typescript
onboarding: {
  consentTitle: string;
  nameTitle: string;
  yearTitle: string;
  termsAccept: string;
  privacyPolicy: string;
  termsOfService: string;
  newsletterTitle: string;
  newsletterDescription: string;
  next: string;
  letsGo: string;
  firstName: string;
};

tour: {
  welcomeDescription: string;
  addYearTitle: string;
  addYearDescription: string;
  chatTitle: string;
  chatDescription: string;
  documentsTitle: string;
  documentsDescription: string;
  continueCardTitle: string;
  continueCardDescription: string;
};
```

---

## 3. Technische Lösung

### Schritt 1: Übersetzungs-Keys erweitern

`src/i18n/translations.ts` um ca. 150+ neue Keys erweitern für:
- Yes/No-Fragen (24 Fragen mit Erklärungen)
- Onboarding/Welcome Flow
- Tour-Schritte
- Auth-Flows
- Toast-Nachrichten
- Form-Controls

### Schritt 2: Komponenten refaktorieren

**Priorisierte Dateien:**

| Priorität | Datei | Aufwand |
|-----------|-------|---------|
| Hoch | `src/config/yesNoQuestions.ts` → Refactor zu Funktion mit i18n | Gross |
| Hoch | `src/components/forms/multistep/YesNoQuestion.tsx` | Klein |
| Hoch | `src/components/welcome/WelcomeFlow.tsx` | Mittel |
| Hoch | `src/components/auth/EnhancedLoginFlow.tsx` | Mittel |
| Mittel | `src/components/OnboardingTour.tsx` | Mittel |
| Mittel | `src/components/DocumentChecklist.tsx` | Klein |
| Niedrig | `src/components/ui/form-mode-toggle.tsx` | Klein |

### Schritt 3: yesNoQuestions.ts umstrukturieren

Das aktuelle Design ist problematisch, da es eine statische Konfiguration ist. Lösung:

```typescript
// src/config/yesNoQuestions.ts
import { Translation } from '@/i18n/translations';

export const getIncomeQuestions = (t: Translation): QuestionConfig => ({
  section: 'income',
  questions: [
    {
      id: 'hasPension',
      text: t.yesNoForm.questions.income.hasPension.text,
      explanation: t.yesNoForm.questions.income.hasPension.explanation
    },
    // ...
  ]
});
```

### Schritt 4: Verwendung in Komponenten

```tsx
// MultiStepYesNoForm.tsx
const { t } = useI18n();
const questionsConfig = getQuestionsForSection(section, t);
```

---

## 4. Geschätzter Umfang

| Bereich | Anzahl Änderungen |
|---------|-------------------|
| Neue Translation Keys (DE) | ~150 |
| Neue Translation Keys (EN) | ~150 |
| Komponenten zu refaktorieren | ~12 |
| Config-Dateien umzubauen | 1 |

---

## 5. Empfohlenes Vorgehen

### Phase 1: Kritische Benutzer-Flows (Priorität: HOCH)
1. Auth/Login-Flow (`EnhancedLoginFlow.tsx`)
2. Welcome/Onboarding (`WelcomeFlow.tsx`)
3. Yes/No-Fragen (`yesNoQuestions.ts` + `YesNoQuestion.tsx`)

### Phase 2: Formulare und Dokumenten-Checkliste (Priorität: MITTEL)
4. Form-Komponenten (`IncomeForm`, `DeductionsForm`, `AssetsForm`)
5. Dokumenten-Checkliste
6. Tour-Komponenten

### Phase 3: UI-Komponenten und Edge Cases (Priorität: NIEDRIG)
7. Form Mode Toggle
8. Toast-Nachrichten durchgehend
9. Fehlermeldungen

---

## 6. Implementierungsvorschlag

Soll ich mit **Phase 1** beginnen? Das würde umfassen:

1. Alle fehlenden Keys in `translations.ts` hinzufügen (DE + EN)
2. `yesNoQuestions.ts` zu einer Funktion umbauen, die `t` akzeptiert
3. `YesNoQuestion.tsx` mit i18n versehen
4. `WelcomeFlow.tsx` mit i18n versehen
5. `EnhancedLoginFlow.tsx` mit i18n versehen

Dies würde die wichtigsten Benutzer-Flows (Registrierung, Onboarding, Steuerformulare) vollständig übersetzt machen.
