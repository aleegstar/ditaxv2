# Reibungsloses Onboarding via Despia Vault + Anonymous Auth

## Ziel

Neue User in der Despia‑App sollen die App **ohne Login** sofort nutzen können. Erst wenn sie Daten investiert haben (z. B. Dokument hochgeladen), fragen wir nach Email für einen vollwertigen Account, damit sie später auch am PC weiterarbeiten können.

Web‑User (Browser/PC) gehen weiterhin direkt auf `/auth` — Vault gibt es dort nicht.

## User Flow

```text
Despia App Start
   │
   ▼
/welcome  ── "Hast du bereits ein Konto?" ──► JA ──► /auth (Email/Passkey/Google/Apple)
                                              │
                                              └── NEIN ──► "Direkt starten"
                                                              │
                                                              ▼
                                                      Anonyme Session
                                                      (Vault‑ID = Anker)
                                                              │
                                                              ▼
                                          User nutzt App (Upload, Formular…)
                                                              │
                                  Trigger (nach 1. Upload / vor Bezahlung) ──► AppDialog
                                  "Sichere deinen Fortschritt –
                                   Email hinzufügen, um auch am PC weiterzumachen"
                                                              │
                                          ┌───────────────────┴───────────────────┐
                                          ▼                                       ▼
                                Email + Magic Link                          "Später"
                                (Anonymous → Permanent Account)             (max. 2× snooze,
                                                                             dann Hard‑Block
                                                                             vor Checkout)
```

Bestehende Vault‑Logik (`src/lib/deviceVault.ts`) bleibt unverändert — sie liefert die persistente Geräte‑ID, auch nach App‑Reinstall.

## Architektur

### 1. Anonymous Sign‑In (Supabase Native)
Supabase unterstützt `supabase.auth.signInAnonymously()` → erzeugt einen `auth.users`‑Eintrag mit `is_anonymous=true`. JWT enthält Claim `is_anonymous`, Rolle ist `authenticated`. Token wird wie ein normaler Login in `localStorage` persistiert.

**Voraussetzung:** Anonymous Sign‑Ins müssen im Supabase Dashboard aktiviert werden (Auth → Sign‑In Providers → Anonymous). Das ist eine manuelle Einstellung, ich liefere den Link.

### 2. Vault‑Bindung
Neuer Vault‑Key `ditax_anon_uid` speichert die Supabase `user.id` der anonymen Session. Bei jedem App‑Start in Despia:

```
1. session = supabase.auth.getSession()
2. wenn session vorhanden → fertig (autoRefresh übernimmt)
3. sonst: anonUid = vault.read('ditax_anon_uid')
   - wenn vorhanden: signInAnonymously() + recovery via Edge Function
     ODER:  signInAnonymously() neu (vault wird überschrieben)
   - wenn nicht: signInAnonymously() + vault.write(user.id)
```

Da der Refresh‑Token nach 60 Tagen Inaktivität abläuft und Anonymous Recovery serverseitig nicht trivial ist, **starten wir bewusst pragmatisch**: bei abgelaufener Session legen wir einen neuen anonymen User an und der alte verwaiste Datensatz wird per Nightly‑Cleanup gelöscht (`cleanup-inactive-users` existiert bereits). Vault verhindert Mehrfach‑Accounts pro App‑Session.

**Verbesserte Variante (Phase 2, optional):** Vault speichert zusätzlich den `refresh_token`. Bei App‑Start versuchen wir `supabase.auth.setSession({refresh_token})` zuerst. Dadurch überleben Anonymous‑Sessions auch App‑Neuinstallationen.

### 3. Anonymous → Permanent Upgrade
Supabase liefert dafür `supabase.auth.updateUser({ email })` auf einem anonymen User. Ablauf:

```
1. User gibt Email ein
2. supabase.auth.updateUser({ email: x })
   → schickt Bestätigungsmail (Magic Link Type "email_change")
3. User klickt Link → Account wird permanent, is_anonymous=false
4. Alle bestehenden Daten (form_data, documents, tax_filers…) bleiben,
   weil user_id unverändert ist.
```

Zusätzlich Passkey‑Option: nach Email‑Verifikation Passkey registrieren (vorhandener Flow).

### 4. RLS / Datenschutz
Alle bestehenden Policies basieren auf `auth.uid() = user_id` — funktionieren ohne Änderung für anonyme User, weil sie ebenfalls die `authenticated`‑Rolle haben.

**Aber:** wir wollen einige Aktionen für anonyme User **sperren**:
- Bezahlung (`create-payment`) — User muss vorher Email verknüpfen, sonst kann er die Rechnung/Steuererklärung am PC nie wieder einsehen.
- Newsletter‑Versand.
- Tax‑Return‑Submission an die Steuerverwaltung.

Umsetzung: Edge Functions prüfen `user.is_anonymous === true` (aus JWT) und antworten mit `409 ACCOUNT_NOT_VERIFIED`. Frontend zeigt dann die Upgrade‑Modal.

### 5. Web‑Verhalten
`isDespiaNative()===false` → /welcome leitet direkt auf /auth weiter (kein anonymer Flow). Damit Web‑Nutzer wie heute funktionieren.

## Umsetzung — Schritte

### Schritt 1: Supabase Setup (manuell + Migration)
- Anonymous Sign‑Ins im Dashboard aktivieren (Link wird geliefert).
- Migration: kleines Audit‑Log `anonymous_upgrades` (user_id, upgraded_at, vault_id_hash) für Analytics.
- RLS‑Policy Review: bestehende Policies inspizieren, ob sie `is_anonymous` blockieren sollten (für `payments`, `tax_returns_signed`).

### Schritt 2: Vault‑Service erweitern
`src/lib/deviceVault.ts`:
- Bestehender `ditax_did` bleibt für AI‑Rate‑Limiting.
- Neue Funktionen `readAnonUid()`, `writeAnonUid(id)` mit Key `ditax_anon_uid`.
- Phase 2: optional `readAnonRefreshToken()` / `writeAnonRefreshToken()`.

### Schritt 3: Welcome‑Screen
`src/pages/Welcome.tsx` + `src/components/welcome/WelcomeFlow.tsx`:
- Neuer Einstiegs‑Step für Despia‑Native:
  - Headline: „Willkommen bei Ditax"
  - Primärer Button: „Direkt starten" → anonymer Login
  - Sekundärer Link: „Ich habe bereits ein Konto" → `/auth`
- Web: redirect auf `/auth` (wie heute).
- Routing: Despia‑User landen beim Cold‑Start auf `/welcome` statt `/auth`, wenn keine Session existiert.

### Schritt 4: Anonymous Auth Service
Neu: `src/services/AnonymousAuthService.ts`
- `startAnonymousSession()`: prüft Vault, ruft `signInAnonymously()`, schreibt `user.id` in Vault.
- `isAnonymousUser()`: liest JWT‑Claim.
- `upgradeToEmail(email)`: ruft `updateUser({email})`, zeigt Toast "Bestätigungslink versendet".
- AuthContext erweitern um `isAnonymous: boolean`.

### Schritt 5: Upgrade‑Prompt
- Neue Komponente `UpgradeAccountDialog` (AppDialog‑Standard).
- Trigger:
  - Nach erstem erfolgreichen Dokument‑Upload (`Documents.tsx`).
  - Hart vor `Payment.tsx` (kein „Später").
  - Snooze max. 2× via LocalStorage (`ditax_upgrade_snoozed_count`).
- Inhalt: Email‑Input + Erklärung „So kannst du am PC weitermachen".

### Schritt 6: Edge‑Function Guards
`create-payment`, `sign-tax-return`, `send-newsletter` etc.: bei `is_anonymous` mit 409 abbrechen.

### Schritt 7: Cleanup
- `cleanup-inactive-users` so erweitern, dass anonyme User ohne Aktivität nach z. B. 30 Tagen + ohne Daten gelöscht werden.

### Schritt 8: Translations
DE/EN für Welcome‑Buttons, Upgrade‑Modal, Toasts.

## Nicht im Scope
- Vault‑basierte Cross‑Device‑Migration (Vault = device‑lokal). Cross‑Device geht nur über Email‑Upgrade.
- Automatischer Merge zweier Accounts, falls User später einen bestehenden Account verknüpfen will (verhindert via „Hast du bereits ein Konto?" Frage am Anfang).
- Passkey direkt als Upgrade‑Methode in Phase 1 (Email‑Link reicht).

## Manuelle Schritte für dich
1. Supabase Dashboard → Authentication → Providers → **Anonymous Sign‑Ins aktivieren**.
2. Email‑Template "Email Change" optional auf Ditax‑Brand anpassen.

## Offene Fragen (bitte beantworten bevor Build)
1. **Trigger‑Zeitpunkt für Upgrade‑Prompt:** sofort nach 1. Upload, oder erst beim Verlassen des Uploads / vor Checkout?
2. **Hard‑Block:** vor `create-payment` zwingend Email verlangen — okay?
3. **Phase 2 (Refresh‑Token im Vault):** jetzt direkt mit umsetzen, oder erst nachgelagert?
4. **Welcome‑Copy:** „Direkt starten" vs. „Ohne Konto starten" vs. „Loslegen" — Präferenz?
