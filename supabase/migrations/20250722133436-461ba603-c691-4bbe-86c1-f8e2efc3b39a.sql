
-- Create table for storing chat history per user and tax year
CREATE TABLE IF NOT EXISTS public.form_chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tax_year text NOT NULL,
  step_id text NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('question', 'answer')),
  content text NOT NULL,
  step_index integer NOT NULL,
  timestamp bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on chat history table
ALTER TABLE public.form_chat_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for chat history
CREATE POLICY "Users can view their own chat history" 
  ON public.form_chat_history 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat history" 
  ON public.form_chat_history 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat history" 
  ON public.form_chat_history 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat history" 
  ON public.form_chat_history 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create table for storing form progress per user and tax year
CREATE TABLE IF NOT EXISTS public.form_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tax_year text NOT NULL,
  current_step integer DEFAULT 0,
  form_sections jsonb DEFAULT '{"contactInfo": false, "income": false, "assets": false, "deductions": false}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, tax_year)
);

-- Enable RLS on form progress table
ALTER TABLE public.form_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for form progress
CREATE POLICY "Users can view their own form progress" 
  ON public.form_progress 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own form progress" 
  ON public.form_progress 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own form progress" 
  ON public.form_progress 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own form progress" 
  ON public.form_progress 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_form_chat_history_user_tax_year 
  ON public.form_chat_history(user_id, tax_year);

CREATE INDEX IF NOT EXISTS idx_form_progress_user_tax_year 
  ON public.form_progress(user_id, tax_year);

-- Create trigger to update updated_at on form_progress
CREATE OR REPLACE FUNCTION update_form_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_form_progress_updated_at_trigger
    BEFORE UPDATE ON public.form_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_form_progress_updated_at();
