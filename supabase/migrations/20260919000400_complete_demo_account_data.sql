-- Add a second archived list so the Play review account has six lists with
-- two archived examples across the supported list formats.
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
  SELECT
    '766905f4-2995-45f1-a0c8-06fa67bbca21',
    '🏠 Completed Home Projects',
    'bulleted',
    'Home',
    false,
    true,
    5
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.lists
    WHERE user_id = '766905f4-2995-45f1-a0c8-06fa67bbca21'
      AND title = '🏠 Completed Home Projects'
  )
  RETURNING id
)
INSERT INTO public.list_items (list_id, text, is_completed, position)
SELECT id, text, false, position
FROM new_list,
  (VALUES
    ('Paint the hallway', 0),
    ('Replace kitchen cabinet handles', 1),
    ('Install entryway hooks', 2)
  ) AS items(text, position);
