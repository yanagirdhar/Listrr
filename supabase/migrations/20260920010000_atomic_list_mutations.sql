-- Atomic list mutations and account-data purge helpers.
-- Apply after the existing security/RLS migrations.

BEGIN;

CREATE OR REPLACE FUNCTION public.create_list_with_items(
  p_list_id uuid,
  p_user_id uuid,
  p_title text,
  p_type text,
  p_tag text,
  p_items jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF length(trim(p_title)) = 0 OR length(p_title) > 120 OR length(p_tag) > 80 THEN
    RAISE EXCEPTION 'Invalid list fields';
  END IF;
  IF jsonb_array_length(COALESCE(p_items, '[]'::jsonb)) > 100 THEN
    RAISE EXCEPTION 'Too many list items';
  END IF;

  INSERT INTO public.lists (id, user_id, title, type, tag, is_pinned, is_archived, position)
  VALUES (p_list_id, p_user_id, p_title, p_type, p_tag, false, false, 0);

  INSERT INTO public.list_items (id, list_id, text, is_completed, position)
  SELECT
    COALESCE((item->>'id')::uuid, gen_random_uuid()),
    p_list_id,
    item->>'text',
    COALESCE((item->>'isCompleted')::boolean, false),
    COALESCE((item->>'position')::integer, item_number - 1)
  FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) WITH ORDINALITY AS rows(item, item_number);

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) AS rows(item)
    WHERE length(item->>'text') > 500
  ) THEN
    RAISE EXCEPTION 'List item is too long';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_list_with_items(
  p_list_id uuid,
  p_user_id uuid,
  p_title text,
  p_type text,
  p_tag text,
  p_items jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF length(trim(p_title)) = 0 OR length(p_title) > 120 OR length(p_tag) > 80 THEN
    RAISE EXCEPTION 'Invalid list fields';
  END IF;
  IF jsonb_array_length(COALESCE(p_items, '[]'::jsonb)) > 100 THEN
    RAISE EXCEPTION 'Too many list items';
  END IF;

  UPDATE public.lists
  SET title = p_title, type = p_type, tag = p_tag
  WHERE id = p_list_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'List not found';
  END IF;

  DELETE FROM public.list_items
  WHERE list_id = p_list_id AND user_id = p_user_id;

  INSERT INTO public.list_items (id, list_id, text, is_completed, position)
  SELECT
    COALESCE((item->>'id')::uuid, gen_random_uuid()),
    p_list_id,
    item->>'text',
    COALESCE((item->>'isCompleted')::boolean, false),
    COALESCE((item->>'position')::integer, item_number - 1)
  FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) WITH ORDINALITY AS rows(item, item_number);

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) AS rows(item)
    WHERE length(item->>'text') > 500
  ) THEN
    RAISE EXCEPTION 'List item is too long';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_user_data(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.list_items WHERE user_id = p_user_id;
  DELETE FROM public.lists WHERE user_id = p_user_id;
  DELETE FROM public.profiles WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_list_with_items(uuid, uuid, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_list_with_items(uuid, uuid, text, text, text, jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.update_list_with_items(uuid, uuid, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_list_with_items(uuid, uuid, text, text, text, jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.purge_user_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_user_data(uuid) TO service_role;

COMMIT;