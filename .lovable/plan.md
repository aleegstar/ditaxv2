

## Fix: Tax Return nicht sichtbar nach Zahlung (Multi-Person-Bug)

### Ursache

Nach einer Stripe-Zahlung fuer eine bestimmte Person (z.B. "Amelia Graber") wird beim Rueckkehren zur Hauptseite die Steuererklaerung nicht angezeigt, weil:

1. **PaymentSuccess Fallback** ignoriert `tax_filer_id`: Wenn `taxReturnId` nicht greift, wird nach `user_id + tax_year` gesucht - ohne `tax_filer_id`. Bei mehreren Personen kann das falsche Objekt aktualisiert werden.
2. **Kein Filer-Kontext nach Zahlung**: Die Erfolgsseite navigiert zurueck zur Uebersicht, ohne sicherzustellen, dass die bezahlte Person aktiv ist.

### Loesung

#### 1. `tax_filer_id` in die Payment-Success-URL aufnehmen

**Datei: `src/components/PaymentSection.tsx`**
- Die `tax_filer_id` (= `activeTaxFilerId`) wird als Query-Parameter `tax_filer_id` an die `create-payment` Edge Function uebergeben.

**Datei: `supabase/functions/create-payment/index.ts`**
- `taxFilerId` im Zod-Schema als optionalen String akzeptieren
- In die `success_url` als `&tax_filer_id=...` einbauen
- In die Stripe-Metadata aufnehmen

#### 2. PaymentSuccess: Fallback mit `tax_filer_id` absichern

**Datei: `src/pages/PaymentSuccess.tsx`**
- `tax_filer_id` aus den URL-Parametern lesen
- Beim Fallback-Update (Zeilen 81-86, 99-104) den `tax_filer_id`-Filter hinzufuegen
- Vor der Navigation zurueck: `sessionStorage.setItem('ditax_selected_tax_filer', taxFilerId)` setzen, damit die richtige Person nach dem Zurueckkehren aktiv ist

#### 3. Stripe Webhook absichern

**Datei: `supabase/functions/stripe-webhook/index.ts`**
- `taxFilerId` aus der Stripe-Metadata lesen (als zusaetzliche Absicherung)

### Technische Aenderungen im Detail

```text
PaymentSection.tsx
  -> Sendet activeTaxFilerId an create-payment
  
create-payment/index.ts
  -> Nimmt taxFilerId entgegen
  -> Fuegt tax_filer_id in success_url + metadata ein
  
PaymentSuccess.tsx
  -> Liest tax_filer_id aus URL
  -> Fallback-Queries filtern nach tax_filer_id
  -> Setzt sessionStorage vor Navigation zurueck

stripe-webhook/index.ts
  -> Liest taxFilerId aus metadata (bereits vorhanden als Absicherung)
```

### Betroffene Dateien

- `src/components/PaymentSection.tsx` (1 Zeile hinzufuegen)
- `supabase/functions/create-payment/index.ts` (Schema + URL + Metadata)
- `src/pages/PaymentSuccess.tsx` (URL-Parameter + Fallback-Filter + sessionStorage)
- `supabase/functions/stripe-webhook/index.ts` (minimale Aenderung)

