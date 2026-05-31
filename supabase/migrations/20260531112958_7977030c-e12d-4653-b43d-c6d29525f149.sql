CREATE TABLE public.anonymous_upgrades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  upgraded_at timestamptz NOT NULL DEFAULT now(),
  method text NOT NULL DEFAULT 'email',
  device_id_hash text,
  user_agent text
);

CREATE INDEX idx_anonymous_upgrades_user_id ON public.anonymous_upgrades(user_id);

GRANT SELECT, INSERT ON public.anonymous_upgrades TO authenticated;
GRANT ALL ON public.anonymous_upgrades TO service_role;

ALTER TABLE public.anonymous_upgrades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own anonymous upgrade record"
ON public.anonymous_upgrades
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own anonymous upgrade record"
ON public.anonymous_upgrades
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));