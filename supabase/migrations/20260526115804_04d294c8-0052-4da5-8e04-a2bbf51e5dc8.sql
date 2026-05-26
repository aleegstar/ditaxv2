
CREATE TABLE IF NOT EXISTS public.passkey_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id text NOT NULL,
  email text NOT NULL,
  challenge text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_passkey_challenges_credential_id ON public.passkey_challenges(credential_id);
CREATE INDEX IF NOT EXISTS idx_passkey_challenges_expires_at ON public.passkey_challenges(expires_at);

ALTER TABLE public.passkey_challenges ENABLE ROW LEVEL SECURITY;
-- No policies: only service role (which bypasses RLS) may access this table.
