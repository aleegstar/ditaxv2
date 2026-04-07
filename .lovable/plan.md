

## Plan: Sicherheitslücken aus Scan schliessen

### Erkannte Probleme

**2 aktive Findings aus dem Security-Scan:**

1. **Audit Log Forgery (ERROR)** — Die Policy `"Service role and edge functions can insert audit logs"` auf `security_audit_logs` erlaubt jedem authentifizierten User (`authenticated` role) Log-Einträge zu schreiben. Das ermöglicht das Fälschen von Security-Logs. Eine korrekte `service_role`-only Policy existiert bereits parallel.

2. **Realtime Channel Subscription (ERROR)** — Keine RLS-Policies auf `realtime.messages`. Dies ist jedoch eine **Supabase-reservierte Schema-Tabelle** (`realtime.*`), die nicht via Migrations geändert werden darf.

### Lösung

**Problem 1 — Fix via Migration:**
- Die permissive Policy `"Service role and edge functions can insert audit logs"` droppen
- Die bestehende `"Service role can insert audit logs" TO service_role WITH CHECK (true)` bleibt erhalten und ist korrekt

**Problem 2 — Markieren als nicht behebbar:**
- `realtime.messages` gehört zum reservierten `realtime`-Schema
- Änderungen dort können den Supabase-Service beeinträchtigen
- Finding wird als "nicht via Migration behebbar" markiert mit erhöhter Schwierigkeit

### Dateien

| Änderung | Was |
|---|---|
| SQL Migration | `DROP POLICY "Service role and edge functions can insert audit logs"` |
| Security Finding Update | `realtime_messages_no_rls` → Schwierigkeit erhöhen, Erklärung |
| Security Finding Delete | `security_audit_logs_authenticated_insert` → nach Fix löschen |

### Technische Details
- Die verbleibende Policy `"Service role can insert audit logs" TO service_role WITH CHECK (true)` deckt alle legitimen Inserts ab (Edge Functions nutzen service_role)
- `log_security_event_enhanced()` ist `SECURITY DEFINER` und läuft als Owner — kann weiterhin in `security_audit_logs` inserieren
- Client-seitige Aufrufe von `SecurityService.logSecurityEvent()` nutzen diese Funktion via RPC

