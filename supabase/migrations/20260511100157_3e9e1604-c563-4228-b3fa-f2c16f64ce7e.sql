
-- 1) Explicit anon deny on newsletter_clicks / newsletter_unsubscribes
DO $$ BEGIN
  EXECUTE 'ALTER TABLE public.newsletter_clicks ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE public.newsletter_unsubscribes ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN others THEN NULL; END $$;

DROP POLICY IF EXISTS "Deny anon access to newsletter_clicks" ON public.newsletter_clicks;
CREATE POLICY "Deny anon access to newsletter_clicks"
ON public.newsletter_clicks
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "Deny anon access to newsletter_unsubscribes" ON public.newsletter_unsubscribes;
CREATE POLICY "Deny anon access to newsletter_unsubscribes"
ON public.newsletter_unsubscribes
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 2) missing-items bucket: allow users to DELETE their own files
DROP POLICY IF EXISTS "Users can delete own missing-items files" ON storage.objects;
CREATE POLICY "Users can delete own missing-items files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'missing-items'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 3) chat_attachments bucket: add UPDATE policy for owner or admin
DROP POLICY IF EXISTS "Users can update own chat attachments" ON storage.objects;
CREATE POLICY "Users can update own chat attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chat_attachments'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
)
WITH CHECK (
  bucket_id = 'chat_attachments'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);
