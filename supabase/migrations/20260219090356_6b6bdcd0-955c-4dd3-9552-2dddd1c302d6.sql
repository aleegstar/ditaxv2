
-- 1. OCR Document Configs table (admin-managed keyword configurations)
CREATE TABLE public.ocr_document_configs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type_id text NOT NULL UNIQUE,
    display_name text NOT NULL,
    keywords text[] NOT NULL DEFAULT '{}',
    min_match_count integer NOT NULL DEFAULT 2,
    confidence text NOT NULL DEFAULT 'medium' CHECK (confidence IN ('high', 'medium', 'low')),
    is_active boolean NOT NULL DEFAULT true,
    updated_by uuid REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ocr_document_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage OCR configs"
    ON public.ocr_document_configs
    FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. OCR Unrecognized Uploads table (tracks uploads that couldn't be classified)
CREATE TABLE public.ocr_unrecognized_uploads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id uuid REFERENCES public.uploaded_documents(id) ON DELETE SET NULL,
    file_name text NOT NULL,
    detected_text_sample text,
    matched_keywords text[] DEFAULT '{}',
    best_match_type text,
    best_match_score numeric(5,2) DEFAULT 0,
    status text NOT NULL DEFAULT 'unresolved' CHECK (status IN ('unresolved', 'resolved', 'ignored')),
    resolved_by uuid REFERENCES auth.users(id),
    resolved_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ocr_unrecognized_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage unrecognized uploads"
    ON public.ocr_unrecognized_uploads
    FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own unrecognized uploads"
    ON public.ocr_unrecognized_uploads
    FOR SELECT
    USING (auth.uid() = user_id);

-- Trigger for updated_at on ocr_document_configs
CREATE TRIGGER update_ocr_document_configs_updated_at
    BEFORE UPDATE ON public.ocr_document_configs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
