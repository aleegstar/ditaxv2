-- =============================================
-- Phase 1: Create tax_filers table
-- =============================================

-- Create the tax_filers table
CREATE TABLE public.tax_filers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date,
  relationship text DEFAULT 'self', -- 'self' | 'child' | 'spouse' | 'parent' | 'other'
  ahv_number text,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_tax_filers_user_id ON public.tax_filers(user_id);
CREATE INDEX idx_tax_filers_is_primary ON public.tax_filers(user_id, is_primary) WHERE is_primary = true;

-- Enable RLS
ALTER TABLE public.tax_filers ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only manage their own tax filers
CREATE POLICY "Users can view own tax filers"
  ON public.tax_filers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own tax filers"
  ON public.tax_filers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tax filers"
  ON public.tax_filers FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own tax filers"
  ON public.tax_filers FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND is_primary = false);

-- Admin policy for tax_filers
CREATE POLICY "Admins can manage all tax filers"
  ON public.tax_filers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Trigger for updated_at
CREATE TRIGGER update_tax_filers_updated_at
  BEFORE UPDATE ON public.tax_filers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Phase 2: Add tax_filer_id to existing tables
-- =============================================

-- Add tax_filer_id to tax_returns
ALTER TABLE public.tax_returns 
  ADD COLUMN tax_filer_id uuid REFERENCES public.tax_filers(id) ON DELETE CASCADE;

CREATE INDEX idx_tax_returns_tax_filer_id ON public.tax_returns(tax_filer_id);

-- Add tax_filer_id to form_data
ALTER TABLE public.form_data 
  ADD COLUMN tax_filer_id uuid REFERENCES public.tax_filers(id) ON DELETE CASCADE;

CREATE INDEX idx_form_data_tax_filer_id ON public.form_data(tax_filer_id);

-- Add tax_filer_id to form_progress
ALTER TABLE public.form_progress 
  ADD COLUMN tax_filer_id uuid REFERENCES public.tax_filers(id) ON DELETE CASCADE;

CREATE INDEX idx_form_progress_tax_filer_id ON public.form_progress(tax_filer_id);

-- Add tax_filer_id to uploaded_documents
ALTER TABLE public.uploaded_documents 
  ADD COLUMN tax_filer_id uuid REFERENCES public.tax_filers(id) ON DELETE CASCADE;

CREATE INDEX idx_uploaded_documents_tax_filer_id ON public.uploaded_documents(tax_filer_id);

-- Add tax_filer_id to completed_tax_returns
ALTER TABLE public.completed_tax_returns 
  ADD COLUMN tax_filer_id uuid REFERENCES public.tax_filers(id) ON DELETE CASCADE;

CREATE INDEX idx_completed_tax_returns_tax_filer_id ON public.completed_tax_returns(tax_filer_id);

-- Add tax_filer_id to form_chat_history
ALTER TABLE public.form_chat_history 
  ADD COLUMN tax_filer_id uuid REFERENCES public.tax_filers(id) ON DELETE CASCADE;

CREATE INDEX idx_form_chat_history_tax_filer_id ON public.form_chat_history(tax_filer_id);

-- =============================================
-- Phase 3: Migrate existing users to tax_filers
-- =============================================

-- Create a primary tax filer for each existing user
INSERT INTO public.tax_filers (user_id, first_name, last_name, relationship, is_primary)
SELECT 
  p.id,
  COALESCE(NULLIF(p.first_name, ''), 'Ich'),
  COALESCE(NULLIF(p.last_name, ''), 'Selbst'),
  'self',
  true
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.tax_filers tf WHERE tf.user_id = p.id
);

-- Link existing tax_returns to the primary tax filer
UPDATE public.tax_returns tr
SET tax_filer_id = tf.id
FROM public.tax_filers tf
WHERE tr.user_id = tf.user_id 
  AND tf.is_primary = true
  AND tr.tax_filer_id IS NULL;

-- Link existing form_data to the primary tax filer
UPDATE public.form_data fd
SET tax_filer_id = tf.id
FROM public.tax_filers tf
WHERE fd.user_id = tf.user_id 
  AND tf.is_primary = true
  AND fd.tax_filer_id IS NULL;

-- Link existing form_progress to the primary tax filer
UPDATE public.form_progress fp
SET tax_filer_id = tf.id
FROM public.tax_filers tf
WHERE fp.user_id = tf.user_id 
  AND tf.is_primary = true
  AND fp.tax_filer_id IS NULL;

-- Link existing uploaded_documents to the primary tax filer
UPDATE public.uploaded_documents ud
SET tax_filer_id = tf.id
FROM public.tax_filers tf
WHERE ud.user_id = tf.user_id 
  AND tf.is_primary = true
  AND ud.tax_filer_id IS NULL;

-- Link existing completed_tax_returns to the primary tax filer
UPDATE public.completed_tax_returns ctr
SET tax_filer_id = tf.id
FROM public.tax_filers tf
WHERE ctr.user_id = tf.user_id 
  AND tf.is_primary = true
  AND ctr.tax_filer_id IS NULL;

-- Link existing form_chat_history to the primary tax filer
UPDATE public.form_chat_history fch
SET tax_filer_id = tf.id
FROM public.tax_filers tf
WHERE fch.user_id = tf.user_id 
  AND tf.is_primary = true
  AND fch.tax_filer_id IS NULL;

-- =============================================
-- Phase 4: Create trigger for new users
-- =============================================

-- Function to create primary tax filer for new users
CREATE OR REPLACE FUNCTION public.create_primary_tax_filer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tax_filers (user_id, first_name, last_name, relationship, is_primary)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.first_name, ''), 'Ich'),
    COALESCE(NULLIF(NEW.last_name, ''), 'Selbst'),
    'self',
    true
  );
  RETURN NEW;
END;
$$;

-- Trigger to create primary tax filer when new profile is created
CREATE TRIGGER create_primary_tax_filer_on_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_primary_tax_filer();

-- =============================================
-- Phase 5: Ensure only one primary per user
-- =============================================

-- Function to ensure only one primary tax filer per user
CREATE OR REPLACE FUNCTION public.ensure_single_primary_tax_filer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If setting this as primary, unset all others
  IF NEW.is_primary = true THEN
    UPDATE public.tax_filers
    SET is_primary = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to maintain single primary
CREATE TRIGGER ensure_single_primary_tax_filer
  BEFORE INSERT OR UPDATE ON public.tax_filers
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION public.ensure_single_primary_tax_filer();