## Fix: Cross-User Avatar-Deletion in `delete-user-account`

### Befund
`profiles.avatar_url` ist user-kontrolliert (Self-Upload). Im aktuellen `delete-user-account` (Zeilen 156–158) wird dieser Pfad ungeprüft an `supabaseAdmin.storage.from('avatars').remove([...])` weitergereicht. Service-Role umgeht Storage-RLS → ein Angreifer kann seinen `avatar_url` auf `{andere-user-id}/avatar.png` setzen und beim eigenen Account-Löschen fremde Avatar-Dateien mitlöschen.

Impact: niedrig (nur `avatars`-Bucket, nur Self-Trigger, keine PII-Exposition), aber echter Cross-User-Write – im Gegensatz zum admin-operations Finding kein False Positive.

### Änderung (minimal, nur diese Stelle)

Datei: `supabase/functions/delete-user-account/index.ts`, Zeilen 156–158

```ts
if (profile?.avatar_url) {
  const avatarPath = profile.avatar_url;
  const expectedPrefix = `${userId}/`;
  if (avatarPath.startsWith(expectedPrefix)) {
    filesToDelete.push({ bucket: 'avatars', path: avatarPath });
  } else {
    console.warn(
      `Avatar path validation failed for user ${userId}. Path: ${avatarPath} does not start with expected prefix: ${expectedPrefix}`
    );
    await supabaseAdmin.from('security_audit_logs').insert({
      user_id: userId,
      action: 'AVATAR_DELETION_BLOCKED',
      success: false,
      resource: 'avatars',
      error_message: `Blocked deletion of avatar path that does not belong to user: ${avatarPath}`,
    });
    // Continue with account deletion but skip the invalid avatar file
  }
}
```

Kein anderer Code wird angefasst. Kein Schema-Change, keine neue Migration, keine RPC-Umstellung, keine Tenant-Fiktion.

### Verifikation
1. Prüfen, dass aktuelle Avatar-Uploads tatsächlich dem `{userId}/...`-Pfad-Schema folgen (Storage-Policies/Avatar-Upload-Code), damit legitime Löschungen nicht blockiert werden.
2. Edge-Function-Deploy.
3. Smoke-Test via Logs: legitimer Self-Delete → Avatar wird gelöscht. Manipulierter `avatar_url` (via DB-Update in Testumgebung) → `AVATAR_DELETION_BLOCKED` Audit-Eintrag, Account-Deletion läuft trotzdem durch.

### Aikido-Finding
Nach Fix-Deploy: `manage_security_finding` → `mark_as_fixed` mit Begründung „Avatar path now validated against `{userId}/` prefix before storage deletion."
