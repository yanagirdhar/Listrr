
-- ==============================================================================
-- DEMO ACCOUNT SEED DATA
-- Existing Supabase Auth user:
-- email: demo@listrr.app
-- password: demo@123
-- User ID: e081b551-caae-495d-8b4e-92a38a8c888a
--
-- This migration DOES NOT create an Auth user.
-- The demo account is created manually in Supabase Authentication.
-- ==============================================================================

-- 1. Ensure the demo user's profile exists
INSERT INTO public.profiles (
    id,
    username,
    full_name,
    email,
    avatar_url
)
VALUES (
    'e081b551-caae-495d-8b4e-92a38a8c888a',
    'Demo User',
    'Play Store Demo',
    'demo@listrr.app',
    'https://ui-avatars.com/api/?name=Demo+User&background=208AEF&color=fff&size=256'
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url;


-- 2. Remove previously seeded demo lists so this migration is safe to re-run
DELETE FROM public.lists
WHERE user_id = 'e081b551-caae-495d-8b4e-92a38a8c888a';


-- 3. Pinned Grocery Checklist
WITH new_list AS (
    INSERT INTO public.lists (
        user_id,
        title,
        type,
        tag,
        is_pinned,
        is_archived,
        position
    )
    VALUES (
        'e081b551-caae-495d-8b4e-92a38a8c888a',
        '🛒 Weekly Groceries',
        'checklist',
        'Groceries',
        true,
        false,
        0
    )
    RETURNING id
)
INSERT INTO public.list_items (
    list_id,
    text,
    is_completed,
    position
)
SELECT
    id,
    text,
    is_completed,
    position
FROM new_list,
(VALUES
    ('Fresh vegetables', false, 0),
    ('Milk', true, 1),
    ('Eggs', true, 2),
    ('Bread', false, 3),
    ('Coffee', false, 4),
    ('Fresh fruit', false, 5)
) AS items(text, is_completed, position);


-- 4. Travel Checklist
WITH new_list AS (
    INSERT INTO public.lists (
        user_id,
        title,
        type,
        tag,
        is_pinned,
        is_archived,
        position
    )
    VALUES (
        'e081b551-caae-495d-8b4e-92a38a8c888a',
        '✈️ Weekend Trip Packing',
        'checklist',
        'Travel',
        true,
        false,
        1
    )
    RETURNING id
)
INSERT INTO public.list_items (
    list_id,
    text,
    is_completed,
    position
)
SELECT
    id,
    text,
    is_completed,
    position
FROM new_list,
(VALUES
    ('Passport', true, 0),
    ('Phone charger', true, 1),
    ('Power bank', false, 2),
    ('Headphones', false, 3),
    ('Travel documents', true, 4),
    ('Toiletries', false, 5)
) AS items(text, is_completed, position);


-- 5. Numbered Reading List
WITH new_list AS (
    INSERT INTO public.lists (
        user_id,
        title,
        type,
        tag,
        is_pinned,
        is_archived,
        position
    )
    VALUES (
        'e081b551-caae-495d-8b4e-92a38a8c888a',
        '📚 Books to Read',
        'numbered',
        'Books',
        false,
        false,
        2
    )
    RETURNING id
)
INSERT INTO public.list_items (
    list_id,
    text,
    is_completed,
    position
)
SELECT
    id,
    text,
    is_completed,
    position
FROM new_list,
(VALUES
    ('Atomic Habits', true, 0),
    ('The Pragmatic Programmer', false, 1),
    ('Designing Data-Intensive Applications', false, 2),
    ('Deep Work', true, 3),
    ('The Psychology of Money', false, 4)
) AS items(text, is_completed, position);


-- 6. Bulleted Project Ideas
WITH new_list AS (
    INSERT INTO public.lists (
        user_id,
        title,
        type,
        tag,
        is_pinned,
        is_archived,
        position
    )
    VALUES (
        'e081b551-caae-495d-8b4e-92a38a8c888a',
        '💡 Project Ideas',
        'bulleted',
        'Projects',
        false,
        false,
        3
    )
    RETURNING id
)
INSERT INTO public.list_items (
    list_id,
    text,
    is_completed,
    position
)
SELECT
    id,
    text,
    is_completed,
    position
FROM new_list,
(VALUES
    ('Build a personal finance tracker', false, 0),
    ('Create a habit tracking app', false, 1),
    ('Experiment with a recommendation system', true, 2),
    ('Build a weather dashboard', false, 3),
    ('Create a simple portfolio website', true, 4)
) AS items(text, is_completed, position);


-- 7. Archived Movie Watchlist
WITH new_list AS (
    INSERT INTO public.lists (
        user_id,
        title,
        type,
        tag,
        is_pinned,
        is_archived,
        position
    )
    VALUES (
        'e081b551-caae-495d-8b4e-92a38a8c888a',
        '🎬 Movie Watchlist',
        'checklist',
        'Entertainment',
        false,
        true,
        4
    )
    RETURNING id
)
INSERT INTO public.list_items (
    list_id,
    text,
    is_completed,
    position
)
SELECT
    id,
    text,
    is_completed,
    position
FROM new_list,
(VALUES
    ('Interstellar', true, 0),
    ('Oppenheimer', true, 1),
    ('Dune: Part Two', false, 2),
    ('Spider-Man: Across the Spider-Verse', true, 3),
    ('The Batman', false, 4)
) AS items(text, is_completed, position);

