-- Stufe 1: Payment Events Tracking Tabelle
CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  session_id TEXT,
  payment_intent_id TEXT,
  customer_id TEXT,
  status TEXT,
  failure_code TEXT,
  failure_message TEXT,
  payment_method TEXT,
  payment_method_type TEXT,
  amount INTEGER,
  currency TEXT,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  tax_return_id UUID REFERENCES tax_returns(id) ON DELETE CASCADE,
  raw_event JSONB,
  processed BOOLEAN DEFAULT FALSE
);

-- Index für schnelle Suche
CREATE INDEX IF NOT EXISTS idx_payment_events_session_id ON payment_events(session_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_payment_intent ON payment_events(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_user_id ON payment_events(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_event_type ON payment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_events_created_at ON payment_events(created_at DESC);

-- RLS Policies für payment_events
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all payment events"
  ON payment_events FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own payment events"
  ON payment_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert payment events"
  ON payment_events FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.role() = 'service_role'::text) OR 
    ((auth.jwt() ->> 'iss'::text) = 'supabase'::text)
  );

-- Stufe 2: Erweitere tax_returns Tabelle um Payment-Tracking
ALTER TABLE tax_returns 
  ADD COLUMN IF NOT EXISTS checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_failure_code TEXT,
  ADD COLUMN IF NOT EXISTS payment_failure_message TEXT,
  ADD COLUMN IF NOT EXISTS last_payment_event_at TIMESTAMPTZ;

-- Index für schnelle Suche
CREATE INDEX IF NOT EXISTS idx_tax_returns_checkout_session ON tax_returns(checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_tax_returns_payment_intent ON tax_returns(payment_intent_id);

COMMENT ON TABLE payment_events IS 'Speichert alle Stripe Webhook Events für vollständige Payment-Transparenz und Debugging';
COMMENT ON COLUMN tax_returns.checkout_session_id IS 'Stripe Checkout Session ID für Tracking';
COMMENT ON COLUMN tax_returns.payment_intent_id IS 'Stripe Payment Intent ID für Status-Verfolgung';
COMMENT ON COLUMN tax_returns.payment_failure_code IS 'Stripe Fehlercode bei fehlgeschlagener Zahlung';
COMMENT ON COLUMN tax_returns.payment_failure_message IS 'Detaillierte Fehlermeldung bei fehlgeschlagener Zahlung';