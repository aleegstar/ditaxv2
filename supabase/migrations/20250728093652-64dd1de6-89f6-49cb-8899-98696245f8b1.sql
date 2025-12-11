-- Add admin policy to allow admins to view all form data
CREATE POLICY "Admins can view all form data" 
  ON public.form_data 
  FOR SELECT 
  USING (has_role(auth.uid(), 'admin'::app_role));