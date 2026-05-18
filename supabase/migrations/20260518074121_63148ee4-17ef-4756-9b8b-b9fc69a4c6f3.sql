-- 1. intake_mode on tax_returns
ALTER TABLE public.tax_returns
  ADD COLUMN IF NOT EXISTS intake_mode TEXT NOT NULL DEFAULT 'guided';

ALTER TABLE public.tax_returns
  DROP CONSTRAINT IF EXISTS tax_returns_intake_mode_check;
ALTER TABLE public.tax_returns
  ADD CONSTRAINT tax_returns_intake_mode_check
  CHECK (intake_mode IN ('guided','prior_year_upload'));

-- 2. prior_year_checklists
CREATE TABLE IF NOT EXISTS public.prior_year_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tax_filer_id UUID NOT NULL REFERENCES public.tax_filers(id) ON DELETE CASCADE,
  tax_year TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|scanning|ready|failed
  source_storage_path TEXT,
  raw_scan JSONB,
  error_message TEXT,
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tax_filer_id, tax_year)
);

ALTER TABLE public.prior_year_checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pyc_select_own" ON public.prior_year_checklists;
CREATE POLICY "pyc_select_own" ON public.prior_year_checklists
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "pyc_insert_own" ON public.prior_year_checklists;
CREATE POLICY "pyc_insert_own" ON public.prior_year_checklists
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "pyc_update_own" ON public.prior_year_checklists;
CREATE POLICY "pyc_update_own" ON public.prior_year_checklists
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "pyc_delete_own" ON public.prior_year_checklists;
CREATE POLICY "pyc_delete_own" ON public.prior_year_checklists
  FOR DELETE USING (auth.uid() = user_id);

-- 3. prior_year_checklist_items
CREATE TABLE IF NOT EXISTS public.prior_year_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES public.prior_year_checklists(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('contact','income','assets','deductions','other')),
  label TEXT NOT NULL,
  source_value TEXT,
  change_status TEXT NOT NULL DEFAULT 'pending' CHECK (change_status IN ('pending','unchanged','changed','removed','new')),
  change_note TEXT,
  document_id UUID,
  completed BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pyc_items_checklist_idx
  ON public.prior_year_checklist_items(checklist_id);

ALTER TABLE public.prior_year_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pyci_select_own" ON public.prior_year_checklist_items;
CREATE POLICY "pyci_select_own" ON public.prior_year_checklist_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.prior_year_checklists c
    WHERE c.id = checklist_id
      AND (c.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ));
DROP POLICY IF EXISTS "pyci_insert_own" ON public.prior_year_checklist_items;
CREATE POLICY "pyci_insert_own" ON public.prior_year_checklist_items
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.prior_year_checklists c
    WHERE c.id = checklist_id AND c.user_id = auth.uid()
  ));
DROP POLICY IF EXISTS "pyci_update_own" ON public.prior_year_checklist_items;
CREATE POLICY "pyci_update_own" ON public.prior_year_checklist_items
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.prior_year_checklists c
    WHERE c.id = checklist_id AND c.user_id = auth.uid()
  ));
DROP POLICY IF EXISTS "pyci_delete_own" ON public.prior_year_checklist_items;
CREATE POLICY "pyci_delete_own" ON public.prior_year_checklist_items
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.prior_year_checklists c
    WHERE c.id = checklist_id AND c.user_id = auth.uid()
  ));

-- 4. triggers for updated_at
DROP TRIGGER IF EXISTS pyc_updated_at ON public.prior_year_checklists;
CREATE TRIGGER pyc_updated_at BEFORE UPDATE ON public.prior_year_checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS pyci_updated_at ON public.prior_year_checklist_items;
CREATE TRIGGER pyci_updated_at BEFORE UPDATE ON public.prior_year_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. storage bucket for prior-year returns (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('prior-year-returns', 'prior-year-returns', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "pyr_select_own" ON storage.objects;
CREATE POLICY "pyr_select_own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'prior-year-returns'
    AND (auth.uid()::text = (storage.foldername(name))[1]
         OR has_role(auth.uid(), 'admin'::app_role))
  );
DROP POLICY IF EXISTS "pyr_insert_own" ON storage.objects;
CREATE POLICY "pyr_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'prior-year-returns'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
DROP POLICY IF EXISTS "pyr_update_own" ON storage.objects;
CREATE POLICY "pyr_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'prior-year-returns'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
DROP POLICY IF EXISTS "pyr_delete_own" ON storage.objects;
CREATE POLICY "pyr_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'prior-year-returns'
    AND (auth.uid()::text = (storage.foldername(name))[1]
         OR has_role(auth.uid(), 'admin'::app_role))
  );