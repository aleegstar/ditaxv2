-- Security Hardening: H-1 Replace insecure current_setting() with Supabase Vault
-- The trigger notify_new_chat_message previously read service_role_key from
-- current_setting('app.settings.service_role_key', true), which is leakable.
-- We rewrite it to use Vault (encrypted at rest) and fail safely.

CREATE OR REPLACE FUNCTION public.notify_new_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  request_id bigint;
  v_service_key text;
BEGIN
  IF NEW.recipient_id IS NULL OR NEW.sender_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Read service role key from Vault (encrypted). If absent, skip silently
  -- so the chat insert itself never fails.
  BEGIN
    SELECT decrypted_secret INTO v_service_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_service_key := NULL;
  END;

  IF v_service_key IS NULL THEN
    RAISE LOG 'notify_new_chat_message: service_role_key not configured in Vault — skipping push notification';
    RETURN NEW;
  END IF;

  SELECT net.http_post(
    url := 'https://gqbhilftduwxjszznnzy.supabase.co/functions/v1/new-message-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object(
      'recipient_id', NEW.recipient_id,
      'sender_id', NEW.sender_id,
      'message_preview', LEFT(COALESCE(NEW.content, ''), 100)
    )
  ) INTO request_id;

  RETURN NEW;
END;
$function$;

-- Defense-in-depth: ensure the dangerous DB-level setting is not present.
-- (No-op if it was never set; harmless otherwise.)
DO $$
BEGIN
  EXECUTE 'ALTER DATABASE postgres RESET app.settings.service_role_key';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;