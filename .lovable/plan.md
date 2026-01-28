
# Plan: Fehlende DELETE RLS-Policy für Benachrichtigungen hinzufügen

## Problemanalyse

Das Löschen von Benachrichtigungen funktioniert nicht dauerhaft, weil die **DELETE RLS-Policy fehlt**.

### Aktueller Zustand der `user_notifications` Tabelle

| Operation | RLS-Policy | Status |
|-----------|-----------|--------|
| SELECT | `Users can view their own notifications` | ✅ Vorhanden |
| INSERT | `Service role can create notifications` | ✅ Vorhanden |
| UPDATE | `Users can update their own notifications` | ✅ Vorhanden |
| **DELETE** | **Keine Policy** | ❌ **FEHLT** |

### Was passiert beim Löschen

1. Benutzer klickt auf "Löschen"
2. Frontend sendet DELETE-Request an Supabase
3. **RLS blockiert die Löschung** (keine Policy = kein Zugriff)
4. Kein Fehler wird zurückgegeben (stille Ablehnung)
5. Lokaler State wird trotzdem aktualisiert → Benachrichtigung verschwindet
6. Beim Neuladen werden Daten aus DB geladen → Benachrichtigung erscheint wieder

## Lösung

Eine DELETE RLS-Policy erstellen, die Benutzern erlaubt, ihre eigenen Benachrichtigungen zu löschen.

## Technische Umsetzung

### Neue RLS-Policy (SQL Migration)

```sql
CREATE POLICY "Users can delete their own notifications"
  ON public.user_notifications
  FOR DELETE
  USING (auth.uid() = user_id);
```

Diese Policy:
- Gilt nur für DELETE-Operationen
- Erlaubt Löschung nur wenn `auth.uid()` = `user_id`
- Verhindert, dass Benutzer fremde Benachrichtigungen löschen können

## Erwartetes Ergebnis

- Benutzer können ihre eigenen Benachrichtigungen löschen
- Gelöschte Benachrichtigungen bleiben nach dem Neuladen gelöscht
- Sicherheit bleibt gewahrt (nur eigene Benachrichtigungen löschbar)
