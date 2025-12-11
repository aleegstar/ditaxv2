-- Update notification functions to use DU-Form (informal "you")

-- Update chat message notification function
CREATE OR REPLACE FUNCTION notify_user_new_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only notify if the message has a recipient (not pool messages)
  IF NEW.recipient_id IS NOT NULL THEN
    INSERT INTO user_notifications (
      user_id,
      type,
      title,
      message,
      related_id,
      metadata
    )
    VALUES (
      NEW.recipient_id,
      'new_message',
      'Neue Nachricht',
      CASE 
        WHEN NEW.attachment_id IS NOT NULL THEN 'Du hast eine neue Nachricht mit Anhang erhalten'
        ELSE 'Du hast eine neue Nachricht erhalten'
      END,
      NEW.id,
      jsonb_build_object('message_id', NEW.id, 'sender_id', NEW.sender_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update tax return completed notification function
CREATE OR REPLACE FUNCTION notify_user_tax_return_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_notifications (
    user_id,
    type,
    title,
    message,
    related_id,
    metadata
  )
  VALUES (
    NEW.user_id,
    'tax_return_completed',
    'Steuererklärung fertiggestellt',
    'Deine Steuererklärung für das Jahr ' || NEW.tax_year || ' wurde erfolgreich abgeschlossen und ist bereit zum Download.',
    NEW.id,
    jsonb_build_object('tax_year', NEW.tax_year, 'tax_return_id', NEW.id)
  );
  
  RETURN NEW;
END;
$$;