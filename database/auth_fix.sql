-- Add missing INSERT policy for users table
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Ensure Google OAuth works by enabling authentication
-- Run this in Supabase if Google OAuth isn't working
-- UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL;