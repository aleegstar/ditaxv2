

# Fix: Chatbot reports incorrect completion status for finished tax returns

## Problem
The chatbot's `loadUserStatusContext` function checks `form_data.data._completed === true` to determine if sections are completed. For some users, the form data exists (with actual content) but the `_completed` flag was never set (likely from older imports or data migrations). Meanwhile, the `tax_returns` table correctly shows `status: success` and `workflow_step: completed`.

The chatbot context sent to the AI shows conflicting info: "Workflow-Schritt: Abgeschlossen" but "Persönliche Angaben: ✗ Noch nicht ausgefüllt" — the AI prioritizes the negative flags and gives wrong guidance.

**Verified via DB**: User `604af39e...`, Sandro's 2025 tax return is `status: success, workflow_step: completed`, but all 4 form_data records have `_completed: null`.

## Fix (1 file)

### `supabase/functions/chatbot-response/index.ts`

In the `loadUserStatusContext` function, add an override: when a tax return's `status` is `success` or `completed`, or `workflow_step` is `completed`, force all form sections to show as completed regardless of the `_completed` flag.

```
// Inside the for (const tr of filerReturns) loop, after line 95:
const year = tr.tax_year

// NEW: If the tax return is already completed/successful, all forms are done by definition
const taxReturnCompleted = tr.status === 'success' || tr.status === 'completed' || tr.workflow_step === 'completed'

// Modify lines 107-110:
const contactDone = taxReturnCompleted || isFormCompleted('contactInfo')
const incomeDone = taxReturnCompleted || isFormCompleted('income')
const assetsDone = taxReturnCompleted || isFormCompleted('assets')
const deductionsDone = taxReturnCompleted || isFormCompleted('deductions')
```

After editing, deploy the `chatbot-response` edge function to apply the fix immediately.

