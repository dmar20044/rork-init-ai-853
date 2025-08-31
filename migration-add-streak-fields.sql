-- Migration to add streak tracking fields to user_profiles table
-- Run this SQL in your Supabase SQL editor

-- Add streak tracking fields to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_scan_date DATE,
ADD COLUMN IF NOT EXISTS scan_dates TEXT[] DEFAULT '{}';

-- Create index for better performance on streak queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_scan_date ON public.user_profiles(last_scan_date);
CREATE INDEX IF NOT EXISTS idx_user_profiles_current_streak ON public.user_profiles(current_streak DESC);

-- Update existing profiles to have default streak values
UPDATE public.user_profiles 
SET 
    current_streak = 0,
    longest_streak = 0,
    scan_dates = '{}'
WHERE 
    current_streak IS NULL 
    OR longest_streak IS NULL 
    OR scan_dates IS NULL;