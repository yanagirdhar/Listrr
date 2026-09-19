-- ==============================================================================
-- LISTRR — PROFILE SYNC + RLS CORRECTNESS/PERFORMANCE FIXES
--
-- Apply AFTER 20260919161832_listrr_security_and_storage_hardening.sql.
--
-- Fixes in this migration:
--   1. `on_auth_user_created` fired on EVERY UPDATE to auth.users. GoTrue
--      writes that row on every sign-in (last_sign_in_at) and on every user
--      metadata change, so the profile upsert ran constantly.
--   2. Because the upsert used COALESCE(EXCLUDED.avatar_url, existing),
--      REMOVING an avatar (which sets raw_user_meta_data.avatar_url to null)
--      left the old URL in public.profiles forever.
--   3. An exception inside the trigger aborted the whole auth.users insert,
--      which surfaces in the app as "Database error saving new user" and
--      makes sign-up look broken. Profile creation is now best-effort.
--   4. RLS policies called auth.uid() per row. Wrapping it in a scalar
--      subquery lets Postgres evaluate it once per statement (InitPlan).
--      This is a pure performance change — the predicate is identical.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------
-- 1. Split profile creation from profile e-mail sync
-- ------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    split_part(NEW.email, '@', 1),
    split_part(NEW.email, '@', 1),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Never block account creation on the profile mirror. The row can be
    -- backfilled; a failed signup cannot.
    RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Keeps the profile mirror in step with auth metadata changes only.
-- NOTE: avatar_url is assigned directly (no COALESCE) so that clearing the
-- avatar in auth metadata also clears it here.
CREATE OR REPLACE FUNCTION public.sync_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET
    email      = NEW.email,
    avatar_url = NEW.raw_user_meta_data->>'avatar_url',
    updated_at = timezone('utc'::text, now())
  WHERE id = NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'sync_user_profile failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
AFTER UPDATE OF email, raw_user_meta_data ON auth.users
FOR EACH ROW
WHEN (
  OLD.email IS DISTINCT FROM NEW.email
  OR OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data
)
EXECUTE FUNCTION public.sync_user_profile();

-- Backfill anyone who slipped through.
INSERT INTO public.profiles (id, username, full_name, email, avatar_url)
SELECT
  id,
  split_part(email, '@', 1),
  split_part(email, '@', 1),
  email,
  raw_user_meta_data->>'avatar_url'
FROM auth.users
ON CONFLICT (id) DO NOTHING;


-- ------------------------------------------------------------------
-- 2. RLS policies — identical predicates, InitPlan-friendly
-- ------------------------------------------------------------------

DROP POLICY IF EXISTS "user_select_profiles" ON public.profiles;
DROP POLICY IF EXISTS "user_update_profiles" ON public.profiles;
DROP POLICY IF EXISTS "user_insert_profiles" ON public.profiles;

CREATE POLICY "user_select_profiles" ON public.profiles
FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()));

CREATE POLICY "user_update_profiles" ON public.profiles
FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "user_insert_profiles" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "user_select_lists" ON public.lists;
DROP POLICY IF EXISTS "user_insert_lists" ON public.lists;
DROP POLICY IF EXISTS "user_update_lists" ON public.lists;
DROP POLICY IF EXISTS "user_delete_lists" ON public.lists;

CREATE POLICY "user_select_lists" ON public.lists
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "user_insert_lists" ON public.lists
FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "user_update_lists" ON public.lists
FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "user_delete_lists" ON public.lists
FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "user_select_list_items" ON public.list_items;
DROP POLICY IF EXISTS "user_insert_list_items" ON public.list_items;
DROP POLICY IF EXISTS "user_update_list_items" ON public.list_items;
DROP POLICY IF EXISTS "user_delete_list_items" ON public.list_items;

-- The BEFORE INSERT trigger set_list_items_user_id populates user_id from
-- the parent list, and Postgres evaluates RLS WITH CHECK *after* BEFORE ROW
-- triggers, so this policy still sees the trigger-assigned value. The client
-- therefore never sends user_id and cannot spoof ownership.
CREATE POLICY "user_select_list_items" ON public.list_items
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "user_insert_list_items" ON public.list_items
FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "user_update_list_items" ON public.list_items
FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "user_delete_list_items" ON public.list_items
FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));


-- ------------------------------------------------------------------
-- 3. Indexes matching the queries the app actually runs
-- ------------------------------------------------------------------

-- fetchListsFromDB filters on user_id and orders by position, created_at.
CREATE INDEX IF NOT EXISTS idx_lists_user_position
  ON public.lists (user_id, position, created_at DESC);

-- The embedded list_items join is per list, ordered by position.
CREATE INDEX IF NOT EXISTS idx_list_items_list_position
  ON public.list_items (list_id, position);

COMMIT;


-- ==============================================================================
-- VERIFICATION — run these as an authenticated user in the SQL editor to
-- confirm list creation works end to end before testing in the app.
-- ==============================================================================
-- SELECT auth.uid();                      -- must NOT be null
-- INSERT INTO public.lists (id, user_id, title, type, tag, position)
--   VALUES (gen_random_uuid(), auth.uid(), 'RLS smoke test', 'checklist', 'General', 0)
--   RETURNING id;
-- INSERT INTO public.list_items (list_id, text, position)
--   VALUES ('<id from above>', 'first item', 0) RETURNING id, user_id;
-- DELETE FROM public.lists WHERE title = 'RLS smoke test';
