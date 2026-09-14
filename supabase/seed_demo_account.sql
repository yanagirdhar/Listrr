-- Seeds sample content for the Play Store reviewer demo account.
--
-- Run this AFTER creating the demo auth user (sign up in the app with the
-- demo credentials, or Authentication -> Users -> Add User in the Supabase
-- dashboard). Replace 'reviewer@listrr.app' below with whatever
-- email/identifier you actually used, then run this in the Supabase SQL
-- editor. Safe to re-run — it clears and re-seeds the demo account's lists.

DO $$
DECLARE
  demo_user_id UUID;
  list1 UUID := gen_random_uuid();
  list2 UUID := gen_random_uuid();
  list3 UUID := gen_random_uuid();
  list4 UUID := gen_random_uuid();
  list5 UUID := gen_random_uuid();
  list6 UUID := gen_random_uuid();
BEGIN
  SELECT id INTO demo_user_id
  FROM auth.users
  WHERE email = 'reviewer@listrr.app'
  LIMIT 1;

  IF demo_user_id IS NULL THEN
    RAISE EXCEPTION 'No auth.users row found for reviewer@listrr.app — create the demo account first, then re-run this script.';
  END IF;

  DELETE FROM public.lists WHERE user_id = demo_user_id;

  UPDATE public.profiles
  SET username = 'Listrr Reviewer',
      full_name = 'Listrr Reviewer'
  WHERE id = demo_user_id;

  -- 1. Checklist, pinned
  INSERT INTO public.lists (id, user_id, title, type, tag, is_pinned, is_archived, position)
  VALUES (list1, demo_user_id, 'Weekly Groceries', 'checklist', 'Home', true, false, 0);
  INSERT INTO public.list_items (list_id, text, is_completed, position) VALUES
    (list1, 'Milk', false, 0),
    (list1, 'Eggs', true, 1),
    (list1, 'Bread', false, 2),
    (list1, 'Coffee', false, 3);

  -- 2. Checklist
  INSERT INTO public.lists (id, user_id, title, type, tag, is_pinned, is_archived, position)
  VALUES (list2, demo_user_id, 'Move-in Tasks', 'checklist', 'Home', false, false, 1);
  INSERT INTO public.list_items (list_id, text, is_completed, position) VALUES
    (list2, 'Set up Wi-Fi', true, 0),
    (list2, 'Unpack kitchen boxes', false, 1),
    (list2, 'Hang curtains', false, 2);

  -- 3. Numbered, pinned
  INSERT INTO public.lists (id, user_id, title, type, tag, is_pinned, is_archived, position)
  VALUES (list3, demo_user_id, 'Book Club Reading Order', 'numbered', 'Personal', true, false, 2);
  INSERT INTO public.list_items (list_id, text, is_completed, position) VALUES
    (list3, 'Project Hail Mary', false, 0),
    (list3, 'The Martian', false, 1),
    (list3, 'Dune', false, 2);

  -- 4. Bulleted
  INSERT INTO public.lists (id, user_id, title, type, tag, is_pinned, is_archived, position)
  VALUES (list4, demo_user_id, 'Trip Packing Ideas', 'bulleted', 'Travel', false, false, 3);
  INSERT INTO public.list_items (list_id, text, is_completed, position) VALUES
    (list4, 'Passport', false, 0),
    (list4, 'Phone charger', false, 1),
    (list4, 'Sunscreen', false, 2);

  -- 5. Bulleted
  INSERT INTO public.lists (id, user_id, title, type, tag, is_pinned, is_archived, position)
  VALUES (list5, demo_user_id, 'Team Gift Ideas', 'bulleted', 'Work', false, false, 4);
  INSERT INTO public.list_items (list_id, text, is_completed, position) VALUES
    (list5, 'Coffee gift cards', false, 0),
    (list5, 'Desk plants', false, 1);

  -- 6. Numbered, archived
  INSERT INTO public.lists (id, user_id, title, type, tag, is_pinned, is_archived, position)
  VALUES (list6, demo_user_id, 'Old Project Steps', 'numbered', 'Work', false, true, 5);
  INSERT INTO public.list_items (list_id, text, is_completed, position) VALUES
    (list6, 'Kickoff meeting', true, 0),
    (list6, 'Draft proposal', true, 1),
    (list6, 'Final review', true, 2);

  -- 2 more archived lists (total 3 archived, satisfying the 2-3 requirement)
  INSERT INTO public.lists (user_id, title, type, tag, is_pinned, is_archived, position)
  VALUES (demo_user_id, 'Last Summer BBQ', 'checklist', 'Home', false, true, 6);

  INSERT INTO public.lists (user_id, title, type, tag, is_pinned, is_archived, position)
  VALUES (demo_user_id, 'Old Apartment Search', 'bulleted', 'Personal', false, true, 7);

END $$;