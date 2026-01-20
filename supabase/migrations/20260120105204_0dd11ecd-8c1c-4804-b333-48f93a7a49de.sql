-- Enable the pg_net extension for HTTP requests from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create the trigger function to notify on new messages
CREATE OR REPLACE FUNCTION public.notify_new_chat_message()
RETURNS TRIGGER AS $$
DECLARE
  request_id bigint;
BEGIN
  -- Only trigger for messages with a recipient
  IF NEW.recipient_id IS NOT NULL AND NEW.sender_id IS NOT NULL THEN
    -- Make async HTTP request to the edge function
    SELECT net.http_post(
      url := 'https://gqbhilftduwxjszznnzy.supabase.co/functions/v1/new-message-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'recipient_id', NEW.recipient_id,
        'sender_id', NEW.sender_id,
        'message_preview', LEFT(COALESCE(NEW.content, ''), 100)
      )
    ) INTO request_id;
    
    RAISE LOG 'New message notification request sent with id: %', request_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger on chat_messages table
DROP TRIGGER IF EXISTS on_new_chat_message_notification ON public.chat_messages;

CREATE TRIGGER on_new_chat_message_notification
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_chat_message();