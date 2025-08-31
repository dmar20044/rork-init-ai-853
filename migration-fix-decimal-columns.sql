-- Migration script to fix scan_history table columns from INTEGER to DECIMAL
-- Run this in your Supabase SQL Editor to fix the data type issue

-- First, check if the table exists and what the current column types are
-- You can run this query first to see the current schema:
-- SELECT column_name, data_type, numeric_precision, numeric_scale 
-- FROM information_schema.columns 
-- WHERE table_name = 'scan_history' AND table_schema = 'public';

-- Fix the column types to support decimal values
ALTER TABLE public.scan_history 
ALTER COLUMN score TYPE DECIMAL(5,1);

ALTER TABLE public.scan_history 
ALTER COLUMN base_score TYPE DECIMAL(5,1);

ALTER TABLE public.scan_history 
ALTER COLUMN personalized_score TYPE DECIMAL(5,1);

-- Verify the changes
SELECT column_name, data_type, numeric_precision, numeric_scale 
FROM information_schema.columns 
WHERE table_name = 'scan_history' AND table_schema = 'public'
AND column_name IN ('score', 'base_score', 'personalized_score');