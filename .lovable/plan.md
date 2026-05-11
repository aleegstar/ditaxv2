## Newsletter wird nicht versandt – Diagnose & Fix

### Hauptursache (bereits behoben)
Die beiden Edge Functions `send-newsletter` und `send-newsletter-test` waren **nicht deployed**. Beim Aufruf vom Admin-UI lieferte Supabase deshalb sofort einen Fehler zurück, bevor überhaupt Code lief – darum sind in den Logs **keine Einträge** zu sehen ("No logs found"). Ich habe beide Functions soeben neu deployed; das eigentliche Problem für den Test-Versand ist damit weg.

### Verbleibende mögliche Ursache: Resend-Absenderdomain
Beide Functions versenden mit:
```
from: "Ditax <noreply@ditax.ch>"
```
Wenn die Domain `ditax.ch` auf Resend **nicht verifiziert** ist (oder nur eine Subdomain wie `notify.ditax.ch` verifiziert ist), antwortet Resend mit `403 The ditax.ch domain is not verified`. Die Function gibt dann `Send failed` zurück, ohne dass eine Mail rausgeht.

### Vorgeschlagene Schritte

1. **Erneut testen** – Im Admin → Newsletter eine Test-Mail an deine eigene Adresse senden. Falls jetzt Erfolgs-Toast erscheint: Problem gelöst.

2. **Falls weiterhin Fehler**: Function-Logs prüfen (sind jetzt aktiv) und die Resend-Antwort auslesen. Wahrscheinlichste Meldung:
   - `domain is not verified` → Domain auf Resend Dashboard verifizieren ODER Absender auf eine bereits verifizierte Adresse umstellen (z. B. `onboarding@resend.dev` für Tests, oder die produktiv genutzte Domain von Ditax-Auth-Mails).
   - `429 rate limit` → kurz warten.
   - `401 invalid api key` → `RESEND_API_KEY` neu setzen.

3. **Optional – robustere Fehleranzeige im Admin-UI**: Aktuell zeigt die UI nur generisch „Test-E-Mail konnte nicht versendet werden". Die Function soll den Resend-Fehlertext (`details.message`) im Response durchreichen und der Toast diesen anzeigen, damit du beim nächsten Mal sofort siehst, was klemmt.

4. **Optional – verifizierte Absenderdomain zentralisieren**: Hardcoded `noreply@ditax.ch` an zwei Stellen ersetzen durch eine Konstante `NEWSLETTER_FROM`, die auf die nachweislich auf Resend verifizierte Adresse zeigt. So gibt es nur eine Stelle zum Pflegen.

### Aktionen für den Implementierungslauf
- Fehler-Detail vom Resend-Aufruf in die Response von `send-newsletter-test` und `send-newsletter` aufnehmen.
- Im Admin-Newsletter-UI (`src/pages/admin/Newsletter.tsx`) bei Fehler die detaillierte Meldung im Toast anzeigen.
- Beide Functions erneut deployen.

### Was ich von dir brauche
- Bitte einmal die Test-Mail erneut probieren und mir mitteilen, welche Fehlermeldung jetzt erscheint (oder ob sie ankommt). Davon hängt ab, ob nur Punkt 1 reicht oder ob wir den Absender umstellen müssen.
