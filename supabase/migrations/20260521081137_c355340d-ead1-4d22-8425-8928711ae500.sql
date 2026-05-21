ALTER TABLE public.ai_usage_log ADD COLUMN IF NOT EXISTS device_hash text;
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_device_endpoint_created
  ON public.ai_usage_log (device_hash, endpoint, created_at DESC)
  WHERE device_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_device_year_endpoint
  ON public.ai_usage_log (device_hash, tax_year, endpoint)
  WHERE device_hash IS NOT NULL;