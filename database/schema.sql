-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('EDUCATOR', 'AUXILIARY', 'ADMIN')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns that might not exist (for existing tables)
DO $$ 
BEGIN
    -- Add username column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'username'
    ) THEN
        ALTER TABLE users ADD COLUMN username TEXT UNIQUE;
    END IF;

    -- Add password_hash column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_hash'
    ) THEN
        ALTER TABLE users ADD COLUMN password_hash TEXT;
    END IF;

    -- Add must_change_password column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'must_change_password'
    ) THEN
        ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT true;
    END IF;

    -- Add max_vacation_days column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'max_vacation_days'
    ) THEN
        ALTER TABLE users ADD COLUMN max_vacation_days INTEGER DEFAULT 28;
    END IF;

    -- Add remaining_days_from_previous_year column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'remaining_days_from_previous_year'
    ) THEN
        ALTER TABLE users ADD COLUMN remaining_days_from_previous_year INTEGER DEFAULT 0;
    END IF;

    -- Add last_year_reset column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'last_year_reset'
    ) THEN
        ALTER TABLE users ADD COLUMN last_year_reset INTEGER DEFAULT EXTRACT(YEAR FROM NOW());
    END IF;

    -- Add active column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'active'
    ) THEN
        ALTER TABLE users ADD COLUMN active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Create index for username lookup (only if username column exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'username'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    END IF;
END $$;

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at BIGINT NOT NULL,
    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Note: max_vacation_days is now per user, not global
-- Removed settings table for max_vacation_days

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Create medical_leave table for tracking medical leave periods
CREATE TABLE IF NOT EXISTS medical_leave (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    disease_code TEXT NOT NULL,
    working_days INTEGER NOT NULL,
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_date_range CHECK (end_date >= start_date),
    CONSTRAINT valid_year CHECK (year >= 2020 AND year <= 2100)
);

-- Create indexes for medical_leave
CREATE INDEX IF NOT EXISTS idx_medical_leave_user_id ON medical_leave(user_id);
CREATE INDEX IF NOT EXISTS idx_medical_leave_dates ON medical_leave(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_medical_leave_year ON medical_leave(year);
CREATE INDEX IF NOT EXISTS idx_medical_leave_user_year ON medical_leave(user_id, year);

-- Create closed_periods table for tracking when kindergarten is closed
CREATE TABLE IF NOT EXISTS closed_periods (
    id TEXT PRIMARY KEY,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    description TEXT,
    created_at BIGINT NOT NULL,
    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Create indexes for closed_periods
CREATE INDEX IF NOT EXISTS idx_closed_periods_dates ON closed_periods(start_date, end_date);

-- Enable Row Level Security (RLS)
ALTER TABLE medical_leave ENABLE ROW LEVEL SECURITY;
ALTER TABLE closed_periods ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow all operations for authenticated users
-- In production, you should create more restrictive policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all for authenticated users" ON users;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON bookings;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON medical_leave;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON closed_periods;

CREATE POLICY "Allow all for authenticated users" ON users
    FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON bookings
    FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON medical_leave
    FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON closed_periods
    FOR ALL USING (true);

