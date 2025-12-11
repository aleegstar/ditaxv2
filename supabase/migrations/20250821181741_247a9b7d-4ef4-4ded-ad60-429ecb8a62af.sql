
-- Create table for storing user passkeys/WebAuthn credentials
CREATE TABLE public.user_passkeys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  credential_id text NOT NULL UNIQUE,
  public_key bytea NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  device_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_used_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE public.user_passkeys ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for passkeys
CREATE POLICY "Users can view their own passkeys" 
  ON public.user_passkeys 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own passkeys" 
  ON public.user_passkeys 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own passkeys" 
  ON public.user_passkeys 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own passkeys" 
  ON public.user_passkeys 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Admins can view all passkeys for support
CREATE POLICY "Admins can view all passkeys" 
  ON public.user_passkeys 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  ));
