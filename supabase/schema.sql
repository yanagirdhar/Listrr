-- ==============================================================================
-- LISTRR - SUPABASE DATABASE SCHEMA & REALTIME SETUP
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================

-- 1. Enable UUID Extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create 'lists' Table
CREATE TABLE IF NOT EXISTS public.lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('checklist', 'numbered', 'bulleted')),
    tag TEXT DEFAULT 'General',
    is_pinned BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

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

-- 7. RLS Policies (Allow read/write operations for public/anonymous and authenticated users)
-- Lists policies
DROP POLICY IF EXISTS "Allow select on lists" ON public.lists;
CREATE POLICY "Allow select on lists" ON public.lists FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert on lists" ON public.lists;
CREATE POLICY "Allow insert on lists" ON public.lists FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update on lists" ON public.lists;
CREATE POLICY "Allow update on lists" ON public.lists FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete on lists" ON public.lists;
CREATE POLICY "Allow delete on lists" ON public.lists FOR DELETE USING (true);

-- List items policies
DROP POLICY IF EXISTS "Allow select on list_items" ON public.list_items;
CREATE POLICY "Allow select on list_items" ON public.list_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert on list_items" ON public.list_items;
CREATE POLICY "Allow insert on list_items" ON public.list_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update on list_items" ON public.list_items;
CREATE POLICY "Allow update on list_items" ON public.list_items FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete on list_items" ON public.list_items;
CREATE POLICY "Allow delete on list_items" ON public.list_items FOR DELETE USING (true);

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
