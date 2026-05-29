
-- 1. legal_document_versions
CREATE TABLE public.legal_document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL CHECK (document_type IN ('privacy','terms')),
  version text NOT NULL,
  content_hash text NOT NULL,
  published_url text NOT NULL,
  effective_from timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_type, version)
);

GRANT SELECT ON public.legal_document_versions TO anon, authenticated;
GRANT ALL ON public.legal_document_versions TO service_role;

ALTER TABLE public.legal_document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Legal docs are public" ON public.legal_document_versions
FOR SELECT USING (true);

-- Seed current versions
INSERT INTO public.legal_document_versions (document_type, version, content_hash, published_url)
VALUES
  ('privacy', '2026-05-29', 'pending-initial-hash', 'https://app.ditax.ch/datenschutzrichtlinie'),
  ('terms',   '1.0',        'pending-initial-hash', 'https://app.ditax.ch/terms');

-- 2. Harden user_consents
ALTER TABLE public.user_consents
  ADD COLUMN IF NOT EXISTS document_hash text,
  ADD COLUMN IF NOT EXISTS document_url text,
  ADD COLUMN IF NOT EXISTS accepted_via text;

CREATE INDEX IF NOT EXISTS idx_user_consents_user_type_time
  ON public.user_consents (user_id, consent_type, created_at DESC);

-- Drop client-side INSERT policy — only service_role (via edge function) may write
DROP POLICY IF EXISTS "Users can insert their own consents" ON public.user_consents;

-- Immutability trigger: block UPDATE/DELETE for everyone (service_role bypasses RLS but not triggers; allow via session setting for DSGVO erasure)
CREATE OR REPLACE FUNCTION public.prevent_consent_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.allow_consent_mutation', true) = 'true' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  RAISE EXCEPTION 'user_consents records are immutable (audit trail)';
END;
$$;

DROP TRIGGER IF EXISTS prevent_consent_mutation_trg ON public.user_consents;
CREATE TRIGGER prevent_consent_mutation_trg
BEFORE UPDATE OR DELETE ON public.user_consents
FOR EACH ROW EXECUTE FUNCTION public.prevent_consent_mutation();
