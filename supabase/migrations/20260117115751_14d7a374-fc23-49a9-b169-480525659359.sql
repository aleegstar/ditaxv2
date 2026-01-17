-- Create chat_quick_replies table for admin quick response templates
CREATE TABLE public.chat_quick_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'Allgemein',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Enable Row Level Security
ALTER TABLE public.chat_quick_replies ENABLE ROW LEVEL SECURITY;

-- Only admins can read quick replies
CREATE POLICY "Admins can view quick replies"
ON public.chat_quick_replies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Only admins can insert quick replies
CREATE POLICY "Admins can create quick replies"
ON public.chat_quick_replies
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Only admins can update quick replies
CREATE POLICY "Admins can update quick replies"
ON public.chat_quick_replies
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Only admins can delete quick replies
CREATE POLICY "Admins can delete quick replies"
ON public.chat_quick_replies
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_chat_quick_replies_updated_at
BEFORE UPDATE ON public.chat_quick_replies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster trigger lookups
CREATE INDEX idx_chat_quick_replies_trigger ON public.chat_quick_replies(trigger);