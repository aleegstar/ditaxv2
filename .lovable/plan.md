
# Plan: Automatisches Löschen von unbestätigten Konten bei fehlerhafter E-Mail-Eingabe

## Problemanalyse

Wenn ein Benutzer beim Anmeldevorgang eine falsche E-Mail eingibt:
1. Supabase erstellt automatisch einen neuen Benutzer in `auth.users` beim Senden des OTP
2. Ein Profil wird durch einen Datenbank-Trigger erstellt
3. Der Benutzer erhält den OTP-Code nicht (da falsche E-Mail)
4. Er klickt auf "E-Mail ändern" und gibt die richtige E-Mail ein
5. Das "fehlerhafte" Konto bleibt 7 Tage in der Datenbank

## Lösungsansatz

### Option 1: Schnellere Cleanup-Zeit (Empfohlen)
Die bestehende `cleanup-inactive-users` Funktion von 7 auf 1 Tag anpassen.

### Option 2: Sofortige Löschung beim "E-Mail ändern"
Eine neue Edge Function, die aufgerufen wird, wenn ein Benutzer die E-Mail ändert ohne den OTP einzulösen.

---

## Gewählte Lösung: Kombination beider Ansätze

### 1. Edge Function: `cleanup-unverified-registrations`
Neue Edge Function speziell für unbestätigte Registrierungen:

```text
+-------------------+     +----------------------+     +------------------+
| Benutzer gibt     | --> | OTP wird gesendet    | --> | Benutzer klickt  |
| falsche E-Mail    |     | Account erstellt     |     | "E-Mail ändern"  |
+-------------------+     +----------------------+     +--------+---------+
                                                                |
                                                                v
                                                       +------------------+
                                                       | Prüfe: Hat der   |
                                                       | Account Daten?   |
                                                       +--------+---------+
                                                                |
                                    +---------------------------+---------------------------+
                                    |                                                       |
                                    v                                                       v
                            +----------------+                                      +----------------+
                            | NEIN: Lösche   |                                      | JA: Behalte    |
                            | Account sofort |                                      | Account        |
                            +----------------+                                      +----------------+
```

### 2. Änderungen in `EnhancedLoginFlow.tsx`
Beim Klick auf "E-Mail ändern":
- Prüfen, ob der gerade erstellte Benutzer Daten hat
- Falls nicht und nie eingeloggt: Edge Function zum Löschen aufrufen

### 3. Update `cleanup-inactive-users`
- Zeitraum von 7 Tagen auf 24 Stunden reduzieren für Accounts ohne `terms_accepted_at`

---

## Implementierungsdetails

### Neue Edge Function: `cleanup-unverified-registrations/index.ts`

| Aspekt | Details |
|--------|---------|
| Trigger | Manuell vom Frontend beim "E-Mail ändern" |
| Parameter | `email` - Die zu prüfende/löschende E-Mail |
| Sicherheit | Service Role Key, prüft ob Account keine Daten hat |
| Kriterien für Löschung | Kein `terms_accepted_at`, kein `last_sign_in_at` (außer Initial), keine Profildaten |

### Frontend-Änderungen: `EnhancedLoginFlow.tsx`

```tsx
// Neue Funktion: cleanupUnverifiedAccount
const cleanupUnverifiedAccount = async (emailToCleanup: string) => {
  try {
    await supabase.functions.invoke('cleanup-unverified-registrations', {
      body: { email: emailToCleanup }
    });
  } catch (error) {
    // Fehler stillschweigend ignorieren - nicht kritisch
    console.warn('Cleanup of unverified account failed:', error);
  }
};

// Button "E-Mail ändern" - erweiterte Logik
onClick={() => {
  // Cleanup des möglicherweise fehlerhaften Accounts
  if (email && !otpCode) {
    cleanupUnverifiedAccount(email);
  }
  setStep('email');
  setOtpCode('');
  setHasPasskeys(false);
}}
```

### Bestehende Edge Function anpassen: `cleanup-inactive-users/index.ts`

```typescript
// Schnellerer Cleanup für Accounts ohne Consent
const fastCleanupThreshold = new Date();
fastCleanupThreshold.setHours(fastCleanupThreshold.getHours() - 24);

// Prüfung: Account ohne terms_accepted_at UND älter als 24h
const shouldFastDelete = (user, profile) => {
  return !profile?.terms_accepted_at && 
         new Date(user.created_at) < fastCleanupThreshold;
};
```

---

## Sicherheitsüberlegungen

| Risiko | Mitigation |
|--------|------------|
| Missbrauch zum Löschen fremder Accounts | Nur Accounts ohne Daten und ohne Login werden gelöscht |
| Race Condition bei gleichzeitiger Verifizierung | Prüfung auf `last_sign_in_at` bevor Löschung |
| Spam-Cleanup-Aufrufe | Rate Limiting auf Edge Function |

---

## Dateien, die geändert werden

| Datei | Änderung |
|-------|----------|
| `supabase/functions/cleanup-unverified-registrations/index.ts` | Neue Edge Function erstellen |
| `src/components/auth/EnhancedLoginFlow.tsx` | Cleanup bei "E-Mail ändern" aufrufen |
| `supabase/functions/cleanup-inactive-users/index.ts` | 24h-Schnell-Cleanup für Accounts ohne Consent |

---

## Erwartetes Ergebnis

- Fehlerhafte Registrierungen werden sofort beim "E-Mail ändern" bereinigt
- Übersehene Fälle werden innerhalb von 24 Stunden automatisch gelöscht
- Legitime Accounts (mit Daten oder erfolgreichem Login) bleiben geschützt
- Keine "Geisterkonten" mehr in der Datenbank
