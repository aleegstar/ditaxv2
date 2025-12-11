
-- Create table for completed tax returns uploaded by admin
CREATE TABLE public.completed_tax_returns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tax_year TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'application/pdf',
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  uploaded_by_admin_id UUID,
  status TEXT NOT NULL DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.completed_tax_returns ENABLE ROW LEVEL SECURITY;

-- Create policy that allows users to view only their own completed tax returns
CREATE POLICY "Users can view their own completed tax returns" 
  ON public.completed_tax_returns 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy that allows admins to insert completed tax returns for any user
CREATE POLICY "Admins can insert completed tax returns" 
  ON public.completed_tax_returns 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create policy that allows admins to update completed tax returns
CREATE POLICY "Admins can update completed tax returns" 
  ON public.completed_tax_returns 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create policy that allows admins to delete completed tax returns
CREATE POLICY "Admins can delete completed tax returns" 
  ON public.completed_tax_returns 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
