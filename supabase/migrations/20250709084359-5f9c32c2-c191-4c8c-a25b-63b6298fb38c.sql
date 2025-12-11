
-- Create the completed-tax-returns storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('completed-tax-returns', 'completed-tax-returns', false);

-- Create RLS policies for the completed-tax-returns bucket
CREATE POLICY "Users can view their own completed tax returns" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'completed-tax-returns' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can upload completed tax returns" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'completed-tax-returns' AND EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
));

CREATE POLICY "Admins can update completed tax returns" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'completed-tax-returns' AND EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
));

CREATE POLICY "Admins can delete completed tax returns" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'completed-tax-returns' AND EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
));
