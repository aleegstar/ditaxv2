
CREATE TABLE public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tax_filer_id uuid,
  tax_year text,
  endpoint text NOT NULL CHECK (endpoint IN ('prior_year', 'lohnausweis', 'ocr_extract')),
  success boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_usage_log_user_endpoint_created
  ON public.ai_usage_log (user_id, endpoint, created_at DESC);

CREATE INDEX idx_ai_usage_log_filer_year_endpoint
  ON public.ai_usage_log (tax_filer_id, tax_year, endpoint)
  WHERE tax_filer_id IS NOT NULL;

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI usage"
  ON public.ai_usage_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all AI usage"
  ON public.ai_usage_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
