UPDATE public.form_data
SET data = jsonb_set(data, '{hasSecuritiesAccount}', 'true'::jsonb, true)
WHERE tax_filer_id = '917cd261-ab79-4b36-8a20-ec07e327746d'
  AND tax_year = '2024'
  AND form_type = 'assets'
  AND (data->>'hasDepositAccount')::boolean = true
  AND (data->'hasSecuritiesAccount') IS NULL;