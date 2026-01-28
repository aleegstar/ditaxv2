
# Plan: Auth-Seite UI-Text anpassen

## Problemanalyse

Die Änderungen wurden in der falschen Datei gemacht. Es gibt zwei Auth-Komponenten:

| Datei | Wird verwendet auf | Status |
|-------|-------------------|--------|
| `src/pages/Auth.tsx` | `/auth` Route | **Diese muss geändert werden** |
| `src/components/auth/EnhancedLoginFlow.tsx` | Wird nicht verwendet | Wurde fälschlicherweise geändert |

## Gewünschte Änderungen

1. **E-Mail Label hinzufügen**: "Email:" oberhalb des Inputfeldes
2. **Placeholder ändern**: Von "name@firma.com" zu "name@mail.com"
3. **Button-Text ändern**: Von "Anmelden" zu "Login Code senden"

## Technische Umsetzung

### Datei: `src/pages/Auth.tsx`

**Zeile 456-466 anpassen:**

```tsx
// Vorher (aktuell)
<div className="space-y-1.5">
  <div className="relative">
    <input ... placeholder="name@firma.com" ... />
  </div>
</div>
<button ...>
  {isEmailLoading ? 'Code wird gesendet...' : 'Anmelden'}
</button>

// Nachher (neu)
<div className="space-y-1.5">
  <label className="text-sm font-medium text-slate-700 font-jakarta">
    Email:
  </label>
  <div className="relative">
    <input ... placeholder="name@mail.com" ... />
  </div>
</div>
<button ...>
  {isEmailLoading ? 'Code wird gesendet...' : 'Login Code senden'}
</button>
```

## Erwartetes Ergebnis

Die `/auth` Seite zeigt:
- "Email:" Label über dem Eingabefeld
- Placeholder "name@mail.com"
- Button mit Text "Login Code senden"
