

-- ===========================================
-- SECURITY_AUDIT_LOGS TABLE SICHERUNG
-- ===========================================

-- 1. Entferne alle öffentlichen Rechte von security_audit_logs
REVOKE ALL ON public.security_audit_logs FROM anon;
REVOKE ALL ON public.security_audit_logs FROM authenticated;

-- 2. Aktiviere Row Level Security
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. Lösche bestehende Policies für sauberen Zustand
DROP POLICY IF EXISTS "System can insert audit logs" ON public.security_audit_logs;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.security_audit_logs;

-- 4. Neue restriktive RLS Policies für security_audit_logs

-- Policy: Nur service_role kann Audit-Logs erstellen (System-Level)
CREATE POLICY "System can insert security audit logs" 
ON public.security_audit_logs 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- Policy: Nur service_role kann Audit-Logs aktualisieren (falls nötig)
CREATE POLICY "System can update security audit logs" 
ON public.security_audit_logs 
FOR UPDATE 
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Admins können alle Audit-Logs einsehen
CREATE POLICY "Admins can view all security audit logs" 
ON public.security_audit_logs 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Policy: Benutzer können ihre eigenen Audit-Logs einsehen (optional)
CREATE POLICY "Users can view their own security audit logs" 
ON public.security_audit_logs 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- 5. Gewähre spezifische Rechte für security_audit_logs
GRANT SELECT, INSERT, UPDATE ON public.security_audit_logs TO service_role;
GRANT SELECT ON public.security_audit_logs TO authenticated;

-- ===========================================
-- USER_SESSIONS TABLE SICHERUNG
-- ===========================================

-- 1. Entferne alle öffentlichen Rechte von user_sessions
REVOKE ALL ON public.user_sessions FROM anon;
REVOKE ALL ON public.user_sessions FROM authenticated;

-- 2. Aktiviere Row Level Security
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- 3. Lösche bestehende Policies für sauberen Zustand
DROP POLICY IF EXISTS "System can insert sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;

-- 4. Neue restriktive RLS Policies für user_sessions

-- Policy: service_role kann Sessions erstellen (für automatische Session-Tracking)
CREATE POLICY "System can insert user sessions" 
ON public.user_sessions 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- Policy: Authentifizierte Benutzer können ihre eigenen Sessions erstellen
CREATE POLICY "Users can insert their own sessions" 
ON public.user_sessions 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Benutzer können nur ihre eigenen Sessions einsehen
CREATE POLICY "Users can view their own sessions" 
ON public.user_sessions 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Admins können alle Sessions einsehen
CREATE POLICY "Admins can view all user sessions" 
ON public.user_sessions 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Policy: service_role kann Sessions aktualisieren (falls nötig)
CREATE POLICY "System can update user sessions" 
ON public.user_sessions 
FOR UPDATE 
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Benutzer können ihre eigenen Sessions aktualisieren (falls nötig)
CREATE POLICY "Users can update their own sessions" 
ON public.user_sessions 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Gewähre spezifische Rechte für user_sessions
GRANT SELECT, INSERT, UPDATE ON public.user_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.user_sessions TO authenticated;

-- ===========================================
-- ZUSÄTZLICHE SICHERHEITSMASSTNAHMEN
-- ===========================================

-- Stelle sicher, dass user_id Spalten nicht null sein können (falls noch nicht gesetzt)
-- Dies verhindert Sessions ohne Benutzer-Zuordnung
ALTER TABLE public.user_sessions ALTER COLUMN user_id SET NOT NULL;

-- Für security_audit_logs ist user_id optional (System-Events ohne User)
-- Daher lassen wir user_id nullable

