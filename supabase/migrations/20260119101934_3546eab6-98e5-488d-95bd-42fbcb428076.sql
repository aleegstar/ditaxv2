-- Create missing_item_requests table
CREATE TABLE public.missing_item_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tax_return_id UUID NOT NULL REFERENCES public.tax_returns(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES public.profiles(id),
  request_type TEXT NOT NULL CHECK (request_type IN ('document', 'information')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'rejected')),
  reminder_count INTEGER NOT NULL DEFAULT 0,
  last_reminder_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create missing_item_responses table
CREATE TABLE public.missing_item_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.missing_item_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  response_type TEXT NOT NULL CHECK (response_type IN ('text', 'file')),
  text_content TEXT,
  file_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.missing_item_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missing_item_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for missing_item_requests
-- Users can view their own requests
CREATE POLICY "Users can view their own missing item requests"
  ON public.missing_item_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all missing item requests"
  ON public.missing_item_requests
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Admins can create requests
CREATE POLICY "Admins can create missing item requests"
  ON public.missing_item_requests
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Users can update their own requests (only status to submitted)
CREATE POLICY "Users can update their own request status"
  ON public.missing_item_requests
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can update all requests
CREATE POLICY "Admins can update missing item requests"
  ON public.missing_item_requests
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Admins can delete requests
CREATE POLICY "Admins can delete missing item requests"
  ON public.missing_item_requests
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- RLS Policies for missing_item_responses
-- Users can view their own responses
CREATE POLICY "Users can view their own responses"
  ON public.missing_item_responses
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all responses
CREATE POLICY "Admins can view all responses"
  ON public.missing_item_responses
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Users can create their own responses
CREATE POLICY "Users can create their own responses"
  ON public.missing_item_responses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can delete responses
CREATE POLICY "Admins can delete responses"
  ON public.missing_item_responses
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Create updated_at trigger for missing_item_requests
CREATE TRIGGER update_missing_item_requests_updated_at
  BEFORE UPDATE ON public.missing_item_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add documents_submitted to tax_returns status check
ALTER TABLE public.tax_returns DROP CONSTRAINT IF EXISTS tax_returns_status_check;
ALTER TABLE public.tax_returns ADD CONSTRAINT tax_returns_status_check 
  CHECK (status IS NULL OR status IN (
    'pending', 'processing', 'success', 'error', 
    'missing_documents', 'missing_information', 'documents_submitted'
  ));

-- Create indexes for performance
CREATE INDEX idx_missing_item_requests_user_id ON public.missing_item_requests(user_id);
CREATE INDEX idx_missing_item_requests_status ON public.missing_item_requests(status);
CREATE INDEX idx_missing_item_requests_tax_return_id ON public.missing_item_requests(tax_return_id);
CREATE INDEX idx_missing_item_responses_request_id ON public.missing_item_responses(request_id);

-- Create function to auto-update tax_return status when all items are submitted
CREATE OR REPLACE FUNCTION public.update_tax_return_on_missing_items_submitted()
RETURNS TRIGGER AS $$
DECLARE
  pending_count INTEGER;
  tax_return_record RECORD;
BEGIN
  -- Get the tax return for this request
  SELECT tax_return_id INTO tax_return_record FROM public.missing_item_requests WHERE id = NEW.id;
  
  -- Count pending requests for this tax return
  SELECT COUNT(*) INTO pending_count
  FROM public.missing_item_requests
  WHERE tax_return_id = (SELECT tax_return_id FROM public.missing_item_requests WHERE id = NEW.id)
    AND status = 'pending';
  
  -- If all items are submitted (no pending), update tax_return status
  IF pending_count = 0 AND NEW.status = 'submitted' THEN
    UPDATE public.tax_returns
    SET status = 'documents_submitted', updated_at = now()
    WHERE id = (SELECT tax_return_id FROM public.missing_item_requests WHERE id = NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_tax_return_on_missing_items
  AFTER UPDATE OF status ON public.missing_item_requests
  FOR EACH ROW
  WHEN (NEW.status = 'submitted')
  EXECUTE FUNCTION public.update_tax_return_on_missing_items_submitted();

-- Create notification trigger for new missing item requests
CREATE OR REPLACE FUNCTION public.notify_user_missing_items_requested()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_notifications (
    user_id,
    type,
    title,
    message,
    related_id,
    metadata
  ) VALUES (
    NEW.user_id,
    'missing_items_requested',
    CASE 
      WHEN NEW.request_type = 'document' THEN 'Fehlende Unterlagen'
      ELSE 'Fehlende Angaben'
    END,
    'Wir benötigen weitere Informationen: ' || NEW.title,
    NEW.id,
    jsonb_build_object(
      'request_type', NEW.request_type,
      'title', NEW.title,
      'tax_return_id', NEW.tax_return_id
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_notify_missing_items
  AFTER INSERT ON public.missing_item_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_user_missing_items_requested();