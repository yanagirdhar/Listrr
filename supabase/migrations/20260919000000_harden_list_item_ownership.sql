-- Keep list_items ownership derived from its parent list whenever the parent
-- changes. This prevents a client from moving an item across user boundaries.
CREATE OR REPLACE FUNCTION public.set_list_item_user_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT user_id INTO NEW.user_id
  FROM public.lists
  WHERE id = NEW.list_id;

  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'List does not exist';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS set_list_items_user_id ON public.list_items;
CREATE TRIGGER set_list_items_user_id
BEFORE INSERT OR UPDATE OF list_id ON public.list_items
FOR EACH ROW
EXECUTE FUNCTION public.set_list_item_user_id();

-- SECURITY DEFINER functions must not inherit a caller-controlled search path.
ALTER FUNCTION public.handle_new_user() SET search_path = public;
