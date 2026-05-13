
-- Enums
CREATE TYPE public.canonical_person_role AS ENUM ('taxpayer', 'spouse', 'child', 'dependent');
CREATE TYPE public.canonical_dossier_status AS ENUM ('draft', 'in_review', 'submitted', 'exported', 'archived');
CREATE TYPE public.provenance_source_type AS ENUM ('manual', 'ai', 'imported', 'migrated');
CREATE TYPE public.canonical_validation_status AS ENUM ('pass', 'warn', 'fail', 'error');
CREATE TYPE public.canonical_export_status AS ENUM ('prepared', 'exported', 'failed');
CREATE TYPE public.canonical_snapshot_reason AS ENUM ('manual', 'submission', 'export', 'migration', 'checkpoint');

-- 1. dossiers (root)
CREATE TABLE public.canonical_dossiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tax_filer_id uuid NOT NULL,
  tax_year text NOT NULL,
  canton text,
  status public.canonical_dossier_status NOT NULL DEFAULT 'draft',
  schema_version integer NOT NULL DEFAULT 2,
  current_revision integer NOT NULL DEFAULT 0,
  validation_status jsonb NOT NULL DEFAULT '{}'::jsonb,
  currency text NOT NULL DEFAULT 'CHF',
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tax_filer_id, tax_year)
);
CREATE INDEX idx_canonical_dossiers_user ON public.canonical_dossiers(user_id);
CREATE INDEX idx_canonical_dossiers_filer_year ON public.canonical_dossiers(tax_filer_id, tax_year);

-- 2. persons
CREATE TABLE public.canonical_persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES public.canonical_dossiers(id) ON DELETE CASCADE,
  role public.canonical_person_role NOT NULL,
  first_name text,
  last_name text,
  birth_date date,
  ahv_number text,
  nationality text,
  marital_status text,
  religion text,
  address text,
  postal_code text,
  city text,
  canton text,
  municipality text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  schema_version integer NOT NULL DEFAULT 2,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_canonical_persons_dossier ON public.canonical_persons(dossier_id);

-- 3. household (1:1)
CREATE TABLE public.canonical_household (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL UNIQUE REFERENCES public.canonical_dossiers(id) ON DELETE CASCADE,
  marital_status_effective text,
  children_count integer NOT NULL DEFAULT 0,
  dependents_count integer NOT NULL DEFAULT 0,
  notes text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  schema_version integer NOT NULL DEFAULT 2,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. employment_incomes
CREATE TABLE public.canonical_employment_incomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES public.canonical_dossiers(id) ON DELETE CASCADE,
  person_id uuid REFERENCES public.canonical_persons(id) ON DELETE SET NULL,
  employer text,
  salary numeric(18,4),
  bonus numeric(18,4),
  pension_contributions numeric(18,4),
  ahv numeric(18,4),
  withholding_tax numeric(18,4),
  currency text NOT NULL DEFAULT 'CHF',
  source_document_id uuid,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  schema_version integer NOT NULL DEFAULT 2,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_canonical_employment_dossier ON public.canonical_employment_incomes(dossier_id);

-- 5. self_employment_incomes
CREATE TABLE public.canonical_self_employment_incomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES public.canonical_dossiers(id) ON DELETE CASCADE,
  person_id uuid REFERENCES public.canonical_persons(id) ON DELETE SET NULL,
  business_name text,
  revenue numeric(18,4),
  expenses numeric(18,4),
  net_income numeric(18,4),
  currency text NOT NULL DEFAULT 'CHF',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  schema_version integer NOT NULL DEFAULT 2,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_canonical_self_emp_dossier ON public.canonical_self_employment_incomes(dossier_id);

-- 6. pension_incomes
CREATE TABLE public.canonical_pension_incomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES public.canonical_dossiers(id) ON DELETE CASCADE,
  person_id uuid REFERENCES public.canonical_persons(id) ON DELETE SET NULL,
  ahv_income numeric(18,4),
  pension_income numeric(18,4),
  pillar3a numeric(18,4),
  pillar3b numeric(18,4),
  currency text NOT NULL DEFAULT 'CHF',
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  schema_version integer NOT NULL DEFAULT 2,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_canonical_pension_dossier ON public.canonical_pension_incomes(dossier_id);

-- 7. assets (1:1, JSONB lists for variable items)
CREATE TABLE public.canonical_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL UNIQUE REFERENCES public.canonical_dossiers(id) ON DELETE CASCADE,
  bank_accounts jsonb NOT NULL DEFAULT '[]'::jsonb,
  cash numeric(18,4),
  securities jsonb NOT NULL DEFAULT '[]'::jsonb,
  crypto_assets jsonb NOT NULL DEFAULT '[]'::jsonb,
  foreign_assets jsonb NOT NULL DEFAULT '[]'::jsonb,
  currency text NOT NULL DEFAULT 'CHF',
  schema_version integer NOT NULL DEFAULT 2,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 8. debts (1:1)
CREATE TABLE public.canonical_debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL UNIQUE REFERENCES public.canonical_dossiers(id) ON DELETE CASCADE,
  mortgages jsonb NOT NULL DEFAULT '[]'::jsonb,
  loans jsonb NOT NULL DEFAULT '[]'::jsonb,
  interest_paid numeric(18,4),
  currency text NOT NULL DEFAULT 'CHF',
  schema_version integer NOT NULL DEFAULT 2,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 9. real_estate
CREATE TABLE public.canonical_real_estate (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES public.canonical_dossiers(id) ON DELETE CASCADE,
  address text,
  canton text,
  municipality text,
  usage text,
  purchase_value numeric(18,4),
  purchase_year integer,
  tax_value numeric(18,4),
  rental_income numeric(18,4),
  maintenance_costs numeric(18,4),
  currency text NOT NULL DEFAULT 'CHF',
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  schema_version integer NOT NULL DEFAULT 2,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_canonical_real_estate_dossier ON public.canonical_real_estate(dossier_id);

-- 10. deductions (1:1)
CREATE TABLE public.canonical_deductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL UNIQUE REFERENCES public.canonical_dossiers(id) ON DELETE CASCADE,
  commuting jsonb NOT NULL DEFAULT '{}'::jsonb,
  meals jsonb NOT NULL DEFAULT '{}'::jsonb,
  education jsonb NOT NULL DEFAULT '{}'::jsonb,
  health_costs jsonb NOT NULL DEFAULT '{}'::jsonb,
  pillar3a numeric(18,4),
  donations jsonb NOT NULL DEFAULT '{}'::jsonb,
  childcare jsonb NOT NULL DEFAULT '{}'::jsonb,
  other jsonb NOT NULL DEFAULT '{}'::jsonb,
  currency text NOT NULL DEFAULT 'CHF',
  schema_version integer NOT NULL DEFAULT 2,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 11. attachments
CREATE TABLE public.canonical_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES public.canonical_dossiers(id) ON DELETE CASCADE,
  uploaded_document_id uuid,
  mime_type text,
  extracted_entities jsonb NOT NULL DEFAULT '{}'::jsonb,
  extraction_confidence numeric(5,4),
  extraction_model text,
  extracted_at timestamptz,
  schema_version integer NOT NULL DEFAULT 2,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_canonical_attachments_dossier ON public.canonical_attachments(dossier_id);
CREATE INDEX idx_canonical_attachments_doc ON public.canonical_attachments(uploaded_document_id);

ALTER TABLE public.canonical_employment_incomes
  ADD CONSTRAINT canonical_employment_source_doc_fk
  FOREIGN KEY (source_document_id) REFERENCES public.canonical_attachments(id) ON DELETE SET NULL;

-- 12. dossier_snapshots (append-only)
CREATE TABLE public.canonical_dossier_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES public.canonical_dossiers(id) ON DELETE CASCADE,
  revision integer NOT NULL,
  schema_version integer NOT NULL,
  snapshot jsonb NOT NULL,
  reason public.canonical_snapshot_reason NOT NULL DEFAULT 'manual',
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_canonical_snapshots_dossier ON public.canonical_dossier_snapshots(dossier_id);

-- 13. field_provenance
CREATE TABLE public.canonical_field_provenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES public.canonical_dossiers(id) ON DELETE CASCADE,
  entity_table text NOT NULL,
  entity_id uuid NOT NULL,
  field_path text NOT NULL,
  source_type public.provenance_source_type NOT NULL DEFAULT 'manual',
  source_document_id uuid REFERENCES public.canonical_attachments(id) ON DELETE SET NULL,
  extraction_model text,
  confidence_score numeric(5,4),
  extracted_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  schema_version integer NOT NULL DEFAULT 2,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_table, entity_id, field_path)
);
CREATE INDEX idx_canonical_provenance_dossier ON public.canonical_field_provenance(dossier_id);
CREATE INDEX idx_canonical_provenance_doc ON public.canonical_field_provenance(source_document_id);
CREATE INDEX idx_canonical_provenance_entity ON public.canonical_field_provenance(entity_table, entity_id);

-- 14. calculations (append-only)
CREATE TABLE public.canonical_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES public.canonical_dossiers(id) ON DELETE CASCADE,
  revision integer NOT NULL,
  calculator text NOT NULL,
  canton text,
  inputs_hash text NOT NULL,
  outputs_hash text,
  outputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  schema_version integer NOT NULL DEFAULT 2,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_canonical_calculations_dossier ON public.canonical_calculations(dossier_id);
CREATE INDEX idx_canonical_calculations_calculator ON public.canonical_calculations(calculator);

-- 15. validations
CREATE TABLE public.canonical_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES public.canonical_dossiers(id) ON DELETE CASCADE,
  revision integer NOT NULL,
  validator text NOT NULL,
  canton text,
  status public.canonical_validation_status NOT NULL,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  schema_version integer NOT NULL DEFAULT 2,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_canonical_validations_dossier ON public.canonical_validations(dossier_id);
CREATE INDEX idx_canonical_validations_validator ON public.canonical_validations(validator);

-- 16. exports (append-only)
CREATE TABLE public.canonical_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES public.canonical_dossiers(id) ON DELETE CASCADE,
  dossier_revision integer NOT NULL,
  snapshot_id uuid REFERENCES public.canonical_dossier_snapshots(id) ON DELETE SET NULL,
  adapter_id text NOT NULL,
  format text NOT NULL,
  canton text,
  rules_version text,
  generated_at timestamptz NOT NULL,
  inputs_hash text NOT NULL,
  output_hash text,
  output_path text,
  status public.canonical_export_status NOT NULL DEFAULT 'prepared',
  validation_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  schema_version integer NOT NULL DEFAULT 2,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_canonical_exports_dossier ON public.canonical_exports(dossier_id);
CREATE INDEX idx_canonical_exports_snapshot ON public.canonical_exports(snapshot_id);

-- updated_at trigger function (reuse if exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column' AND pronamespace = 'public'::regnamespace) THEN
    CREATE FUNCTION public.update_updated_at_column()
    RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
    BEGIN NEW.updated_at = now(); RETURN NEW; END; $fn$;
  END IF;
END$$;

DO $$
DECLARE t text;
DECLARE all_tables text[] := ARRAY[
  'canonical_dossiers','canonical_persons','canonical_household',
  'canonical_employment_incomes','canonical_self_employment_incomes','canonical_pension_incomes',
  'canonical_assets','canonical_debts','canonical_real_estate','canonical_deductions',
  'canonical_attachments','canonical_field_provenance'
];
BEGIN
  FOREACH t IN ARRAY all_tables LOOP
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t);
  END LOOP;
END$$;

-- Helper: ownership check
CREATE OR REPLACE FUNCTION public.user_owns_canonical_dossier(_dossier_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.canonical_dossiers d WHERE d.id = _dossier_id AND d.user_id = auth.uid());
$$;

-- Enable RLS
ALTER TABLE public.canonical_dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_household ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_employment_incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_self_employment_incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_pension_incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_real_estate ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_dossier_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_field_provenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_exports ENABLE ROW LEVEL SECURITY;

-- Dossiers policies
CREATE POLICY "dossiers_select_own_or_admin" ON public.canonical_dossiers FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "dossiers_insert_own" ON public.canonical_dossiers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dossiers_update_own_or_admin" ON public.canonical_dossiers FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "dossiers_delete_own_or_admin" ON public.canonical_dossiers FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- Child tables: full CRUD via dossier ownership
DO $$
DECLARE t text;
DECLARE child_tables text[] := ARRAY[
  'canonical_persons','canonical_household','canonical_employment_incomes',
  'canonical_self_employment_incomes','canonical_pension_incomes',
  'canonical_assets','canonical_debts','canonical_real_estate',
  'canonical_deductions','canonical_attachments'
];
BEGIN
  FOREACH t IN ARRAY child_tables LOOP
    EXECUTE format('CREATE POLICY "%1$s_select" ON public.%1$I FOR SELECT USING (public.user_owns_canonical_dossier(dossier_id) OR public.has_role(auth.uid(), ''admin''::app_role));', t);
    EXECUTE format('CREATE POLICY "%1$s_insert" ON public.%1$I FOR INSERT WITH CHECK (public.user_owns_canonical_dossier(dossier_id));', t);
    EXECUTE format('CREATE POLICY "%1$s_update" ON public.%1$I FOR UPDATE USING (public.user_owns_canonical_dossier(dossier_id) OR public.has_role(auth.uid(), ''admin''::app_role));', t);
    EXECUTE format('CREATE POLICY "%1$s_delete" ON public.%1$I FOR DELETE USING (public.user_owns_canonical_dossier(dossier_id) OR public.has_role(auth.uid(), ''admin''::app_role));', t);
  END LOOP;
END$$;

-- Append-only: select+insert for owners, update/delete admin only
DO $$
DECLARE t text;
DECLARE appendonly text[] := ARRAY[
  'canonical_dossier_snapshots','canonical_field_provenance',
  'canonical_calculations','canonical_validations','canonical_exports'
];
BEGIN
  FOREACH t IN ARRAY appendonly LOOP
    EXECUTE format('CREATE POLICY "%1$s_select" ON public.%1$I FOR SELECT USING (public.user_owns_canonical_dossier(dossier_id) OR public.has_role(auth.uid(), ''admin''::app_role));', t);
    EXECUTE format('CREATE POLICY "%1$s_insert" ON public.%1$I FOR INSERT WITH CHECK (public.user_owns_canonical_dossier(dossier_id));', t);
    EXECUTE format('CREATE POLICY "%1$s_update_admin" ON public.%1$I FOR UPDATE USING (public.has_role(auth.uid(), ''admin''::app_role));', t);
    EXECUTE format('CREATE POLICY "%1$s_delete_admin" ON public.%1$I FOR DELETE USING (public.has_role(auth.uid(), ''admin''::app_role));', t);
  END LOOP;
END$$;

-- Snapshot RPC
CREATE OR REPLACE FUNCTION public.create_dossier_snapshot(
  p_dossier_id uuid,
  p_reason public.canonical_snapshot_reason DEFAULT 'manual'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_dossier public.canonical_dossiers%ROWTYPE;
  v_snapshot jsonb;
  v_id uuid;
  v_new_revision integer;
BEGIN
  SELECT * INTO v_dossier FROM public.canonical_dossiers WHERE id = p_dossier_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dossier % not found', p_dossier_id;
  END IF;

  IF auth.uid() IS NOT NULL
     AND v_dossier.user_id <> auth.uid()
     AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_new_revision := v_dossier.current_revision + 1;

  v_snapshot := jsonb_build_object(
    'dossier', to_jsonb(v_dossier),
    'persons', COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM public.canonical_persons p WHERE p.dossier_id = p_dossier_id), '[]'::jsonb),
    'household', (SELECT to_jsonb(h) FROM public.canonical_household h WHERE h.dossier_id = p_dossier_id),
    'employment_incomes', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM public.canonical_employment_incomes x WHERE x.dossier_id = p_dossier_id), '[]'::jsonb),
    'self_employment_incomes', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM public.canonical_self_employment_incomes x WHERE x.dossier_id = p_dossier_id), '[]'::jsonb),
    'pension_incomes', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM public.canonical_pension_incomes x WHERE x.dossier_id = p_dossier_id), '[]'::jsonb),
    'assets', (SELECT to_jsonb(a) FROM public.canonical_assets a WHERE a.dossier_id = p_dossier_id),
    'debts', (SELECT to_jsonb(d) FROM public.canonical_debts d WHERE d.dossier_id = p_dossier_id),
    'real_estate', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM public.canonical_real_estate r WHERE r.dossier_id = p_dossier_id), '[]'::jsonb),
    'deductions', (SELECT to_jsonb(de) FROM public.canonical_deductions de WHERE de.dossier_id = p_dossier_id),
    'attachments', COALESCE((SELECT jsonb_agg(to_jsonb(a)) FROM public.canonical_attachments a WHERE a.dossier_id = p_dossier_id), '[]'::jsonb),
    'provenance', COALESCE((SELECT jsonb_agg(to_jsonb(fp)) FROM public.canonical_field_provenance fp WHERE fp.dossier_id = p_dossier_id), '[]'::jsonb)
  );

  INSERT INTO public.canonical_dossier_snapshots (
    dossier_id, revision, schema_version, snapshot, reason, created_by
  ) VALUES (
    p_dossier_id, v_new_revision, v_dossier.schema_version, v_snapshot, p_reason, auth.uid()
  ) RETURNING id INTO v_id;

  UPDATE public.canonical_dossiers
     SET current_revision = v_new_revision, updated_at = now()
   WHERE id = p_dossier_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_dossier_snapshot(uuid, public.canonical_snapshot_reason) TO authenticated, service_role;

-- Auto-snapshot trigger on tax_returns status change
CREATE OR REPLACE FUNCTION public.canonical_auto_snapshot_on_tax_return_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_dossier_id uuid;
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.status IN ('documents_submitted', 'paid') THEN
    SELECT id INTO v_dossier_id
      FROM public.canonical_dossiers
     WHERE tax_filer_id = NEW.tax_filer_id AND tax_year = NEW.tax_year;
    IF v_dossier_id IS NOT NULL THEN
      PERFORM public.create_dossier_snapshot(v_dossier_id, 'submission'::public.canonical_snapshot_reason);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_canonical_auto_snapshot ON public.tax_returns;
CREATE TRIGGER trg_canonical_auto_snapshot
AFTER UPDATE OF status ON public.tax_returns
FOR EACH ROW EXECUTE FUNCTION public.canonical_auto_snapshot_on_tax_return_status();
