## Ziel

Beim Zahlen (TWINT, Klarna, Karte) sollen Name + vollständige Schweizer Adresse automatisch an Stripe übergeben werden, sodass keine erneute Eingabe nötig ist.

## Ursache

In `supabase/functions/create-payment/index.ts` wird die Adresse aus `form_data` mit `.single()` geladen, ohne nach `tax_filer_id` zu filtern. Bei Multi-Personen-Konten (z.B. Sandro + Kind Leano) gibt es mehrere `contactInfo`-Zeilen pro Jahr – `.single()` schlägt fehl und die Adresse wird verworfen. Zusätzlich kann der ausgewählte Filer eine unvollständige Adresse haben (kein PLZ/Ort).

## Änderungen

**Datei: `supabase/functions/create-payment/index.ts`** (nur der Block "Loading customer data from database")

1. **Nach tax_filer_id filtern, wenn vorhanden**
   - Wenn `taxFilerId` im Request übergeben wird → `contactInfo`-Query um `.eq('tax_filer_id', taxFilerId)` ergänzen.
   - `.single()` durch `.maybeSingle()` ersetzen, damit Multi-Row-Fälle nicht hart fehlschlagen.

2. **Fallback auf vollständige Adresse desselben Users/Jahres**
   - Wenn der gefundene `contactInfo`-Eintrag keine vollständige Adresse hat (`address` + `postalCode` + `city`), zusätzlich ALLE `contactInfo`-Zeilen für `user_id` + `tax_year` laden und die **erste vollständige** als Fallback für die Adressfelder verwenden. Name (firstName/lastName) bleibt immer vom Haupt-Datensatz.
   - Begründung: Die Rechnungsadresse gehört zum zahlenden Konto – wenn irgendwo im Account eine vollständige CH-Adresse hinterlegt ist, ist es vertretbar diese als Stripe-Billing zu nutzen, statt den User erneut tippen zu lassen.

3. **profiles als sekundärer Fallback**
   - Wenn `profiles.address` gesetzt, aber nicht parsbar ist (Free-Text), zumindest als `line1` weiterhin nutzen – wie heute.

4. **Diagnose-Logging erweitern**
   - `logStep("Address resolution", { source: 'filer'|'fallback_filer'|'profile'|'none', hasFullAddress, taxFilerId })` damit man bei Folgemeldungen direkt sieht, woher die Adresse kam.

5. **Bestehende Logik unverändert**
   - `billing_address_collection: 'auto' | 'required'`-Switch bleibt wie zuletzt eingebaut.
   - Stripe-Customer Create/Update bleibt unverändert (sendet bereits `line1`, `postal_code`, `city`, `country:'CH'`).

## Verifizierung

1. Edge Function neu deployen.
2. Testen mit Sandros Account + Steuerjahr 2025: erwartet wird, dass Stripe TWINT-Checkout Vorname, Nachname und Adresse (Haselweg 5607 Hägglingen aus Leanos Zeile als Fallback) vorausgefüllt zeigt → keine erneute Eingabe.
3. In den Function-Logs prüfen, dass `Address resolution source=fallback_filer hasFullAddress=true` geloggt wird.

## Nicht im Scope

- Kein UI-Wechsel.
- Keine DB-Migration.
- Keine Änderung am Stripe-Webhook oder anderen Funktionen.
- Sandros eigene Sandro-Adresse wird nicht automatisch ergänzt – das ist eine Datenpflege-Frage, die der User über das Kontaktformular selbst lösen müsste.
