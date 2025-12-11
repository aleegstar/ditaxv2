
-- 1. Entferne alle öffentlichen Rechte von der rate_limits Tabelle
REVOKE ALL ON public.rate_limits FROM anon;
REVOKE ALL ON public.rate_limits FROM authenticated;

-- 2. Aktiviere Row Level Security falls noch nicht aktiviert
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- 3. Lösche alle bestehenden Policies um sauberen Zustand zu gewährleisten
DROP POLICY IF EXISTS "System can manage rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Users can view own rate limits" ON public.rate_limits;

-- 4. Erstelle neue restriktive RLS Policies

-- Policy: Authentifizierte Benutzer können nur ihre eigenen Rate Limit Einträge einsehen
CREATE POLICY "Users can view their own rate limits" 
ON public.rate_limits 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Nur das System (service_role) kann Rate Limit Einträge erstellen
CREATE POLICY "System can insert rate limits" 
ON public.rate_limits 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- Policy: Nur das System (service_role) kann Rate Limit Einträge aktualisieren
CREATE POLICY "System can update rate limits" 
ON public.rate_limits 
FOR UPDATE 
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Admins können alle Rate Limit Einträge einsehen
CREATE POLICY "Admins can view all rate limits" 
ON public.rate_limits 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Policy: Admins können Rate Limit Einträge löschen (für Wartungsarbeiten)
CREATE POLICY "Admins can delete rate limits" 
ON public.rate_limits 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- 5. Gewähre nur spezifische Rechte an service_role für Rate Limiting Funktionalität
GRANT SELECT, INSERT, UPDATE ON public.rate_limits TO service_role;

-- 6. Gewähre authentifizierten Benutzern nur SELECT-Rechte (wird durch RLS weiter eingeschränkt)
GRANT SELECT ON public.rate_limits TO authenticated;
