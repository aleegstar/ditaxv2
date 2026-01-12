-- Create table for account deletion feedback
CREATE TABLE public.account_deletion_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  reason TEXT NOT NULL,
  additional_feedback TEXT,
  deleted_user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.account_deletion_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can read deletion feedback
CREATE POLICY "Admins can read deletion feedback"
ON public.account_deletion_feedback FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Service role can insert feedback
CREATE POLICY "Service role can insert feedback"
ON public.account_deletion_feedback FOR INSERT
WITH CHECK (true);

-- Add index for faster queries
CREATE INDEX idx_account_deletion_feedback_created_at ON public.account_deletion_feedback(created_at DESC);