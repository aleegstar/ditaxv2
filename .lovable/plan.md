
# Plan: MFA Code-Eingabe auf OTP-Style umstellen

## Problemanalyse
Die MFA-Verifizierungsseite (`MfaVerify.tsx`) verwendet aktuell ein einzelnes Eingabefeld mit der Schriftart `font-mono`, was zu einem uneinheitlichen Erscheinungsbild führt. Die Code-Eingabe soll stattdessen wie bei OTP-Eingaben mit separaten Feldern für jede Ziffer dargestellt werden.

## Lösungsansatz
Die bestehende `InputOTP` Komponente ist bereits im Projekt vorhanden und wird in `MfaChallenge.tsx` korrekt verwendet. Wir müssen nur die `MfaVerify.tsx` Seite entsprechend anpassen.

## Änderungen

### Datei: `src/pages/MfaVerify.tsx`

**1. Import anpassen:**
- `Input` Import entfernen
- `InputOTP`, `InputOTPGroup`, `InputOTPSlot` importieren

**2. Code-Eingabe-Bereich ersetzen:**
Das aktuelle einzelne Input-Feld:
```tsx
<Input
  id="mfa-code"
  type="text"
  placeholder="000000"
  value={code}
  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
  onKeyPress={handleKeyPress}
  className="text-center text-lg font-mono tracking-widest"
  maxLength={6}
  disabled={!challengeId}
  autoFocus
/>
```

Wird ersetzt durch OTP-Eingabefelder:
```tsx
<div className="flex justify-center">
  <InputOTP
    maxLength={6}
    value={code}
    onChange={(value) => setCode(value)}
    disabled={!challengeId}
    onKeyDown={handleKeyPress}
    autoFocus
  >
    <InputOTPGroup className="gap-2">
      <InputOTPSlot index={0} className="w-12 h-12 text-lg rounded-lg border-slate-200 font-sans" />
      <InputOTPSlot index={1} className="w-12 h-12 text-lg rounded-lg border-slate-200 font-sans" />
      <InputOTPSlot index={2} className="w-12 h-12 text-lg rounded-lg border-slate-200 font-sans" />
      <InputOTPSlot index={3} className="w-12 h-12 text-lg rounded-lg border-slate-200 font-sans" />
      <InputOTPSlot index={4} className="w-12 h-12 text-lg rounded-lg border-slate-200 font-sans" />
      <InputOTPSlot index={5} className="w-12 h-12 text-lg rounded-lg border-slate-200 font-sans" />
    </InputOTPGroup>
  </InputOTP>
</div>
```

**3. Label-Bereich anpassen:**
- `htmlFor` Attribut vom Label entfernen (nicht mehr benötigt bei OTP-Input)
- Label-Styling beibehalten

## Technische Details

| Aspekt | Details |
|--------|---------|
| Betroffene Datei | `src/pages/MfaVerify.tsx` |
| Entfernte Imports | `Input` |
| Neue Imports | `InputOTP`, `InputOTPGroup`, `InputOTPSlot` |
| Schriftart | `font-sans` statt `font-mono` für einheitliches Design |
| Slot-Styling | 48x48px Boxen mit abgerundeten Ecken und hellgrauer Umrandung |

## Erwartetes Ergebnis
- 6 separate Eingabefelder für jede Ziffer des MFA-Codes
- Einheitliche Schriftart (keine Monospace-Schrift mehr)
- Konsistentes Design mit der `MfaChallenge.tsx` Komponente
- Verbesserte Benutzerfreundlichkeit durch klare visuelle Trennung der Ziffern
