-- Tabelle für User-Feedback
CREATE TABLE public.user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feature_request TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS aktivieren
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- User kann eigenes Feedback erstellen
CREATE POLICY "Users can insert own feedback"
ON public.user_feedback FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins können alles lesen
CREATE POLICY "Admins can read all feedback"
ON public.user_feedback FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));