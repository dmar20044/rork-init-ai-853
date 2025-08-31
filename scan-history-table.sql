-- SQL script to create the scan_history table in Supabase
-- Copy and paste this into your Supabase SQL Editor

-- First, ensure we're working in the public schema
SET search_path TO public;

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

-- Create function to update updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for scan_history updated_at
CREATE TRIGGER update_scan_history_updated_at 
    BEFORE UPDATE ON public.scan_history 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for scan_history
ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for scan_history
CREATE POLICY "Users can view their own scan history" ON public.scan_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scan history" ON public.scan_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scan history" ON public.scan_history
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scan history" ON public.scan_history
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for scan_history
CREATE INDEX IF NOT EXISTS idx_scan_history_user_id ON public.scan_history(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_created_at ON public.scan_history(created_at DESC);

-- Grant permissions
GRANT ALL ON public.scan_history TO authenticated;
GRANT ALL ON public.scan_history TO anon;