
-- Newsletter campaigns table
CREATE TABLE public.newsletter_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  sent_by UUID NOT NULL REFERENCES auth.users(id),
  sent_at TIMESTAMP WITH TIME ZONE,
  recipient_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view campaigns"
  ON public.newsletter_campaigns FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can create campaigns"
  ON public.newsletter_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update campaigns"
  ON public.newsletter_campaigns FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Service role full access campaigns"
  ON public.newsletter_campaigns FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Newsletter send log table
CREATE TABLE public.newsletter_send_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.newsletter_campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view send logs"
  ON public.newsletter_send_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Service role can insert send logs"
  ON public.newsletter_send_log FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update send logs"
  ON public.newsletter_send_log FOR UPDATE
  TO service_role
  USING (true);

-- Index for faster campaign log queries
CREATE INDEX idx_newsletter_send_log_campaign_id ON public.newsletter_send_log(campaign_id);

-- Update existing users: assume marketing consent for all existing users
UPDATE public.profiles SET marketing_consent_at = NOW() WHERE marketing_consent_at IS NULL;
