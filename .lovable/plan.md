
# Fix: Tax Year Regex-Validierung im create-payment Edge Function

## Problem

Die Zod-Validierung im `create-payment` Edge Function verwendet die Regex `^20[2-3][4-9]$`, die nur die Jahre 2024-2029 und 2034-2039 akzeptiert. Das Jahr **2030** (und 2031, 2032, 2033) wird abgelehnt mit "Invalid tax year".

Die Logs zeigen den Fehler eindeutig:
```
"taxYear": "2030"
"errors": [{ "validation": "regex", "message": "Invalid tax year" }]
```

## Loesung

Die Regex in `supabase/functions/create-payment/index.ts` erweitern, um alle Jahre von 2024 bis 2039 abzudecken:

**Aktuell (fehlerhaft):**
```
taxYear: z.string().regex(/^20[2-3][4-9]$/, 'Invalid tax year')
```

**Neu (korrekt):**
```
taxYear: z.string().regex(/^20[2-3]\d$/, 'Invalid tax year')
```

Die Aenderung von `[4-9]` zu `\d` (beliebige Ziffer 0-9) erlaubt alle Jahre von 2020-2039.

## Betroffene Datei

- `supabase/functions/create-payment/index.ts` (Zeile 15) — Regex-Aenderung

## Technische Details

- Einzeilige Aenderung: `[4-9]` wird durch `\d` ersetzt
- Nach der Aenderung wird die Edge Function automatisch deployed
- Kein Frontend-Code betroffen
