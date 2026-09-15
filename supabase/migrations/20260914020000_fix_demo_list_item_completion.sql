-- ==============================================================================
-- FIX DEMO ACCOUNT LIST ITEM COMPLETION STATES
-- ==============================================================================
-- Numbered and bulleted lists do not support check-off/completion.
-- This migration resets is_completed to false for those demo list items.
-- Checklist items are intentionally left unchanged.
-- ==============================================================================

UPDATE public.list_items
SET is_completed = false
WHERE list_id IN (
    SELECT id
    FROM public.lists
    WHERE user_id = 'e081b551-caae-495d-8b4e-92a38a8c888a'
      AND type IN ('numbered', 'bulleted')
);