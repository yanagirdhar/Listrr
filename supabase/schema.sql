-- ==============================================================================
-- LISTRR - SUPABASE DATABASE SCHEMA & REALTIME SETUP
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================

-- 1. Enable UUID and Cryptographic Extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create 'lists' Table
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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lists' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.lists ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
  END IF;
END $$;


-- 3. Create 'list_items' Table (Cascades deletion when a list is deleted)
CREATE TABLE IF NOT EXISTS public.list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Indexes for High-Performance Queries & Realtime Filtering
CREATE INDEX IF NOT EXISTS idx_lists_user_id ON public.lists (user_id);
CREATE INDEX IF NOT EXISTS idx_lists_is_archived ON public.lists (is_archived);
CREATE INDEX IF NOT EXISTS idx_lists_is_pinned ON public.lists (is_pinned);
CREATE INDEX IF NOT EXISTS idx_lists_position ON public.lists (position);
CREATE INDEX IF NOT EXISTS idx_list_items_list_id ON public.list_items (list_id);
CREATE INDEX IF NOT EXISTS idx_list_items_position ON public.list_items (position);

-- 5. Auto-update 'updated_at' column on update
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

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_items ENABLE ROW LEVEL SECURITY;

-- 7. Row Level Security (RLS) Policies
-- Drop previous policies to ensure clean idempotent migrations
DROP POLICY IF EXISTS "Allow select on lists" ON public.lists;
DROP POLICY IF EXISTS "Allow insert on lists" ON public.lists;
DROP POLICY IF EXISTS "Allow update on lists" ON public.lists;
DROP POLICY IF EXISTS "Allow delete on lists" ON public.lists;
DROP POLICY IF EXISTS "Allow select on list_items" ON public.list_items;
DROP POLICY IF EXISTS "Allow insert on list_items" ON public.list_items;
DROP POLICY IF EXISTS "Allow update on list_items" ON public.list_items;
DROP POLICY IF EXISTS "Allow delete on list_items" ON public.list_items;
DROP POLICY IF EXISTS "Allow anon and auth select on lists" ON public.lists;
DROP POLICY IF EXISTS "Allow anon and auth insert on lists" ON public.lists;
DROP POLICY IF EXISTS "Allow anon and auth update on lists" ON public.lists;
DROP POLICY IF EXISTS "Allow anon and auth delete on lists" ON public.lists;
DROP POLICY IF EXISTS "Allow anon and auth select on list_items" ON public.list_items;
DROP POLICY IF EXISTS "Allow anon and auth insert on list_items" ON public.list_items;
DROP POLICY IF EXISTS "Allow anon and auth update on list_items" ON public.list_items;
DROP POLICY IF EXISTS "Allow anon and auth delete on list_items" ON public.list_items;
DROP POLICY IF EXISTS "anon_select_lists" ON public.lists;
DROP POLICY IF EXISTS "anon_insert_lists" ON public.lists;
DROP POLICY IF EXISTS "anon_update_lists" ON public.lists;
DROP POLICY IF EXISTS "anon_delete_lists" ON public.lists;
DROP POLICY IF EXISTS "anon_select_list_items" ON public.list_items;
DROP POLICY IF EXISTS "anon_insert_list_items" ON public.list_items;
DROP POLICY IF EXISTS "anon_update_list_items" ON public.list_items;
DROP POLICY IF EXISTS "anon_delete_list_items" ON public.list_items;
DROP POLICY IF EXISTS "auth_select_lists" ON public.lists;
DROP POLICY IF EXISTS "auth_insert_lists" ON public.lists;
DROP POLICY IF EXISTS "auth_update_lists" ON public.lists;
DROP POLICY IF EXISTS "auth_delete_lists" ON public.lists;
DROP POLICY IF EXISTS "auth_select_list_items" ON public.list_items;
DROP POLICY IF EXISTS "auth_insert_list_items" ON public.list_items;
DROP POLICY IF EXISTS "auth_update_list_items" ON public.list_items;
DROP POLICY IF EXISTS "auth_delete_list_items" ON public.list_items;

-- 7A. Anonymous / Guest Policies (user_id IS NULL)
CREATE POLICY "anon_select_lists" ON public.lists
    FOR SELECT TO anon
    USING (user_id IS NULL);

CREATE POLICY "anon_insert_lists" ON public.lists
    FOR INSERT TO anon
    WITH CHECK (user_id IS NULL);

CREATE POLICY "anon_update_lists" ON public.lists
    FOR UPDATE TO anon
    USING (user_id IS NULL)
    WITH CHECK (user_id IS NULL);

CREATE POLICY "anon_delete_lists" ON public.lists
    FOR DELETE TO anon
    USING (user_id IS NULL);

CREATE POLICY "anon_select_list_items" ON public.list_items
    FOR SELECT TO anon
    USING (
        EXISTS (
            SELECT 1 FROM public.lists
            WHERE lists.id = list_items.list_id
              AND lists.user_id IS NULL
        )
    );

CREATE POLICY "anon_insert_list_items" ON public.list_items
    FOR INSERT TO anon
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.lists
            WHERE lists.id = list_items.list_id
              AND lists.user_id IS NULL
        )
    );

CREATE POLICY "anon_update_list_items" ON public.list_items
    FOR UPDATE TO anon
    USING (
        EXISTS (
            SELECT 1 FROM public.lists
            WHERE lists.id = list_items.list_id
              AND lists.user_id IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.lists
            WHERE lists.id = list_items.list_id
              AND lists.user_id IS NULL
        )
    );

CREATE POLICY "anon_delete_list_items" ON public.list_items
    FOR DELETE TO anon
    USING (
        EXISTS (
            SELECT 1 FROM public.lists
            WHERE lists.id = list_items.list_id
              AND lists.user_id IS NULL
        )
    );

-- 7B. Authenticated User Policies (Scoped to auth.uid())
CREATE POLICY "auth_select_lists" ON public.lists
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "auth_insert_lists" ON public.lists
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "auth_update_lists" ON public.lists
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "auth_delete_lists" ON public.lists
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "auth_select_list_items" ON public.list_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.lists
            WHERE lists.id = list_items.list_id
              AND (lists.user_id = auth.uid() OR lists.user_id IS NULL)
        )
    );

CREATE POLICY "auth_insert_list_items" ON public.list_items
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.lists
            WHERE lists.id = list_items.list_id
              AND lists.user_id = auth.uid()
        )
    );

CREATE POLICY "auth_update_list_items" ON public.list_items
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

CREATE POLICY "auth_delete_list_items" ON public.list_items
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.lists
            WHERE lists.id = list_items.list_id
              AND lists.user_id = auth.uid()
        )
    );


-- 8. Enable Realtime Publications for Postgres Changes
DO $$
BEGIN
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

-- 9. Insert Initial Starter Seed Data (Real Database Rows)
DO $$
DECLARE
    grocery_list_id UUID := gen_random_uuid();
    launch_list_id UUID := gen_random_uuid();
    features_list_id UUID := gen_random_uuid();
BEGIN
    -- Only insert seed data if table is currently empty
    IF NOT EXISTS (SELECT 1 FROM public.lists) THEN
        -- List 1: Weekend Grocery Run
        INSERT INTO public.lists (id, title, type, tag, is_pinned, is_archived, position)
        VALUES (grocery_list_id, 'Weekend Grocery Run', 'checklist', 'Shopping', true, false, 0);

        INSERT INTO public.list_items (list_id, text, is_completed, position) VALUES
        (grocery_list_id, 'Organic Almond Milk', true, 0),
        (grocery_list_id, 'Fresh Avocados (x4)', false, 1),
        (grocery_list_id, 'Artisan Sourdough Loaf', false, 2),
        (grocery_list_id, 'Greek Yogurt (Plain)', true, 3),
        (grocery_list_id, 'Dark Roast Coffee Beans', false, 4);

        -- List 2: Product Launch Sequence
        INSERT INTO public.lists (id, title, type, tag, is_pinned, is_archived, position)
        VALUES (launch_list_id, 'Production Launch Sequence', 'numbered', 'Work', true, false, 1);

        INSERT INTO public.list_items (list_id, text, is_completed, position) VALUES
        (launch_list_id, 'Run production TypeScript verification & bundle check', true, 0),
        (launch_list_id, 'Deploy Supabase migrations & test realtime sync', true, 1),
        (launch_list_id, 'Configure EAS build profiles in eas.json', false, 2),
        (launch_list_id, 'Submit iOS build to App Store Connect & TestFlight', false, 3),
        (launch_list_id, 'Publish Android AAB to Google Play Console', false, 4);

        -- List 3: Listrr Core Features
        INSERT INTO public.lists (id, title, type, tag, is_pinned, is_archived, position)
        VALUES (features_list_id, 'Listrr Core Features', 'bulleted', 'Product', false, false, 2);

        INSERT INTO public.list_items (list_id, text, is_completed, position) VALUES
        (features_list_id, 'Instant Realtime Supabase synchronization', false, 0),
        (features_list_id, 'Drag and drop reordering with smooth animations', false, 1),
        (features_list_id, 'Offline-resilient optimistic state updates', false, 2),
        (features_list_id, 'Full dark mode & light mode dynamic themes', false, 3);
    END IF;
END $$;

