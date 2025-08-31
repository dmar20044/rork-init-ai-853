-- Migration to add profile picture field to user_profiles table
-- Run this SQL in your Supabase SQL editor

-- Add profile picture field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS profile_picture_uri TEXT;

-- Create index for better performance on profile picture queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_profile_picture ON public.user_profiles(profile_picture_uri);

-- No need to update existing profiles as NULL is acceptable for profile pictures