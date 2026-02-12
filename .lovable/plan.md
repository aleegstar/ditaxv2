
# Weisser Bildschirm beheben - Loading States vereinheitlichen

## Problem

Die App zeigt an mehreren Stellen `null` (= komplett weisser Bildschirm) statt eines Loading-Spinners an. Das passiert bei folgenden Stellen:

1. **`App.tsx` Zeile 554-556**: Gibt `null` zurueck waehrend `isLoading` aktiv ist - kein visuelles Feedback
2. **`Index.tsx` Zeile 200-202**: Gibt `null` zurueck waehrend Auth-Check, `authChecked` und `taxFilerLoading` laufen
3. **`Index.tsx` Zeile 205-207**: Gibt `null` zurueck bei fehlender Auth oder Person-Auswahl (statt sofort weiterzuleiten)
4. **`IndexContent` Zeile 95-97**: Gibt `null` zurueck waehrend `checkingImport` aktiv ist

Wenn diese Ladezustaende zusammentreffen (z.B. bei Seitenwechsel, Token-Erneuerung, oder langsamer Verbindung), sieht der Nutzer einen weissen Bildschirm.

## Loesung

Alle `return null` Stellen durch `<LoadingSpinner fullScreen />` ersetzen, damit immer visuelles Feedback erscheint.

## Technische Aenderungen

### 1. `src/App.tsx`
- Zeile 554-556: `return null` durch `return <LoadingSpinner fullScreen />` ersetzen

### 2. `src/pages/Index.tsx`
- Zeile 200-202: `return null` durch `return <LoadingSpinner fullScreen />` ersetzen
- Zeile 205-207: `return null` durch `return <LoadingSpinner fullScreen />` ersetzen
- Zeile 96-97: `return null` durch `return <LoadingSpinner fullScreen />` ersetzen (waehrend Import-Check)

### Ergebnis
- Kein weisser Bildschirm mehr bei Ladezustaenden
- Konsistenter Loading-Spinner ueberall in der App
- Bessere Nutzererfahrung, besonders auf langsameren Verbindungen oder mobilen Geraeten
