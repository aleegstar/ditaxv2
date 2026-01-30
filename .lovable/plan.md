
# Plan: Fix Person Selection Not Persisting Correctly

## Problem

When selecting a different person (e.g., Leano), the selection does not persist - the app reverts to showing the previous person (Sandro).

## Root Cause

There is a **stale closure bug** in the person selection flow:

1. In `SelectPerson.tsx`, `handleSelectPerson` calls:
   - `setActiveTaxFilerId(filer.id)` - schedules state update for Leano
   - `confirmSelection()` - runs immediately with **old** activeTaxFilerId (Sandro)

2. The `confirmSelection` callback stores the old ID (Sandro) in sessionStorage

3. When navigating to `/`, `loadTaxFilers` reads from sessionStorage and restores Sandro

## Solution

Update `confirmSelection` to accept an optional `filerId` parameter, allowing the caller to pass the new ID directly instead of relying on stale state.

### Changes Required

**File: `src/contexts/TaxFilerContext.tsx`**

1. Update the `TaxFilerContextType` interface:
   - Change `confirmSelection: () => void` to `confirmSelection: (filerId?: string) => void`

2. Update the `confirmSelection` implementation:
   ```typescript
   const confirmSelection = useCallback((filerId?: string) => {
     const idToStore = filerId || activeTaxFilerId;
     setSelectionConfirmed(true);
     if (idToStore) {
       sessionStorage.setItem(SESSION_KEY, idToStore);
     }
   }, [activeTaxFilerId]);
   ```

**File: `src/pages/SelectPerson.tsx`**

3. Update `handleSelectPerson` to pass the filer ID:
   ```typescript
   const handleSelectPerson = (filer: TaxFiler) => {
     console.log('Selected filer:', filer.id, filer.first_name);
     setActiveTaxFilerId(filer.id);
     confirmSelection(filer.id);  // Pass the new ID directly
     navigate('/', { state: { personSelected: true, filerId: filer.id } });
   };
   ```

## Technical Details

| Aspect | Before | After |
|--------|--------|-------|
| `confirmSelection` signature | `() => void` | `(filerId?: string) => void` |
| sessionStorage value | Uses stale closure value | Uses passed parameter or current state |
| Backward compatibility | N/A | Yes - parameter is optional |

## Testing

After implementation:
1. Log in with an account that has multiple tax filers
2. Navigate to the person selection page
3. Select a different person (e.g., Leano instead of Sandro)
4. Verify the dashboard shows the selected person
5. Refresh the page and verify the selection persists
6. Switch persons again to confirm consistent behavior
