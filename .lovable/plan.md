
# Problem: Dashboard zeigt "Benutzer" statt echtem Namen

## Ursache (Race Condition)

Das Problem hat drei Schichten:

**Schicht 1 – `useProfile.ts` hat keine Wiederholungslogik:**
Wenn `fetchProfile()` fehlschlägt (z.B. weil `supabase.auth.getUser()` kurz nach dem Login noch einen Netzwerkfehler liefert oder die Session noch nicht voll propagiert ist), wird `profile` auf `null` belassen und `loading` auf `false` gesetzt. Das passiert im `finally`-Block. Resultat: Die UI rendert sofort mit leerem Profil.

**Schicht 2 – `UserTaxReturns` rendert ohne Profil:**
Die Skeleton-Anzeige in Zeile 262 wartet auf `profileLoading === false`. Sobald das eintritt (auch wenn `profile === null`), wird der echte Inhalt gerendert — mit dem Fallback-Namen "Benutzer".

**Schicht 3 – Kein Re-Fetch bei fehlgeschlagenem Profil:**
Es gibt keine Mechanismus, der erkennt: „`isValid` ist `true`, aber `profile` ist `null` ohne Fehler-State" → erneut laden.

## Lösung

### Fix 1: Retry-Logik in `useProfile.ts`
Wenn `fetchProfile()` mit einem Auth-Fehler scheitert aber `isValid` noch `true` ist, wird automatisch bis zu 3-mal nach kurzem Warten erneut versucht. Erst wenn alle Versuche scheitern oder die Session wirklich ungültig wird, wird `loading: false` gesetzt.

```
fetchProfile()
  → Fehler? → warte 500ms → erneut versuchen (max. 3x)
  → Dann erst loading: false
```

### Fix 2: Skeleton bleibt sichtbar wenn `isValid` aber kein Profil
In `UserTaxReturns.tsx` eine zusätzliche Bedingung hinzufügen: Wenn Auth gültig ist (`isValid`) und `profileLoading` false ist, aber `userProfile` noch `null` ist — Skeleton weiterhin anzeigen (mit eigenem Safety-Timeout von 3s):

```tsx
// Zusätzliche Guard: isValid aber kein Profil geladen
if (isValid && !profileLoading && !userProfile && !safetyTimeout) {
  return <UserTaxReturnsSkeleton />;
}
```

## Dateien die geändert werden

### `src/hooks/useProfile.ts`
- Retry-Zähler hinzufügen (max. 3 Versuche, jeweils 500ms Pause)
- Nur wenn alle Retries scheitern oder Session ungültig → `loading: false`
- Retries werden abgebrochen wenn `isValid` sich ändert (Cleanup)

### `src/pages/UserTaxReturns.tsx`
- Zusätzliche Skeleton-Bedingung: `isValid && !userProfile && !profileLoading`
- Verhindert, dass "Benutzer" jemals angezeigt wird solange eine gültige Session besteht

## Technische Details

```text
Aktueller Ablauf (fehlerhaft):
  AuthContext: isValid=true
       ↓
  useProfile: fetchProfile() → Netzwerkfehler/Auth-Race
       ↓
  finally: setLoading(false) ← profile bleibt null
       ↓
  UserTaxReturns: profileLoading=false → rendert "Benutzer" ✗

Neuer Ablauf (korrekt):
  AuthContext: isValid=true
       ↓
  useProfile: fetchProfile() → Fehler → Retry 1 (nach 500ms)
                             → Fehler → Retry 2 (nach 500ms)
                             → Erfolg → setProfile(data), setLoading(false) ✓
  Falls alle Retries scheitern:
       ↓
  UserTaxReturns: isValid && !userProfile → Skeleton bleibt sichtbar
                  (Safety-Timeout nach 3s entsperrt dann trotzdem)
```

Die Lösung ist minimal-invasiv und ändert nur die zwei betroffenen Dateien.
