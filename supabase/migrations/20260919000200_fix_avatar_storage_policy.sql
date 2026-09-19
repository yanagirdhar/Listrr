-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "avatar_public_read" ON storage.objects;

-- Replace with an authenticated-only read policy (or tie it to profile ownership)
CREATE POLICY "avatar_auth_read" ON storage.objects 
FOR SELECT TO authenticated 
USING (bucket_id = 'avatars');