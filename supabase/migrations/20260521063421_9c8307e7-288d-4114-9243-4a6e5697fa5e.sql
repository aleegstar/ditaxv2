CREATE TABLE public.ai_extraction_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  function_name text NOT NULL,
  model text NOT NULL,
  file_hash text NOT NULL,
  payload jsonb NOT NULL,
  tax_filer_id uuid,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_extraction_cache_user ON public.ai_extraction_cache(user_id);
CREATE INDEX idx_ai_extraction_cache_filer ON public.ai_extraction_cache(tax_filer_id);

ALTER TABLE public.ai_extraction_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own ai cache"
  ON public.ai_extraction_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own ai cache"
  ON public.ai_extraction_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own ai cache"
  ON public.ai_extraction_cache FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own ai cache"
  ON public.ai_extraction_cache FOR DELETE
  USING (auth.uid() = user_id);