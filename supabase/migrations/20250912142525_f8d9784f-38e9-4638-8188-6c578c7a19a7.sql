-- Create storage bucket for document templates
INSERT INTO storage.buckets (id, name, public) 
VALUES ('document-templates', 'document-templates', false);

-- Create policies for document templates bucket
CREATE POLICY "Admins can view document templates" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'document-templates' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can upload document templates" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'document-templates' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update document templates" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'document-templates' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete document templates" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'document-templates' AND has_role(auth.uid(), 'admin'::app_role));

-- Create table to track active templates
CREATE TABLE public.document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  template_type TEXT NOT NULL DEFAULT 'cover_letter',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Enable RLS on document_templates
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for document_templates table
CREATE POLICY "Admins can view all document templates" 
ON public.document_templates 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert document templates" 
ON public.document_templates 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = uploaded_by);

CREATE POLICY "Admins can update document templates" 
ON public.document_templates 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete document templates" 
ON public.document_templates 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_document_templates_updated_at
BEFORE UPDATE ON public.document_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();