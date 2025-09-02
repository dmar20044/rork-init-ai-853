-- Supabase Database Schema for InIt AI App
-- Run these SQL commands in your Supabase SQL editor
-- IMPORTANT: Make sure to run this entire script to create all tables and policies

-- First, ensure we're working in the public schema
SET search_path TO public;

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    email TEXT DEFAULT '',
    body_goal TEXT,
    health_goal TEXT,
    diet_goal TEXT,
    life_goal TEXT,
    -- New: store lists like allergies (peanuts) and preferences (no seed oils)
    dietary_restrictions JSONB NOT NULL DEFAULT '[]'::jsonb,
    dietary_preferences JSONB NOT NULL DEFAULT '[]'::jsonb,
    motivation TEXT,
    referral_source TEXT,
    has_completed_quiz BOOLEAN DEFAULT FALSE,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    weekly_xp INTEGER DEFAULT 0,
    week_start_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create quiz_responses table
CREATE TABLE IF NOT EXISTS public.quiz_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    body_goal TEXT NOT NULL,
    health_goal TEXT NOT NULL,
    diet_goal TEXT NOT NULL,
    life_goal TEXT NOT NULL,
    -- New: capture responses at submission time
    dietary_restrictions JSONB NOT NULL DEFAULT '[]'::jsonb,
    dietary_preferences JSONB NOT NULL DEFAULT '[]'::jsonb,
    motivation TEXT NOT NULL,
    referral_source TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Backfill-safe: ensure columns exist if tables were created before
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS dietary_restrictions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dietary_preferences JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.quiz_responses
  ADD COLUMN IF NOT EXISTS dietary_restrictions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dietary_preferences JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for user_profiles updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON public.user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
CREATE POLICY "Users can insert their own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for quiz_responses
DROP POLICY IF EXISTS "Users can view their own quiz responses" ON public.quiz_responses;
CREATE POLICY "Users can view their own quiz responses" ON public.quiz_responses
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own quiz responses" ON public.quiz_responses;
CREATE POLICY "Users can insert their own quiz responses" ON public.quiz_responses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_user_id ON public.quiz_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_created_at ON public.quiz_responses(created_at);

-- JSONB GIN indexes for fast lookups on restrictions/preferences
CREATE INDEX IF NOT EXISTS idx_user_profiles_dietary_restrictions_gin ON public.user_profiles USING GIN (dietary_restrictions);
CREATE INDEX IF NOT EXISTS idx_user_profiles_dietary_preferences_gin ON public.user_profiles USING GIN (dietary_preferences);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_dietary_restrictions_gin ON public.quiz_responses USING GIN (dietary_restrictions);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_dietary_preferences_gin ON public.quiz_responses USING GIN (dietary_preferences);

-- Create scan_history table
CREATE TABLE IF NOT EXISTS public.scan_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    product_name TEXT NOT NULL,
    brand TEXT,
    score DECIMAL(5,1) NOT NULL,
    base_score DECIMAL(5,1),
    personalized_score DECIMAL(5,1),
    image_uri TEXT,
    nutrition_data JSONB NOT NULL,
    analysis_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger for scan_history updated_at
DROP TRIGGER IF EXISTS update_scan_history_updated_at ON public.scan_history;
CREATE TRIGGER update_scan_history_updated_at 
    BEFORE UPDATE ON public.scan_history 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for scan_history
ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for scan_history
DROP POLICY IF EXISTS "Users can view their own scan history" ON public.scan_history;
CREATE POLICY "Users can view their own scan history" ON public.scan_history
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own scan history" ON public.scan_history;
CREATE POLICY "Users can insert their own scan history" ON public.scan_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own scan history" ON public.scan_history;
CREATE POLICY "Users can update their own scan history" ON public.scan_history
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own scan history" ON public.scan_history;
CREATE POLICY "Users can delete their own scan history" ON public.scan_history
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for scan_history
CREATE INDEX IF NOT EXISTS idx_scan_history_user_id ON public.scan_history(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_created_at ON public.scan_history(created_at DESC);

-- If you need to migrate existing scan_history table from INTEGER to DECIMAL, run these commands separately:
-- ALTER TABLE public.scan_history ALTER COLUMN score TYPE DECIMAL(5,1);
-- ALTER TABLE public.scan_history ALTER COLUMN base_score TYPE DECIMAL(5,1);
-- ALTER TABLE public.scan_history ALTER COLUMN personalized_score TYPE DECIMAL(5,1);

-- Grant permissions
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.quiz_responses TO authenticated;
GRANT ALL ON public.scan_history TO authenticated;
GRANT ALL ON public.user_profiles TO anon;
GRANT ALL ON public.quiz_responses TO anon;
GRANT ALL ON public.scan_history TO anon;