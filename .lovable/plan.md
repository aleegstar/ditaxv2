
# Plan: Fix Duplicate Key Violation for Multi-Person Tax Data

## Problem Identified

When saving form data for "Leano" (a second tax filer), the database throws:
```
duplicate key value violates unique constraint "form_data_unique"
```

## Root Cause Analysis

The database constraint `form_data_unique` is defined as:
```sql
UNIQUE (user_id, tax_year, form_type)
```

This constraint **does not include `tax_filer_id`**, but the multi-person tax filer architecture requires each person to have their own form data. When:
1. Sandro's data exists: `(user_id=X, tax_year=2024, form_type=contactInfo, tax_filer_id=sandro_id)`
2. Leano tries to save: `(user_id=X, tax_year=2024, form_type=contactInfo, tax_filer_id=leano_id)`

The constraint sees a conflict on `(user_id, tax_year, form_type)` because it ignores `tax_filer_id`.

## Solution

Update the unique constraint to include `tax_filer_id`:

```sql
ALTER TABLE form_data 
DROP CONSTRAINT form_data_unique;

ALTER TABLE form_data 
ADD CONSTRAINT form_data_unique 
UNIQUE (user_id, tax_year, form_type, tax_filer_id);
```

## Implementation Steps

### Step 1: Database Migration

Create a migration to modify the unique constraint:

```sql
-- Drop the existing constraint that doesn't account for tax_filer_id
ALTER TABLE form_data DROP CONSTRAINT IF EXISTS form_data_unique;

-- Create new constraint that includes tax_filer_id
-- This allows different tax filers to have their own form data
ALTER TABLE form_data 
ADD CONSTRAINT form_data_unique 
UNIQUE (user_id, tax_year, form_type, tax_filer_id);
```

### Step 2: Handle NULL tax_filer_id Records

Some older records may have `tax_filer_id = NULL`. The new constraint will treat each NULL as distinct (PostgreSQL behavior), which could cause issues.

First, check for affected records:
```sql
SELECT COUNT(*) FROM form_data WHERE tax_filer_id IS NULL;
```

If there are NULL records, we need to either:
- Assign them to the user's primary tax filer, or
- Keep them as-is (NULLs are treated as distinct in unique constraints)

### Step 3: Verify the Fix

After migration:
1. Sandro can save: `(user_id, 2024, contactInfo, sandro_id)` 
2. Leano can also save: `(user_id, 2024, contactInfo, leano_id)` 

Both records can coexist since `tax_filer_id` is now part of the unique key.

## Technical Details

| Aspect | Current State | After Fix |
|--------|---------------|-----------|
| Unique Constraint | `(user_id, tax_year, form_type)` | `(user_id, tax_year, form_type, tax_filer_id)` |
| Multiple Filers Same Year | Not supported | Fully supported |
| Backward Compatibility | N/A | Existing data preserved |

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Records with NULL tax_filer_id | Check for affected records first; assign to primary filer if needed |
| Duplicate data after migration | Verify no duplicates exist before creating new constraint |

## No Code Changes Required

The application code (FormContext.tsx) already correctly:
- Includes `tax_filer_id` in INSERT statements (line 766)
- Filters by `tax_filer_id` when checking for existing records (line 732)
- Filters by `tax_filer_id` when loading data (line 199)

The only issue is the database constraint, which this migration will fix.
