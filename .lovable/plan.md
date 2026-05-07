## Problem

Der `SIGNED_IN`-Listener in `TaxFilerContext` löscht die gespeicherte Personen-Auswahl bei **jedem** `SIGNED_IN`-Event. Supabase feuert dieses Event aber nicht nur bei einem echten Login, sondern auch bei:
- Tab-Fokus-Wechsel
- Token-Refresh in manchen Konstellationen
- Wiederherstellen der Session beim erneuten Öffnen der App
- Rückkehr aus dem Hintergrund (mobile / Despia)

Dadurch landet der User immer wieder auf `/select-person`, obwohl er die Person bereits ausgewählt hat.

## Lösung

Auswahl nur löschen, wenn es sich um einen **echten frischen Login** handelt — also wenn der User vorher nicht eingeloggt war. Das wird über eine explizite Markierung beim Login-Vorgang erreicht, nicht über Auth-Events.

### Schritte

1. **`TaxFilerContext.tsx`**
   - Den `SIGNED_IN`-Listener entfernen, der pauschal die Auswahl löscht.
   - Stattdessen beim Mount prüfen, ob ein Flag `ditax_force_person_selection` in `sessionStorage` gesetzt ist. Wenn ja: Auswahl löschen + Flag entfernen.

2. **Auth-Eintrittspunkte** — direkt nach erfolgreichem Sign-in das Flag setzen:
   - `src/pages/Auth.tsx` (Email/Passwort, Sign-up)
   - `src/pages/AuthSuccess.tsx` (OAuth callback)
   - `src/pages/NativeCallback.tsx` (Despia native)
   - WebAuthn / Passkey Login-Pfade

   Jeweils direkt vor dem `navigate('/')`:
   ```ts
   sessionStorage.setItem('ditax_force_person_selection', '1');
   ```

3. **Logout** — Flag in der Reset-Logik mit aufräumen (in `TaxFilerContext` beim Logout-Effect).

## Ergebnis

- Frischer Login mit mehreren Personen → `/select-person` (gewollt)
- App neu geöffnet / aus Hintergrund / Token-Refresh → bleibt auf zuletzt aktiver Route mit zuletzt gewählter Person
- User klickt aktiv auf Personen-Selector → `/select-person` (bereits implementiert in `TaxFilerSelector`)
