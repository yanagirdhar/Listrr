-- Server-side enforcement of the 500KB avatar limit.
--
-- Listrr stores avatars as base64 data URIs directly in
-- `profiles.avatar_url` (not as Supabase Storage objects — there is no
-- Storage bucket in this project). The existing client-side check in
-- src/app/(tabs)/profile.tsx is not sufficient on its own, since a modified
-- client (or a direct REST/PostgREST call using the anon key) could write a
-- larger image straight to the row. This CHECK constraint makes the limit
-- impossible to bypass, no matter how the row is written.
--
-- Size math: 500KB = 512000 raw bytes. Base64 inflates size by 4/3, so
-- 512000 bytes -> ceil(512000/3)*4 = 682668 base64 characters. We allow up
-- to 700000 characters to comfortably cover the "data:image/jpeg;base64,"
-- prefix (~24 chars) and base64 padding without weakening the effective
-- limit in practice.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_avatar_url_size_limit;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_avatar_url_size_limit
  CHECK (avatar_url IS NULL OR length(avatar_url) <= 700000);