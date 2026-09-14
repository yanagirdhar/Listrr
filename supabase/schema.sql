-- ==============================================================================
-- LISTRR - CONSOLIDATED UNIFIED SCHEMA & HARDENING
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================

-- 1. Enable UUID and Cryptographic Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ==============================================================================
-- 2. CREATE 'profiles' TABLE & AUTO-SYNC TRIGGERS
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
    split_part(NEW.email, '@', 1),
    split_part(NEW.email, '@', 1),
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
  split_part(email, '@', 1),
  split_part(email, '@', 1),
  email,
  raw_user_meta_data->>'avatar_url'
FROM auth.users
ON CONFLICT (id) DO NOTHING;


-- ==============================================================================
-- 3. CREATE 'lists' TABLE
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
-- 4. CREATE 'list_items' TABLE (With denormalized user_id for Realtime & RLS optimization)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Backfill existing rows from their parent list if needed
UPDATE public.list_items li
SET user_id = l.user_id
FROM public.lists l
WHERE li.list_id = l.id
  AND li.user_id IS NULL;

-- Auto-populate user_id on every insert from the parent list
CREATE OR REPLACE FUNCTION public.set_list_item_user_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT user_id INTO NEW.user_id FROM public.lists WHERE id = NEW.list_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_list_items_user_id ON public.list_items;
CREATE TRIGGER set_list_items_user_id
BEFORE INSERT ON public.list_items
FOR EACH ROW
EXECUTE FUNCTION public.set_list_item_user_id();

-- Indexes for Fast User Queries & Realtime Filtering
CREATE INDEX IF NOT EXISTS idx_lists_user_id ON public.lists (user_id);
CREATE INDEX IF NOT EXISTS idx_lists_is_archived ON public.lists (is_archived);
CREATE INDEX IF NOT EXISTS idx_lists_is_pinned ON public.lists (is_pinned);
CREATE INDEX IF NOT EXISTS idx_lists_position ON public.lists (position);
CREATE INDEX IF NOT EXISTS idx_list_items_list_id ON public.list_items (list_id);
CREATE INDEX IF NOT EXISTS idx_list_items_user_id ON public.list_items (user_id);
CREATE INDEX IF NOT EXISTS idx_list_items_position ON public.list_items (position);

-- Auto-update 'updated_at' column triggers
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
    USING (id = auth.uid());

CREATE POLICY "user_update_profiles" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "user_insert_profiles" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

-- 5B. 'lists' Policies
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

-- 5C. 'list_items' Policies (Optimized to use direct user_id column checks)
DROP POLICY IF EXISTS "user_select_list_items" ON public.list_items;
DROP POLICY IF EXISTS "user_insert_list_items" ON public.list_items;
DROP POLICY IF EXISTS "user_update_list_items" ON public.list_items;
DROP POLICY IF EXISTS "user_delete_list_items" ON public.list_items;

CREATE POLICY "user_select_list_items" ON public.list_items
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "user_insert_list_items" ON public.list_items
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_update_list_items" ON public.list_items
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_delete_list_items" ON public.list_items
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());


-- ==============================================================================
-- 6. STORAGE BUCKET & POLICIES (Avatars: 200KB limit, restricted types)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 204800, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "avatar_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatar_user_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatar_user_update" ON storage.objects;
DROP POLICY IF EXISTS "avatar_user_delete" ON storage.objects;

CREATE POLICY "avatar_public_read" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'avatars');

CREATE POLICY "avatar_user_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "avatar_user_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
    WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatar_user_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);


-- ==============================================================================
-- 7. REALTIME PUBLICATIONS & REPLICA IDENTITY
-- ==============================================================================
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.lists REPLICA IDENTITY FULL;
ALTER TABLE public.list_items REPLICA IDENTITY FULL;

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