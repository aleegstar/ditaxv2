-- Fix the trigger to only notify when workflow_step changes to 'completed'
CREATE OR REPLACE FUNCTION public.notify_user_tax_return_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only notify when workflow_step actually changes to 'completed'
  IF OLD.workflow_step IS DISTINCT FROM NEW.workflow_step AND NEW.workflow_step = 'completed' THEN
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
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Clean up duplicate notifications for tax_return_completed
-- Keep only the most recent notification per tax_return_id
DELETE FROM user_notifications
WHERE id IN (
  SELECT id FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY (metadata->>'tax_return_id')::uuid 
        ORDER BY created_at DESC
      ) as rn
    FROM user_notifications
    WHERE type = 'tax_return_completed'
      AND metadata->>'tax_return_id' IS NOT NULL
  ) t
  WHERE rn > 1
);