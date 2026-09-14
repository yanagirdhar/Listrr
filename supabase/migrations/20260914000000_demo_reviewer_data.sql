-- ==============================================================================
-- REVIEWER DEMO ACCOUNT & SEED DATA MIGRATION
-- ==============================================================================

-- 1. Create a dedicated reviewer user in Supabase Auth
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '00000000-0000-0000-0000-000000000000',
    'reviewer@listrr.app',
    extensions.crypt('ReviewerPassword123!', extensions.gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"username": "PlayStore Reviewer", "avatar_url": ""}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO NOTHING;

-- 2. Ensure a corresponding profile exists in public.profiles
INSERT INTO public.profiles (id, username, full_name, email, avatar_url)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'PlayStore Reviewer',
    'PlayStore Reviewer',
    'reviewer@listrr.app',
    ''
)
ON CONFLICT (id) DO NOTHING;

-- 3. Seed 5 Rich Lists (Idempotent: clear existing demo lists first)
DELETE FROM public.lists WHERE user_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- List 1: Pinned Grocery Checklist
WITH l1 AS (
    INSERT INTO public.lists (user_id, title, type, tag, is_pinned, is_archived, position)
    VALUES (
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        '🛒 Weekly Groceries & Produce',
        'checklist',
        'Groceries',
        true,
        false,
        0
    ) RETURNING id
)
INSERT INTO public.list_items (list_id, text, is_completed, position)
SELECT id, text, is_completed, position FROM l1, (VALUES
    ('Organic Hass Avocados (x4)', false, 0),
    ('Almond Milk (Unsweetened)', true, 1),
    ('Greek Yogurt & Honey', false, 2),
    ('Free-range Eggs', true, 3),
    ('Sourdough Bread', false, 4),
    ('Fresh Spinach & Kale', false, 5)
) AS items(text, is_completed, position);

-- List 2: Travel Packing Guide
WITH l2 AS (
    INSERT INTO public.lists (user_id, title, type, tag, is_pinned, is_archived, position)
    VALUES (
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        '✈️ Weekend Trip to Kyoto',
        'checklist',
        'Travel',
        true,
        false,
        1
    ) RETURNING id
)
INSERT INTO public.list_items (list_id, text, is_completed, position)
SELECT id, text, is_completed, position FROM l2, (VALUES
    ('Passport & JR Rail Pass voucher', true, 0),
    ('Universal Power Adapter (Type C/O)', true, 1),
    ('Comfortable walking shoes', false, 2),
    ('Portable Power Bank (20,000mAh)', false, 3),
    ('Prescription medications', false, 4)
) AS items(text, is_completed, position);

-- List 3: Numbered Reading Queue
WITH l3 AS (
    INSERT INTO public.lists (user_id, title, type, tag, is_pinned, is_archived, position)
    VALUES (
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        '📚 2026 Reading Queue',
        'numbered',
        'Books',
        false,
        false,
        2
    ) RETURNING id
)
INSERT INTO public.list_items (list_id, text, is_completed, position)
SELECT id, text, is_completed, position FROM l3, (VALUES
    ('Designing Data-Intensive Applications', true, 0),
    ('The Pragmatic Programmer (20th Anniversary Edition)', false, 1),
    ('Klara and the Sun - Kazuo Ishiguro', false, 2),
    ('Atomic Habits - James Clear', true, 3)
) AS items(text, is_completed, position);

-- List 4: Bulleted Startup Ideas
WITH l4 AS (
    INSERT INTO public.lists (user_id, title, type, tag, is_pinned, is_archived, position)
    VALUES (
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        '💡 Micro-SaaS Feature Ideas',
        'bulleted',
        'Work',
        false,
        false,
        3
    ) RETURNING id
)
INSERT INTO public.list_items (list_id, text, is_completed, position)
SELECT id, text, is_completed, position FROM l4, (VALUES
    ('Add native CSV export options across all views', false, 0),
    ('Implement biometric lock (FaceID/Fingerprint) on app resume', false, 1),
    ('Explore offline-first sync architecture using SQLite replication', false, 2),
    ('Design dark mode OLED pure black theme variant', true, 3)
) AS items(text, is_completed, position);

-- List 5: Movie Watchlist
WITH l5 AS (
    INSERT INTO public.lists (user_id, title, type, tag, is_pinned, is_archived, position)
    VALUES (
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        '🍿 Weekend Movie Watchlist',
        'checklist',
        'Entertainment',
        false,
        false,
        4
    ) RETURNING id
)
INSERT INTO public.list_items (list_id, text, is_completed, position)
SELECT id, text, is_completed, position FROM l5, (VALUES
    ('Interstellar (Rewatch in IMAX)', true, 0),
    ('Spider-Man: Across the Spider-Verse', true, 1),
    ('Dune: Part Two', false, 2),
    ('Oppenheimer', false, 3)
) AS items(text, is_completed, position);