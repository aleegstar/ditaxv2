-- Create table for electronic signatures on tax returns
CREATE TABLE public.tax_return_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  completed_tax_return_id UUID NOT NULL REFERENCES completed_tax_returns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tax_year TEXT NOT NULL,
  
  -- Signature data
  document_hash TEXT NOT NULL,
  signature_hash TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Signer identification
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  signer_date_of_birth DATE,
  ip_address INET,
  user_agent TEXT,
  
  -- Authorization declaration
  authorization_text TEXT NOT NULL,
  authorization_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'signed',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(completed_tax_return_id, user_id)
);

-- Add signature columns to completed_tax_returns
ALTER TABLE public.completed_tax_returns 
ADD COLUMN IF NOT EXISTS signature_status TEXT DEFAULT 'pending_signature',
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS signed_pdf_path TEXT;

-- Enable RLS
ALTER TABLE public.tax_return_signatures ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tax_return_signatures
CREATE POLICY "Users can view their own signatures"
ON public.tax_return_signatures
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own signatures"
ON public.tax_return_signatures
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all signatures"
ON public.tax_return_signatures
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update signatures"
ON public.tax_return_signatures
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_tax_return_signatures_user_id ON public.tax_return_signatures(user_id);
CREATE INDEX idx_tax_return_signatures_completed_tax_return_id ON public.tax_return_signatures(completed_tax_return_id);
CREATE INDEX idx_completed_tax_returns_signature_status ON public.completed_tax_returns(signature_status);

-- Trigger for updated_at
CREATE TRIGGER update_tax_return_signatures_updated_at
BEFORE UPDATE ON public.tax_return_signatures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();