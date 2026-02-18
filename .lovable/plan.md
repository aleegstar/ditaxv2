

# Fix: Alle sensiblen Routen mit ProtectedRoute schuetzen

## Problem

Innerhalb von `AuthenticatedApp` sind einige Routen **nicht** in `ProtectedRoute` eingebettet. Die aeussere Auth-Pruefung (`isAuthenticated`) verhindert zwar den Zugang fuer komplett unauthentifizierte User, aber bei Client-Side-Navigation (z.B. vom Checklist-Popup zu `/payment`) kann eine kurze Session-Luecke dazu fuehren, dass die Seite ohne gueltige Session gerendert wird.

## Betroffene Routen

Folgende Routen haben aktuell **keinen** `ProtectedRoute`-Schutz und benoetigen einen:

| Route | Komponente | Risiko |
|-------|-----------|--------|
| `/` | UserTaxReturns | Zeigt Steuerdaten |
| `/select-person` | SelectPerson | Zeigt Steuerpflichtige |
| `/welcome` | Welcome | Onboarding mit User-Daten |
| `/form` | Index | Steuerformular |
| `/form/documents/upload/:itemId` | DocumentUploadPage | Dokument-Upload |
| `/payment` | PaymentPage | **Bekanntes Problem** - zeigt "Bitte anmelden" |
| `/payment-success` | PaymentSuccess | Zahlungsbestaetigung |
| `/chat` | Chat | User-Chat |
| `/feedback` | Feedback | User-Feedback |

Routen die **bewusst ohne** ProtectedRoute bleiben (oeffentlich/informativ):
- `/help` - Hilfeseite
- `/privacy`, `/terms`, `/cookies`, `/acceptable-use`, `/privacy-settings` - Rechtliche Seiten
- `/debug` - Debug-Seite

## Loesung

In `src/App.tsx` alle oben genannten Routen mit `ProtectedRoute` umschliessen.

Zusaetzlich in `src/components/PaymentSection.tsx` den Auth-Listener vor `getSession()` registrieren (wie im vorherigen Plan beschrieben).

## Technische Details

### Datei: `src/App.tsx`

Jede betroffene Route wird wie folgt geaendert:

```tsx
// Vorher:
<Route path="/payment" element={<PaymentPage />} />

// Nachher:
<Route path="/payment" element={
  <ProtectedRoute>
    <PaymentPage />
  </ProtectedRoute>
} />
```

Das gleiche Muster wird auf alle 9 betroffenen Routen angewendet.

### Datei: `src/components/PaymentSection.tsx`

Auth-Listener wird vor `getSession()` registriert, um Race Conditions zu vermeiden:

```typescript
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    setIsLoggedIn(!!session);
  });
  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsLoggedIn(!!session);
  };
  checkAuth();
  return () => subscription.unsubscribe();
}, []);
```

## Erwartetes Ergebnis

- Alle sensiblen Routen pruefen die Session doppelt ab (aeussere + innere Pruefung)
- Kein "Bitte anmelden"-Problem mehr bei Client-Side-Navigation
- Oeffentliche Seiten (Hilfe, Rechtliches) bleiben frei zugaenglich

