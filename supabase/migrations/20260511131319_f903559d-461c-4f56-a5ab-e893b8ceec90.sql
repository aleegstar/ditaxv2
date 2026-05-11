-- ============================================================
-- BL-01: Race-safe admin approval workflow
-- Replace approve_admin_action with atomic claim-update
-- ============================================================

CREATE OR REPLACE FUNCTION public.approve_admin_action(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_request RECORD;
  v_actor uuid := auth.uid();
BEGIN
  IF NOT has_role(v_actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin privileges required' USING ERRCODE = '42501';
  END IF;

  -- ATOMIC CLAIM: only the first concurrent approver wins.
  -- Filter excludes: own request, expired, non-pending.
  UPDATE public.admin_action_requests
     SET status      = 'approved',
         approved_by = v_actor,
         approved_at = NOW()
   WHERE id            = p_request_id
     AND status        = 'pending'
     AND requested_by <> v_actor
     AND created_at    > NOW() - INTERVAL '24 hours'
  RETURNING * INTO v_request;

  IF NOT FOUND THEN
    -- Distinguish reason for caller AND log the race attempt.
    SELECT * INTO v_request FROM public.admin_action_requests WHERE id = p_request_id;

    INSERT INTO public.security_audit_logs_immutable (user_id, action, resource, success, metadata)
    VALUES (v_actor, 'ADMIN_ACTION_APPROVE_CONFLICT',
            COALESCE(v_request.action_type, 'unknown'), false,
            jsonb_build_object(
              'request_id', p_request_id,
              'current_status', COALESCE(v_request.status, 'not_found'),
              'requested_by', v_request.requested_by,
              'attempted_by', v_actor,
              'reason', CASE
                WHEN v_request.id IS NULL THEN 'not_found'
                WHEN v_request.requested_by = v_actor THEN 'self_approval_blocked'
                WHEN v_request.status <> 'pending' THEN 'already_decided'
                WHEN v_request.created_at <= NOW() - INTERVAL '24 hours' THEN 'expired'
                ELSE 'race_lost'
              END
            ));

    IF v_request.id IS NULL THEN
      RAISE EXCEPTION 'Request not found' USING ERRCODE = 'P0002';
    ELSIF v_request.requested_by = v_actor THEN
      RAISE EXCEPTION 'Cannot approve your own request' USING ERRCODE = '42501';
    ELSIF v_request.status <> 'pending' THEN
      RAISE EXCEPTION 'Request is not pending (status: %)', v_request.status USING ERRCODE = '55000';
    ELSE
      -- expired
      UPDATE public.admin_action_requests SET status='expired' WHERE id=p_request_id AND status='pending';
      RAISE EXCEPTION 'Request has expired (>24 hours old)' USING ERRCODE = '55000';
    END IF;
  END IF;

  INSERT INTO public.security_audit_logs_immutable (user_id, action, resource, success, metadata)
  VALUES (v_actor, 'ADMIN_ACTION_APPROVED',
          v_request.action_type || ' - ' || v_request.target_resource, true,
          jsonb_build_object(
            'request_id', p_request_id,
            'requested_by', v_request.requested_by,
            'approved_by', v_actor,
            'action_type', v_request.action_type
          ));

  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'action_type', v_request.action_type,
    'target_resource', v_request.target_resource,
    'message', 'Request approved and ready for execution'
  );
END;
$function$;

-- ============================================================
-- BL-01b: Make reject_admin_action equally atomic
-- ============================================================
CREATE OR REPLACE FUNCTION public.reject_admin_action(p_request_id uuid, p_rejection_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_request RECORD;
  v_actor uuid := auth.uid();
BEGIN
  IF NOT has_role(v_actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin privileges required' USING ERRCODE = '42501';
  END IF;

  IF p_rejection_reason IS NULL OR length(p_rejection_reason) < 5 THEN
    RAISE EXCEPTION 'Rejection reason must be at least 5 characters' USING ERRCODE = '22000';
  END IF;

  UPDATE public.admin_action_requests
     SET status           = 'rejected',
         approved_by      = v_actor,
         approved_at      = NOW(),
         rejection_reason = p_rejection_reason
   WHERE id     = p_request_id
     AND status = 'pending'
  RETURNING * INTO v_request;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or no longer pending' USING ERRCODE = '55000';
  END IF;

  INSERT INTO public.security_audit_logs_immutable (user_id, action, resource, success, metadata)
  VALUES (v_actor, 'ADMIN_ACTION_REJECTED',
          v_request.action_type || ' - ' || v_request.target_resource, true,
          jsonb_build_object('request_id', p_request_id, 'rejected_by', v_actor, 'reason', p_rejection_reason));

  RETURN jsonb_build_object('success', true, 'message', 'Request rejected');
END;
$function$;

-- ============================================================
-- BL-02: Stripe webhook idempotency state machine
-- Adds processing_state column for claim-before-process pattern.
-- 'received' -> 'processing' -> 'processed' | 'failed'
-- ============================================================
ALTER TABLE public.payment_events
  ADD COLUMN IF NOT EXISTS processing_state text NOT NULL DEFAULT 'received',
  ADD COLUMN IF NOT EXISTS claimed_at        timestamptz,
  ADD COLUMN IF NOT EXISTS failure_reason    text;

DO $$ BEGIN
  ALTER TABLE public.payment_events
    ADD CONSTRAINT payment_events_processing_state_chk
    CHECK (processing_state IN ('received','processing','processed','failed','duplicate'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- BL-02b: Atomic claim function for the webhook
-- Returns TRUE only for the very first caller per event_id.
-- ============================================================
CREATE OR REPLACE FUNCTION public.claim_stripe_event(
  p_event_id text,
  p_event_type text,
  p_raw_event jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_inserted boolean := false;
  v_existing RECORD;
BEGIN
  INSERT INTO public.payment_events (event_id, event_type, raw_event, processing_state, claimed_at)
  VALUES (p_event_id, p_event_type, p_raw_event, 'processing', NOW())
  ON CONFLICT (event_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted THEN
    RETURN jsonb_build_object('claimed', true, 'replay', false);
  END IF;

  SELECT processing_state, claimed_at INTO v_existing
  FROM public.payment_events WHERE event_id = p_event_id;

  -- Log replay attempt for SIEM
  INSERT INTO public.security_audit_logs (action, success, resource, error_message)
  VALUES ('STRIPE_WEBHOOK_REPLAY', true,
          p_event_type || ':' || p_event_id,
          'Replay detected, state=' || COALESCE(v_existing.processing_state, 'unknown'));

  RETURN jsonb_build_object(
    'claimed', false,
    'replay', true,
    'existing_state', v_existing.processing_state
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_stripe_event_processed(
  p_event_id text,
  p_patch jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.payment_events
     SET processing_state = 'processed',
         processed        = true,
         session_id       = COALESCE((p_patch->>'session_id'), session_id),
         payment_intent_id= COALESCE((p_patch->>'payment_intent_id'), payment_intent_id),
         customer_id      = COALESCE((p_patch->>'customer_id'), customer_id),
         user_id          = COALESCE((p_patch->>'user_id')::uuid, user_id),
         tax_return_id    = COALESCE((p_patch->>'tax_return_id')::uuid, tax_return_id),
         status           = COALESCE((p_patch->>'status'), status),
         amount           = COALESCE((p_patch->>'amount')::bigint, amount),
         currency         = COALESCE((p_patch->>'currency'), currency),
         payment_method   = COALESCE((p_patch->>'payment_method'), payment_method)
   WHERE event_id = p_event_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_stripe_event_failed(
  p_event_id text,
  p_reason text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.payment_events
     SET processing_state = 'failed',
         failure_reason   = LEFT(COALESCE(p_reason, 'unknown'), 1000)
   WHERE event_id = p_event_id;
END;
$function$;

-- Helpful index for SIEM queries
CREATE INDEX IF NOT EXISTS idx_payment_events_processing_state
  ON public.payment_events (processing_state, created_at DESC);