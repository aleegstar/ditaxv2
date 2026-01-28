
# Plan: Formular-Korrekturen

## Zusammenfassung
Dieser Plan behebt die identifizierten Inkonsistenzen in den Formularen:
1. Container-Breiten-Standardisierung
2. ID-Synchronisierung zwischen yesNoQuestions und AssetsForm

---

## 1. Container-Breiten korrigieren

**Problem:** MultiStepYesNoForm verwendet `max-w-[500px]` statt dem Standard `max-w-4xl`.

**Änderungen:**
- **Datei:** `src/components/forms/multistep/MultiStepYesNoForm.tsx`
- **Zeile 576:** `max-w-[500px]` ändern zu `max-w-4xl`
- **Zeile 637:** `max-w-[500px]` ändern zu `max-w-4xl`

**Vorher:**
```tsx
<div className="h-screen md:max-w-2xl bg-white w-full max-w-[500px] mr-auto ml-auto ...">
```

**Nachher:**
```tsx
<div className="h-screen md:max-w-4xl bg-white w-full max-w-4xl mr-auto ml-auto ...">
```

---

## 2. ID-Diskrepanz beheben: hasSecuritiesAccount vs hasDepositAccount

**Problem:** 
- `yesNoQuestions.ts` verwendet `hasSecuritiesAccount` (Zeile 83)
- `AssetsForm.tsx` verwendet `hasDepositAccount` (Zeile 41)

Dies führt dazu, dass die Antwort aus dem Yes/No-Fragebogen nicht korrekt in den Expert-Modus übernommen wird.

**Lösung:** Den ID-Namen in `yesNoQuestions.ts` auf `hasDepositAccount` ändern, um Konsistenz mit dem AssetsForm und der bestehenden Datenstruktur herzustellen.

**Änderung:**
- **Datei:** `src/config/yesNoQuestions.ts`
- **Zeile 83:** `hasSecuritiesAccount` ändern zu `hasDepositAccount`

**Vorher:**
```tsx
{
  id: 'hasSecuritiesAccount',
  text: 'Hast du ein Depotkonto?',
  ...
}
```

**Nachher:**
```tsx
{
  id: 'hasDepositAccount',
  text: 'Hast du ein Depotkonto?',
  ...
}
```

---

## Technische Details

| Datei | Zeile | Änderungstyp | Beschreibung |
|-------|-------|--------------|--------------|
| `src/components/forms/multistep/MultiStepYesNoForm.tsx` | 576 | Edit | max-w-[500px] → max-w-4xl |
| `src/components/forms/multistep/MultiStepYesNoForm.tsx` | 637 | Edit | max-w-[500px] → max-w-4xl |
| `src/config/yesNoQuestions.ts` | 83 | Edit | hasSecuritiesAccount → hasDepositAccount |

---

## Erwartetes Ergebnis

1. Konsistente Formular-Breiten auf Desktop (max-w-4xl)
2. Korrekte Datenübernahme zwischen Yes/No-Fragebogen und Expert-Modus für die Depotkonto-Frage
3. Keine Datenverluste beim Wechsel zwischen Formular-Modi
