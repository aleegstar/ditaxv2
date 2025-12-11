-- Create definitive tax bills table
CREATE TABLE public.definitive_tax_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tax_year text NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL DEFAULT 'application/pdf',
  uploaded_by_user_id uuid, -- NULL wenn von Admin hochgeladen
  uploaded_by_admin_id uuid, -- NULL wenn von User hochgeladen
  upload_date timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending', -- pending, under_review, approved, rejected, revision_required
  admin_reviewed_by uuid, -- Admin der die Prüfung gemacht hat
  admin_review_date timestamp with time zone,
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, tax_year) -- Pro User und Jahr nur eine definitive Rechnung
);

-- Enable RLS
ALTER TABLE public.definitive_tax_bills ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own definitive tax bills" 
ON public.definitive_tax_bills 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all definitive tax bills" 
ON public.definitive_tax_bills 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own definitive tax bills" 
ON public.definitive_tax_bills 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND auth.uid() = uploaded_by_user_id);

CREATE POLICY "Admins can insert definitive tax bills for users" 
ON public.definitive_tax_bills 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = uploaded_by_admin_id);

CREATE POLICY "Admins can update all definitive tax bills" 
ON public.definitive_tax_bills 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete definitive tax bills" 
ON public.definitive_tax_bills 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for definitive tax bills
INSERT INTO storage.buckets (id, name, public) 
VALUES ('definitive-tax-bills', 'definitive-tax-bills', false);

-- Create storage policies
CREATE POLICY "Users can view their own definitive tax bills" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'definitive-tax-bills' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all definitive tax bills" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'definitive-tax-bills' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can upload their own definitive tax bills" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'definitive-tax-bills' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can upload definitive tax bills for users" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'definitive-tax-bills' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete definitive tax bills" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'definitive-tax-bills' AND has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_definitive_tax_bills_updated_at
BEFORE UPDATE ON public.definitive_tax_bills
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create notification trigger
CREATE OR REPLACE FUNCTION public.notify_definitive_tax_bill_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notify user when status changes (except on initial creation)
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO public.user_notifications (
      user_id,
      type,
      title,
      message,
      related_id,
      metadata
    ) VALUES (
      NEW.user_id,
      'definitive_tax_bill_status',
      CASE 
        WHEN NEW.status = 'approved' THEN 'Definitive Steuerrechnung genehmigt'
        WHEN NEW.status = 'rejected' THEN 'Definitive Steuerrechnung abgelehnt'
        WHEN NEW.status = 'under_review' THEN 'Definitive Steuerrechnung wird geprüft'
        WHEN NEW.status = 'revision_required' THEN 'Definitive Steuerrechnung benötigt Überarbeitung'
        ELSE 'Status der definitiven Steuerrechnung geändert'
      END,
      CASE 
        WHEN NEW.status = 'approved' THEN 'Ihre definitive Steuerrechnung für ' || NEW.tax_year || ' wurde genehmigt.'
        WHEN NEW.status = 'rejected' THEN 'Ihre definitive Steuerrechnung für ' || NEW.tax_year || ' wurde abgelehnt: ' || COALESCE(NEW.admin_notes, 'Kein Grund angegeben')
        WHEN NEW.status = 'under_review' THEN 'Ihre definitive Steuerrechnung für ' || NEW.tax_year || ' wird derzeit geprüft.'
        WHEN NEW.status = 'revision_required' THEN 'Ihre definitive Steuerrechnung für ' || NEW.tax_year || ' benötigt eine Überarbeitung: ' || COALESCE(NEW.admin_notes, 'Bitte kontaktieren Sie den Support')
        ELSE 'Der Status Ihrer definitiven Steuerrechnung für ' || NEW.tax_year || ' wurde geändert.'
      END,
      NEW.id,
      jsonb_build_object(
        'tax_year', NEW.tax_year,
        'status', NEW.status,
        'old_status', OLD.status
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER definitive_tax_bill_status_notification
AFTER UPDATE ON public.definitive_tax_bills
FOR EACH ROW
EXECUTE FUNCTION public.notify_definitive_tax_bill_status_change();