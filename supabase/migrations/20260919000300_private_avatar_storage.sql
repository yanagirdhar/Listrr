-- Avatars are private user data. Public buckets bypass object read policies,
-- so the bucket itself must be private as well as owner-scoped by RLS.
UPDATE storage.buckets
SET public = false
WHERE id = 'avatars';

DROP POLICY IF EXISTS "avatar_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatar_auth_read" ON storage.objects;
DROP POLICY IF EXISTS "avatar_user_read" ON storage.objects;

CREATE POLICY "avatar_user_read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
