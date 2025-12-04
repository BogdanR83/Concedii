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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_medical_leave_user_id ON medical_leave(user_id);
CREATE INDEX IF NOT EXISTS idx_medical_leave_dates ON medical_leave(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_medical_leave_year ON medical_leave(year);
CREATE INDEX IF NOT EXISTS idx_medical_leave_user_year ON medical_leave(user_id, year);

-- Enable Row Level Security (RLS)
ALTER TABLE medical_leave ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow all operations for authenticated users
-- In production, you should create more restrictive policies
DROP POLICY IF EXISTS "Allow all for authenticated users" ON medical_leave;

CREATE POLICY "Allow all for authenticated users" ON medical_leave
    FOR ALL USING (true);

