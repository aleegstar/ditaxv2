
-- Create secure admin-only notes table
CREATE TABLE public.admin_notes_internal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_table text NOT NULL,
  target_id uuid NOT NULL,
  note text NOT NULL DEFAULT '',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(target_table, target_id)
);

ALTER TABLE public.admin_notes_internal ENABLE ROW LEVEL SECURITY;

-- Only admins can access
CREATE POLICY "Admins can view all notes"
  ON public.admin_notes_internal FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can insert notes"
  ON public.admin_notes_internal FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update notes"
  ON public.admin_notes_internal FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete notes"
  ON public.admin_notes_internal FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Auto-update updated_at
CREATE TRIGGER update_admin_notes_internal_updated_at
  BEFORE UPDATE ON public.admin_notes_internal
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing data from profiles
INSERT INTO public.admin_notes_internal (target_table, target_id, note)
SELECT 'profiles', id, admin_notes
FROM public.profiles
WHERE admin_notes IS NOT NULL AND admin_notes != '';

-- Migrate existing data from tax_filers
INSERT INTO public.admin_notes_internal (target_table, target_id, note)
SELECT 'tax_filers', id, admin_notes
FROM public.tax_filers
WHERE admin_notes IS NOT NULL AND admin_notes != '';

-- Migrate existing data from definitive_tax_bills
INSERT INTO public.admin_notes_internal (target_table, target_id, note)
SELECT 'definitive_tax_bills', id, admin_notes
FROM public.definitive_tax_bills
WHERE admin_notes IS NOT NULL AND admin_notes != '';

-- Clear admin_notes on user-visible tables
UPDATE public.profiles SET admin_notes = NULL WHERE admin_notes IS NOT NULL;
UPDATE public.tax_filers SET admin_notes = NULL WHERE admin_notes IS NOT NULL;
UPDATE public.definitive_tax_bills SET admin_notes = NULL WHERE admin_notes IS NOT NULL;
