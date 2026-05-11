
CREATE TABLE public.newsletter_unsubscribes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.newsletter_campaigns(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  reason text,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_newsletter_unsubscribes_campaign ON public.newsletter_unsubscribes(campaign_id);
CREATE INDEX idx_newsletter_unsubscribes_user ON public.newsletter_unsubscribes(user_id);

ALTER TABLE public.newsletter_unsubscribes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view unsubscribes"
  ON public.newsletter_unsubscribes FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE public.newsletter_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.newsletter_campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  email text,
  url text NOT NULL,
  ip_address inet,
  user_agent text,
  clicked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_newsletter_clicks_campaign ON public.newsletter_clicks(campaign_id);
CREATE INDEX idx_newsletter_clicks_user ON public.newsletter_clicks(user_id);

ALTER TABLE public.newsletter_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view clicks"
  ON public.newsletter_clicks FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
