-- Migration script to add new fields to existing users table
-- Run this if you already have the users table created

-- Add new columns to users table if they don't exist
DO $$ 
BEGIN
    -- Add max_vacation_days column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'max_vacation_days'
    ) THEN
        ALTER TABLE users ADD COLUMN max_vacation_days INTEGER DEFAULT 28;
    END IF;

    -- Add remaining_days_from_previous_year column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'remaining_days_from_previous_year'
    ) THEN
        ALTER TABLE users ADD COLUMN remaining_days_from_previous_year INTEGER DEFAULT 0;
    END IF;

    -- Add last_year_reset column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'last_year_reset'
    ) THEN
        ALTER TABLE users ADD COLUMN last_year_reset INTEGER DEFAULT EXTRACT(YEAR FROM NOW());
    END IF;
END $$;

-- Update existing users to have default values
UPDATE users 
SET 
    max_vacation_days = COALESCE(max_vacation_days, 28),
    remaining_days_from_previous_year = COALESCE(remaining_days_from_previous_year, 0),
    last_year_reset = COALESCE(last_year_reset, EXTRACT(YEAR FROM NOW()))
WHERE 
    max_vacation_days IS NULL 
    OR remaining_days_from_previous_year IS NULL 
    OR last_year_reset IS NULL;

