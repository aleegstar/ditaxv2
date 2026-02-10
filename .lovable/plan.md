
## Fixes for Payment Success Page

### Issue 1: Buttons use wrong design
The buttons currently use `variant="login"` (white with no fill). They should use the primary blue `default` variant to match the main button design standard (blue gradient).

**Fix:** Change both buttons in `PaymentSuccess.tsx` from `variant="login"` to `variant="default"` (or remove the variant prop entirely since `default` is the default). Same for the error state buttons.

---

### Issue 2: "Steuererklarung anzeigen" navigates to wrong route
Currently the button navigates to `/tax-return-tracking?year=2025` (query param), but the route is defined as `/tax-return-tracking/:id` (path param). This causes a route mismatch.

**Fix:** The `taxReturnId` is available from the URL search params. Store it in state alongside `taxYear`, then navigate to `/tax-return-tracking/${taxReturnId}`.

---

### Issue 3: Payment status doesn't update after payment
The `success_url` in the edge function is:
```
/payment-success?session_id=...&tax_year=2025&tax_return_id=
```
When `taxReturnId` is null/undefined, it becomes an empty string `""`. In `PaymentSuccess.tsx`, `searchParams.get('tax_return_id')` returns `""` which is truthy in JavaScript, so the code enters the `if (taxReturnId)` branch and runs `.eq('id', '')` -- which matches nothing and silently fails (no error, but no rows updated either).

**Fix:**
- In `PaymentSuccess.tsx`: Add a check for empty string: `if (taxReturnId && taxReturnId.length > 0)`
- In the edge function: Change `tax_return_id=${taxReturnId || ''}` to only include the param when a real ID exists

---

### Technical Summary

**Files to modify:**

1. **`src/pages/PaymentSuccess.tsx`**
   - Change all `variant="login"` to `variant="default"` (4 buttons total across success and error states)
   - Store `taxReturnId` in component state
   - Fix empty string check: `if (taxReturnId && taxReturnId.trim().length > 0)`
   - Update navigation: `navigate('/tax-return-tracking/${storedTaxReturnId}')` when ID is available, fallback to home if not

2. **`supabase/functions/create-payment/index.ts`**
   - Fix the success URL to only include `tax_return_id` param when it actually has a value
