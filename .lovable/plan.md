# Anonymous Auth & Auth-Vault entfernen

Ziel: Kein Login ohne echtes Konto mehr. Jeder User muss sich per E-Mail / OAuth / Passkey einloggen. Die im Storage Vault gespeicherte anonyme User-ID wird ebenfalls entfernt, weil sie nur dem unsicheren Anon-Flow gedient hat.

## Was wird entfernt

**Anonymous Auth Flow**
- `src/services/AnonymousAuthService.ts` — komplett löschen (`startAnonymousSession`, `upgradeAnonymousToEmail`, `isAnonymousUser`, `canUseAnonymousFlow`).
- `src/contexts/AnonymousUpgradeContext.tsx` — komplett löschen (Provider + `useAnonymousUpgrade`).
- `src/components/auth/UpgradeAccountDialog.tsx` — komplett löschen.
- `src/pages/Start.tsx` — komplett löschen (war nur der „Direkt starten" Chooser für Despia).

**Routing**
- `src/App.tsx`: `Start` Import + `<Route path="/start">` entfernen. Das `<Navigate>` für nicht-eingeloggte Despia-User zeigt jetzt immer auf `/auth` (statt `/start`). `<AnonymousUpgradeProvider>` aus dem Provider-Baum nehmen.

**Auth-Vault Keys**
- `src/lib/deviceVault.ts`: `ANON_UID_KEY`, `readAnonUid`, `writeAnonUid`, `clearAnonUid` entfernen. `getOrCreateDeviceId` / `buildDeviceHeaders` und der Device-ID-Key (`ditax_did`) bleiben — die werden ausschließlich für AI-Rate-Limiting (`x-device-id` Header) benutzt, sind keine Auth-Funktion und kein Sicherheitsrisiko.

**AuthContext / UI Cleanup**
- `src/contexts/AuthContext.tsx`: Feld `isAnonymous` und alle `is_anonymous` Auswertungen entfernen. Der Context bleibt sonst unverändert.
- `src/components/PaymentSection.tsx`: `useAnonymousUpgrade`, `isAnonymous`-Branch und der hardBlock-Dialog vor Stripe entfernen. Payment funktioniert direkt, weil jetzt jeder eingeloggte User per Definition eine E-Mail hat.
- `src/pages/Documents.tsx`: `useAnonymousUpgrade`-Import + `requestUpgrade`-Aufrufe entfernen.

**Edge Functions**
- `supabase/functions/create-payment/index.ts`: Den `if ((user as any).is_anonymous === true)`-Block (Z. 173–186) entfernen — anonyme Sessions existieren nicht mehr.

**DB / Supabase Settings**
- Migration: Tabelle `public.anonymous_upgrades` droppen (war nur Audit-Log für den entfernten Upgrade-Flow).
- Supabase Dashboard: „Allow anonymous sign-ins" deaktivieren (manueller Schritt, im Chat erwähnen).

**Memory**
- `mem://features/anonymous-account-onboarding` löschen und aus `mem://index.md` Core-Liste entfernen.

## Was bleibt unverändert

- E-Mail/Passwort, Magic Link, Google, Apple, Passkey-Login.
- `x-device-id` Header + Device-ID Vault Key für AI-Rate-Limiting (reine Anti-Abuse-Maßnahme, kein Auth-Mechanismus).
- `OfflineGate` / `/offline-upload` / Documents-Review-Flow aus dem vorherigen Schritt.

## Risiken

- Bestehende anonyme Sessions in Production werden beim nächsten Reload an `/auth` umgeleitet und können sich nicht mehr automatisch wiederherstellen. Eingegebene Daten dieser Sessions sind dann nicht mehr zugänglich, weil ohne E-Mail kein Login möglich ist. Sollte vor Deploy kommuniziert werden, falls es solche User gibt.
- Despia-Native-User landen jetzt direkt auf `/auth` statt auf `/start` — ein zusätzlicher Schritt, dafür kein unsicherer Quick-Path.
