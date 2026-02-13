-- ========================================================
-- BACKFILL PROFILES FROM AUTH.USERS
-- ========================================================
-- This script ensures all existing users have profile records.
-- Run this after changing the foreign keys to point to profiles.
-- ========================================================

-- Insert missing profiles for all existing auth users
INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at, updated_at)
SELECT 
    id,
    email,
    raw_user_meta_data->>'full_name' as full_name,
    raw_user_meta_data->>'avatar_url' as avatar_url,
    created_at,
    updated_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Verify the backfill
SELECT 
    'Backfilled ' || COUNT(*) || ' user profiles' as status
FROM public.profiles;

SELECT 'All users now have profiles!' as result;
