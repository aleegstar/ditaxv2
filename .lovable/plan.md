## Problem

Beim TWINT-Checkout (und auch bei Klarna) verlangt Stripe Name und Adresse, obwohl diese im Ditax-Profil/Formular vorhanden sind. Ursache liegt in `supabase/functions/create-payment/index.ts`:

1. **Adresse wird unvollständig an Stripe übergeben.** Beim Anlegen/Update des Stripe-Customers wird nur `line1: customerData.address` und `country: 'CH'` gesetzt. `postal_code` und `city` werden nie befüllt – obwohl die Felder unter `contactInfo` als `address` (Strasse), `postalCode` und `city` separat existieren.
2. **`customerData` lädt diese Felder gar nicht erst.** Aus `profiles` wird nur `address` (eine zusammengeführte Stringspalte) gelesen; aus `form_data.contactInfo` wird zwar gemappt, aber nur `address` (= Strasse) – `postalCode`/`city` werden ignoriert.
3. Folge: Stripe sieht eine "unvollständige" Customer-Adresse, `billing_address_collection: 'auto'` kann sie nicht vorfüllen, und TWINT/Klarna verlangen vom Nutzer die manuelle Eingabe.

Zusätzlich ist `customer.name` zwar gesetzt, wird aber bei `customer_update: { name: 'auto' }` nur durchgereicht, wenn Stripe sie als gültig erkennt – was nach dem Address-Fix automatisch zieht.

## Plan

Nur eine Datei anfassen: `supabase/functions/create-payment/index.ts`.

### 1. Volle Adresse aus `form_data.contactInfo` laden

Im Block "Loading customer data from database" das Form-Data-Mapping erweitern, sodass auch `postalCode` und `city` übernommen werden:

```ts
customerData = {
  first_name: customerData?.first_name || contactInfo.firstName,
  last_name:  customerData?.last_name  || contactInfo.lastName,
  address:    customerData?.address    || contactInfo.address,
  postal_code: contactInfo.postalCode,
  city:        contactInfo.city,
  phone: customerData?.phone || contactInfo.phone || '',
};
```

Wenn nur das Profil verfügbar ist (kein contactInfo), bleibt `postal_code`/`city` leer und Stripe sammelt sie wie heute via `billing_address_collection: 'required'`.

### 2. Strukturierte Adresse an Stripe Customer übergeben

Beim `stripe.customers.create` und `stripe.customers.update` das Address-Objekt vollständig befüllen:

```ts
if (customerData.address) {
  newCustomerData.address = {
    line1: customerData.address,
    postal_code: customerData.postal_code || undefined,
    city: customerData.city || undefined,
    country: 'CH',
  };
}
```

Analog im Update-Pfad.

### 3. `billing_address_collection` korrekt steuern

Bedingung verschärfen: nur dann auf `'auto'`, wenn `address`, `postal_code` und `city` vorhanden sind – sonst `'required'`. Das verhindert halbleere Stripe-Eingabeformulare:

```ts
const hasFullAddress = !!(customerData?.address && customerData?.postal_code && customerData?.city);
sessionData.billing_address_collection = hasFullAddress ? 'auto' : 'required';
```

### 4. Verifikation

- Edge Function deployen.
- Mit einem Test-Account mit vollständigem `contactInfo` (Strasse, PLZ, Ort) Zahlung auslösen → TWINT-Flow zeigt vorausgefüllten Namen + Adresse, keine erneute Eingabe nötig.
- Mit einem Account ohne PLZ/Ort prüfen, dass weiterhin sauber abgefragt wird (kein Crash, `billing_address_collection: 'required'`).
- Edge Function Logs nach `Billing address collection` und `Customer updated/created` querchecken.

### Nicht Teil des Plans

- Keine Änderungen am Frontend, an `PaymentSection.tsx` oder am Preisrechner.
- Kein Eingriff in die Aktionswochen-Logik.
- Keine DB-Schema-Änderung (`profiles.address` bleibt ein Freitext-Fallback).
