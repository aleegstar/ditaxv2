
# Vollständige i18n-Integration für Hauptseite (/) und Formularseite (/form)

## Problem-Zusammenfassung

Die beiden Hauptseiten der Anwendung (`UserTaxReturns.tsx` und `TaxYearDashboard.tsx`) sowie deren Subkomponenten **verwenden kein i18n** - alle Texte sind hardcodiert auf Deutsch.

---

## Identifizierte Komponenten ohne i18n

### Hauptseite `/` (UserTaxReturns.tsx)
| Zeile | Hardcodierter Text |
|-------|-------------------|
| 162 | "Steuererklärung nicht gefunden" |
| 176 | "Steuererklärung {year} wurde gelöscht" |
| 180 | "Fehler beim Löschen der Steuererklärung" |
| 206 | "Steuererklärung für {year} existiert bereits" |
| 223 | "Steuererklärung für {year} bereits vorhanden" |
| 230 | "Neue Steuererklärung für {year} erstellt" |
| 235 | "Fehler beim Erstellen der Steuererklärung" |
| 290 | "Benutzer" (Fallback-Name) |
| 293 | "Grüezi," |
| 357 | "Löschen" |
| 370-371 | "Aktiv" |
| 379-386 | "Steuererklärung", "Erfassung läuft..." |
| 402 | "Weiter" |
| ... | Weitere ~50 hardcodierte Strings |

### Formularseite `/form` (TaxYearDashboard.tsx)
| Zeile | Hardcodierter Text |
|-------|-------------------|
| 63-80 | Sektionstiteln: "Kontaktangaben", "Abzüge", "Einkommen", "Vermögen" |
| 194 | "Steuererklärung {year}" |
| 224-225 | "Persönliche Angaben" |
| 254 | "{completed} von {total} erledigt" |
| 329 | "Belege & Unterlagen" |
| 332 | "Dokumente hochladen" |
| 335 | "Zuerst Schritt 1 abschliessen" |
| 372 | "Prüfung & Versand" |
| 375 | "Abschliessen & bezahlen" |
| 378 | "Zuerst Schritt 1 & 2 abschliessen" |

### Subkomponenten
| Komponente | Hardcodierte Texte |
|------------|-------------------|
| `MissingItemsAlert.tsx` | "Aktion erforderlich", "Unterlage(n) werden benötigt" |
| `ProfileWithNotifications.tsx` | Ggf. Tooltips/Labels |
| `AddTaxYearDropdown.tsx` | Dropdown-Beschriftungen |

---

## Lösungsplan

### Phase 1: Neue Translation Keys hinzufügen

Erweiterung von `src/i18n/translations.ts` um folgende Bereiche:

```text
userDashboard: {
  greeting: string;                    // "Grüezi,"
  fallbackUser: string;                // "Benutzer"
  
  // Tax Return Cards
  taxReturn: string;                   // "Steuererklärung"
  active: string;                      // "Aktiv"
  processing: string;                  // "In Bearbeitung"
  completed: string;                   // "Abgeschlossen"
  expressService: string;              // "Express"
  
  // Actions
  continue: string;                    // "Weiter"
  delete: string;                      // "Löschen"
  progress: string;                    // "{progress}%"
  documents: string;                   // "{count} Dokumente"
  
  // Card descriptions
  activeDescription: string;           // "Erfassung läuft..."
  processingDescription: string;       // "Ihre Steuererklärung..."
  completedDescription: string;        // "Steuererklärung abgeschlossen"
  
  // Messages
  taxReturnNotFound: string;
  taxReturnDeleted: string;
  deleteError: string;
  taxReturnExists: string;
  taxReturnCreated: string;
  createError: string;
  
  // Add year
  addTaxYear: string;
  selectYear: string;
}

formDashboard: {
  title: string;                       // "Steuererklärung {year}"
  
  // Step 1
  personalInfo: string;                // "Persönliche Angaben"
  tasksCompleted: string;              // "{completed} von {total} erledigt"
  
  // Sections
  contactInfo: string;                 // "Kontaktangaben"
  deductions: string;                  // "Abzüge"
  income: string;                      // "Einkommen"
  assets: string;                      // "Vermögen"
  
  // Step 2
  documentsTitle: string;              // "Belege & Unterlagen"
  uploadDocuments: string;             // "Dokumente hochladen"
  completeStep1First: string;          // "Zuerst Schritt 1 abschliessen"
  
  // Step 3
  reviewAndSubmit: string;             // "Prüfung & Versand"
  completeAndPay: string;              // "Abschliessen & bezahlen"
  completeSteps12First: string;        // "Zuerst Schritt 1 & 2 abschliessen"
}

missingItems: {
  actionRequired: string;              // "Aktion erforderlich"
  documentsNeeded: string;             // "{count} Unterlage(n) werden benötigt"
  infoNeeded: string;                  // "{count} Angabe(n) werden benötigt"
  bothNeeded: string;                  // "{docs} Unterlagen und {info} Angaben..."
}
```

### Phase 2: Komponenten-Updates

#### 2.1 UserTaxReturns.tsx
```text
1. Import useI18n
2. Alle toast() Aufrufe mit t.userDashboard.* ersetzen
3. Greeting-Bereich mit t.userDashboard.greeting
4. Kartentitel/-beschreibungen ersetzen
5. Buttons und Labels übersetzen
```

#### 2.2 TaxYearDashboard.tsx
```text
1. Import useI18n
2. Sektionstiteln in angabenSections dynamisch aus t.formDashboard.*
3. Header-Titel mit t.formDashboard.title
4. Statusmeldungen ersetzen
5. Schritt-Beschreibungen übersetzen
```

#### 2.3 MissingItemsAlert.tsx
```text
1. Import useI18n
2. getMessage() Funktion mit i18n-Keys refaktorieren
3. "Aktion erforderlich" übersetzen
```

---

## Betroffene Dateien

| Datei | Änderungsart |
|-------|-------------|
| `src/i18n/translations.ts` | ~80 neue Keys (DE + EN) |
| `src/pages/UserTaxReturns.tsx` | useI18n + ~60 String-Ersetzungen |
| `src/components/TaxYearDashboard.tsx` | useI18n + ~30 String-Ersetzungen |
| `src/components/dashboard/MissingItemsAlert.tsx` | useI18n + ~5 String-Ersetzungen |

---

## Technische Implementierung

### Schritt 1: Translation Keys erweitern (translations.ts)

Neue Interfaces und Übersetzungen für beide Sprachen:

```typescript
// Interface-Erweiterung
userDashboard: {
  greeting: string;
  fallbackUser: string;
  taxReturn: string;
  active: string;
  processing: string;
  // ... alle weiteren Keys
};

formDashboard: {
  title: string;
  personalInfo: string;
  // ... alle weiteren Keys
};

missingItems: {
  actionRequired: string;
  documentsNeeded: string;
  // ... alle weiteren Keys
};
```

### Schritt 2: UserTaxReturns.tsx aktualisieren

```typescript
import { useI18n } from '@/contexts/I18nContext';

const UserTaxReturns = () => {
  const { t } = useI18n();
  
  // Beispiel: Greeting
  const getGreeting = () => t.userDashboard.greeting;
  
  // Beispiel: Toast
  toast.success(t.userDashboard.taxReturnDeleted.replace('{year}', year));
```

### Schritt 3: TaxYearDashboard.tsx aktualisieren

```typescript
import { useI18n } from '@/contexts/I18nContext';

export const TaxYearDashboard: React.FC = () => {
  const { t } = useI18n();
  
  const angabenSections: DashboardSection[] = [
    { id: 'contact', title: t.formDashboard.contactInfo, icon: User, param: 'kontakt' },
    { id: 'deductions', title: t.formDashboard.deductions, icon: Shield, param: 'abzuege' },
    // ...
  ];
```

### Schritt 4: MissingItemsAlert.tsx aktualisieren

```typescript
import { useI18n } from '@/contexts/I18nContext';

export const MissingItemsAlert: React.FC<...> = (...) => {
  const { t } = useI18n();
  
  const getMessage = () => {
    if (pendingDocuments > 0 && pendingInformation > 0) {
      return t.missingItems.bothNeeded
        .replace('{docs}', String(pendingDocuments))
        .replace('{info}', String(pendingInformation));
    }
    // ...
  };
```

---

## Erwartetes Ergebnis

Nach der Implementierung:

1. **Hauptseite (`/`)**: Vollständig übersetzbar
   - Begrüssung wechselt zu "Hello," / "Grüezi,"
   - Alle Kartentexte ändern sich
   - Toast-Nachrichten in korrekter Sprache

2. **Formularseite (`/form`)**: Vollständig übersetzbar
   - Header-Titel: "Tax Return 2029" / "Steuererklärung 2029"
   - Sektionsnamen: "Contact Info" / "Kontaktangaben"
   - Statusmeldungen in korrekter Sprache

3. **Konsistenz**: Sprachumschaltung im Menü wirkt sofort auf alle Seiten
