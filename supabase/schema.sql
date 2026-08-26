-- ==============================================================================
-- LISTRR - SUPABASE DATABASE SCHEMA, USER PROFILES & MULTI-TENANT SETUP
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================

-- 1. Enable UUID and Cryptographic Extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. CREATE 'profiles' TABLE (Full A-to-Z User Data & Profile Pictures)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for Fast Profile Lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);

-- Auto-sync new users into public.profiles upon registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Backfill any existing auth users into public.profiles
INSERT INTO public.profiles (id, username, full_name, email, avatar_url)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1)),
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  email,
  raw_user_meta_data->>'avatar_url'
FROM auth.users
ON CONFLICT (id) DO NOTHING;


-- ==============================================================================
-- 3. CREATE 'lists' TABLE (User Lists)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('checklist', 'numbered', 'bulleted')),
    tag TEXT DEFAULT 'General',
    is_pinned BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Upgrade existing 'lists' table with user_id column if not present
ALTER TABLE public.lists ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();


-- ==============================================================================
-- 4. CREATE 'list_items' TABLE (List Items)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for Fast User Queries & Realtime Filtering
CREATE INDEX IF NOT EXISTS idx_lists_user_id ON public.lists (user_id);
CREATE INDEX IF NOT EXISTS idx_lists_is_archived ON public.lists (is_archived);
CREATE INDEX IF NOT EXISTS idx_lists_is_pinned ON public.lists (is_pinned);
CREATE INDEX IF NOT EXISTS idx_lists_position ON public.lists (position);
CREATE INDEX IF NOT EXISTS idx_list_items_list_id ON public.list_items (list_id);
CREATE INDEX IF NOT EXISTS idx_list_items_position ON public.list_items (position);

-- Auto-update 'updated_at' column on update
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_lists_updated_at ON public.lists;
CREATE TRIGGER set_lists_updated_at
BEFORE UPDATE ON public.lists
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();


-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) - STRICT MULTI-TENANT ISOLATION
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_items ENABLE ROW LEVEL SECURITY;

-- 5A. 'profiles' Policies
DROP POLICY IF EXISTS "user_select_profiles" ON public.profiles;
DROP POLICY IF EXISTS "user_update_profiles" ON public.profiles;
DROP POLICY IF EXISTS "user_insert_profiles" ON public.profiles;

CREATE POLICY "user_select_profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "user_update_profiles" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "user_insert_profiles" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

-- 5B. 'lists' Policies (Restricted to auth.uid() == user_id)
DROP POLICY IF EXISTS "Allow select on lists" ON public.lists;
DROP POLICY IF EXISTS "Allow insert on lists" ON public.lists;
DROP POLICY IF EXISTS "Allow update on lists" ON public.lists;
DROP POLICY IF EXISTS "Allow delete on lists" ON public.lists;
DROP POLICY IF EXISTS "user_select_lists" ON public.lists;
DROP POLICY IF EXISTS "user_insert_lists" ON public.lists;
DROP POLICY IF EXISTS "user_update_lists" ON public.lists;
DROP POLICY IF EXISTS "user_delete_lists" ON public.lists;

CREATE POLICY "user_select_lists" ON public.lists
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "user_insert_lists" ON public.lists
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_update_lists" ON public.lists
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_delete_lists" ON public.lists
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- 5C. 'list_items' Policies (Restricted to items belonging to user's lists)
DROP POLICY IF EXISTS "Allow select on list_items" ON public.list_items;
DROP POLICY IF EXISTS "Allow insert on list_items" ON public.list_items;
DROP POLICY IF EXISTS "Allow update on list_items" ON public.list_items;
DROP POLICY IF EXISTS "Allow delete on list_items" ON public.list_items;
DROP POLICY IF EXISTS "user_select_list_items" ON public.list_items;
DROP POLICY IF EXISTS "user_insert_list_items" ON public.list_items;
DROP POLICY IF EXISTS "user_update_list_items" ON public.list_items;
DROP POLICY IF EXISTS "user_delete_list_items" ON public.list_items;

CREATE POLICY "user_select_list_items" ON public.list_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.lists
            WHERE lists.id = list_items.list_id
              AND lists.user_id = auth.uid()
        )
    );

CREATE POLICY "user_insert_list_items" ON public.list_items
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.lists
            WHERE lists.id = list_items.list_id
              AND lists.user_id = auth.uid()
        )
    );

CREATE POLICY "user_update_list_items" ON public.list_items
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.lists
            WHERE lists.id = list_items.list_id
              AND lists.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.lists
            WHERE lists.id = list_items.list_id
              AND lists.user_id = auth.uid()
        )
    );

CREATE POLICY "user_delete_list_items" ON public.list_items
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.lists
            WHERE lists.id = list_items.list_id
              AND lists.user_id = auth.uid()
        )
    );


-- ==============================================================================
-- 6. REALTIME PUBLICATIONS
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'lists'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lists;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'list_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.list_items;
  END IF;
END $$;

-- 7. Auto-confirm any existing users if needed for instant access
UPDATE auth.users SET email_confirmed_at = now() WHERE email_confirmed_at IS NULL;
