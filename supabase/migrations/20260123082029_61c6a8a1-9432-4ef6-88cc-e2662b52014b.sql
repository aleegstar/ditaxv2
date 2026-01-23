-- Referral-Codes Tabelle
CREATE TABLE public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  successful_referrals INTEGER DEFAULT 0,
  max_referrals INTEGER DEFAULT 10,
  UNIQUE(user_id)
);

-- Referral-Einlösungen Tabelle  
CREATE TABLE public.referral_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id UUID NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_at TIMESTAMPTZ DEFAULT now(),
  referrer_stripe_promo_id TEXT NOT NULL,
  referred_stripe_promo_id TEXT NOT NULL,
  referrer_promo_used BOOLEAN DEFAULT false,
  referred_promo_used BOOLEAN DEFAULT false,
  UNIQUE(referred_user_id)
);

-- Enable RLS
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_codes
CREATE POLICY "Users can view own referral code" 
  ON public.referral_codes 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own referral code" 
  ON public.referral_codes 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all referral codes"
  ON public.referral_codes
  FOR ALL
  USING (auth.role() = 'service_role');

-- RLS Policies for referral_redemptions
CREATE POLICY "Users can view own referrals as referrer" 
  ON public.referral_redemptions 
  FOR SELECT 
  USING (referrer_user_id = auth.uid());

CREATE POLICY "Users can view own referral as referred" 
  ON public.referral_redemptions 
  FOR SELECT 
  USING (referred_user_id = auth.uid());

CREATE POLICY "Service role can manage all redemptions"
  ON public.referral_redemptions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Index for faster lookups
CREATE INDEX idx_referral_codes_code ON public.referral_codes(code);
CREATE INDEX idx_referral_codes_user_id ON public.referral_codes(user_id);
CREATE INDEX idx_referral_redemptions_referrer ON public.referral_redemptions(referrer_user_id);
CREATE INDEX idx_referral_redemptions_referred ON public.referral_redemptions(referred_user_id);