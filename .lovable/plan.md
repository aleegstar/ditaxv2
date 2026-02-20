
# Bug-Fix: Kontaktangaben-Fortschritt nur nach vollständigem Ausfüllen als "abgeschlossen" markieren

## Problem-Analyse

Das Kontaktangaben-Formular wird nach dem ersten Schritt bereits als vollständig angezeigt. Die Ursache liegt an **drei Stellen** im Code:

### Stelle 1: `src/contexts/form/useFormDataOperations.tsx` (Zeile 187)
```typescript
// FALSCH: Immer true, sobald irgendwelche contactInfo-Daten vorhanden sind
newFormProgress.contactInfo = true;
```

### Stelle 2: `src/contexts/form/FormContext.tsx` (Zeile 254-258)
```typescript
// FALSCH: contactInfo ist NICHT in multiStepSections → landet im else-Branch → immer true
const multiStepSections = ['income', 'assets', 'deductions'];
if (multiStepSections.includes(item.form_type)) {
  newFormProgress[...] = item.data._completed === true;
} else {
  newFormProgress[...] = true; // ← contactInfo landet hier!
}
```

### Stelle 3: `src/components/forms/MultiStepContactForm.tsx` (handleNext)
Beim Speichern der Zwischenschritte (Schritt 1-3) wird `saveSection('contactInfo', currentContactData)` aufgerufen, aber `currentContactData` enthält **kein `_completed: true`-Flag**. Das ist korrekt für Zwischenschritte. Aber beim Laden der Daten wird `contactInfo` trotzdem als `true` markiert (Stellen 1 & 2).

## Lösung

### Fix 1: `src/components/forms/MultiStepContactForm.tsx`
Im `handleNext()`-Handler beim letzten Schritt `_completed: true` zu den gespeicherten Daten hinzufügen:

```typescript
// Beim finalen Schritt (currentStep === steps.length):
await saveSection('contactInfo', { ...currentContactData, _completed: true });
updateFormProgress('contactInfo', true);
```

### Fix 2: `src/contexts/form/useFormDataOperations.tsx` (Zeile 187)
`contactInfo` genauso behandeln wie die anderen Multi-Step-Sektionen:

```typescript
// VORHER:
newFormProgress.contactInfo = true;
newFormProgress.contact = true;

// NACHHER:
newFormProgress.contactInfo = item.data._completed === true;
newFormProgress.contact = item.data._completed === true;
```

### Fix 3: `src/contexts/form/FormContext.tsx` (Zeile 254)
`contactInfo` zu den Multi-Step-Sektionen hinzufügen, damit der `_completed`-Check greift:

```typescript
// VORHER:
const multiStepSections = ['income', 'assets', 'deductions'];

// NACHHER:
const multiStepSections = ['income', 'assets', 'deductions', 'contactInfo'];
```

Und den Sync-Block darunter ebenfalls anpassen:
```typescript
if (item.form_type === 'contactInfo') {
  newFormProgress.contact = item.data._completed === true; // war: true
}
```

## Verhalten nach dem Fix

| Situation | Vorher | Nachher |
|---|---|---|
| Nur Schritt 1 ausgefüllt, gespeichert | ✅ "Vollständig" (Bug!) | ⏳ Nicht vollständig |
| Alle 4 Schritte ausgefüllt | ✅ "Vollständig" | ✅ "Vollständig" |
| App neu gestartet, nur Schritt 1 Daten in DB | ✅ "Vollständig" (Bug!) | ⏳ Nicht vollständig |
| App neu gestartet, alle 4 Schritte in DB | ✅ "Vollständig" | ✅ "Vollständig" |

## Dateien die geändert werden

1. `src/components/forms/MultiStepContactForm.tsx` — `_completed: true` beim finalen Schritt mitschicken
2. `src/contexts/form/useFormDataOperations.tsx` — `_completed`-Check für `contactInfo`
3. `src/contexts/form/FormContext.tsx` — `contactInfo` zu `multiStepSections` hinzufügen

## Wichtiger Hinweis zur bestehenden Datenlage

Benutzer die das Formular bereits vollständig ausgefüllt haben, haben in der Datenbank **kein `_completed: true`** in ihren `contactInfo`-Daten. Nach dem Fix würden ihre Daten als "nicht vollständig" angezeigt werden, obwohl sie das Formular abgeschlossen haben.

**Lösung dafür:** Im `handleNext()` beim finalen Schritt wird das Flag gesetzt und gespeichert. Das bedeutet: Benutzer die das Formular erneut öffnen und auf "Weiter" klicken (beim letzten Schritt), werden korrekt als "vollständig" markiert. Alternativ kann eine einmalige Datenmigration durchgeführt werden — aber das ist optional und kann je nach Bedarf entschieden werden.
