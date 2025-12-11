
-- Create user_notifications table for in-app notifications
CREATE TABLE public.user_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'chat_message', 'tax_return_completed'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  related_id UUID -- For referencing chat messages, tax returns, etc.
);

-- Add Row Level Security (RLS) to ensure users can only see their own notifications
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Create policy that allows users to SELECT their own notifications
CREATE POLICY "Users can view their own notifications" 
  ON public.user_notifications 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy that allows users to UPDATE their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" 
  ON public.user_notifications 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create policy for system to INSERT notifications
CREATE POLICY "System can create notifications" 
  ON public.user_notifications 
  FOR INSERT 
  WITH CHECK (true);

-- Add to realtime publication for real-time updates
ALTER TABLE public.user_notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;

-- Create function to notify user of new chat message
CREATE OR REPLACE FUNCTION notify_user_new_chat_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if message is not from the recipient (avoid self-notifications)
  IF NEW.sender_id != NEW.recipient_id AND NEW.recipient_id IS NOT NULL THEN
    INSERT INTO public.user_notifications (
      user_id,
      type,
      title,
      message,
      related_id,
      metadata
    ) VALUES (
      NEW.recipient_id,
      'chat_message',
      'Neue Nachricht',
      CASE 
        WHEN NEW.content IS NOT NULL AND LENGTH(NEW.content) > 0 
        THEN LEFT(NEW.content, 100) || CASE WHEN LENGTH(NEW.content) > 100 THEN '...' ELSE '' END
        ELSE 'Sie haben eine neue Nachricht mit Anhang erhalten'
      END,
      NEW.id,
      jsonb_build_object(
        'sender_id', NEW.sender_id,
        'chat_type', NEW.chat_type
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new chat messages
CREATE TRIGGER trigger_notify_new_chat_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_new_chat_message();

-- Create function to notify user of completed tax return
CREATE OR REPLACE FUNCTION notify_user_tax_return_completed()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify when workflow_step changes to 'completed'
  IF OLD.workflow_step != 'completed' AND NEW.workflow_step = 'completed' THEN
    INSERT INTO public.user_notifications (
      user_id,
      type,
      title,
      message,
      related_id,
      metadata
    ) VALUES (
      NEW.user_id,
      'tax_return_completed',
      'Steuererklärung abgeschlossen',
      'Ihre Steuererklärung für das Jahr ' || NEW.tax_year || ' wurde erfolgreich abgeschlossen und ist bereit zum Download.',
      NEW.id,
      jsonb_build_object(
        'tax_year', NEW.tax_year,
        'status', NEW.status
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for completed tax returns
CREATE TRIGGER trigger_notify_tax_return_completed
  AFTER UPDATE ON public.tax_returns
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_tax_return_completed();
