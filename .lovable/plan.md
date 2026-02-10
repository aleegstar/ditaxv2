

## Problem: Steuerjahr-Status wird nach Zahlung nicht aktualisiert

Nach der Analyse gibt es **drei Ursachen**, warum der Status nicht geändert wird:

### Ursache 1: Edge Function Upsert fehlerhaft
In `create-payment/index.ts` versucht die Edge Function nach der Session-Erstellung ein Upsert:
```
onConflict: 'user_id,tax_year'
```
Aber die Datenbank hat einen Unique-Constraint auf `(user_id, tax_filer_id, tax_year)`. Das Upsert schlägt deshalb fehl und der `checkout_session_id` wird nie gespeichert.

**Fix:** Das Upsert entfernen oder den Conflict korrekt auf `user_id,tax_filer_id,tax_year` setzen. Da wir den `tax_filer_id` im Edge Function nicht haben, ist es besser, stattdessen ein einfaches `UPDATE` mit der `taxReturnId` zu machen.

### Ursache 2: PaymentSuccess prüft nicht, ob Zeilen aktualisiert wurden
Der Update-Aufruf in `PaymentSuccess.tsx` gibt keinen Fehler zurück, auch wenn 0 Zeilen betroffen sind. Die Seite zeigt "Erfolgreich", obwohl nichts passiert ist.

**Fix:** `.select()` zum Update hinzufügen und prüfen, ob tatsächlich eine Zeile aktualisiert wurde.

### Ursache 3: Auth-Session nach Stripe-Redirect möglicherweise nicht bereit
Nach dem Redirect von Stripe zurück zur App kann es sein, dass die Supabase-Session noch nicht geladen ist. `getUser()` gibt dann `null` zurück und der User wird zu `/auth` weitergeleitet, bevor das Update passiert.

**Fix:** Einen Retry-Mechanismus einbauen, der kurz wartet und es erneut versucht.

---

### Technische Änderungen

**1. `supabase/functions/create-payment/index.ts`**
- Zeile ~530: Das Upsert durch ein einfaches `UPDATE` ersetzen, das die `taxReturnId` nutzt:
```typescript
if (taxReturnId) {
  await supabaseService
    .from('tax_returns')
    .update({
      payment_status: 'pending',
      checkout_session_id: session.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', taxReturnId);
}
```

**2. `src/pages/PaymentSuccess.tsx`**
- Update mit `.select()` erweitern, um zu prüfen ob Zeilen betroffen sind
- Retry-Logik für Auth-Session hinzufügen (3 Versuche mit 1s Pause)
- Fallback: Falls kein `tax_return_id` in URL und Update via `user_id + tax_year` auch 0 Zeilen liefert, trotzdem Erfolg zeigen aber Warnung loggen
- `.eq('user_id', user.id)` zum ID-basierten Update hinzufügen (doppelte Sicherheit)

