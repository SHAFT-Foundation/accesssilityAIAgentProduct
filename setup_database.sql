-- Create waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    source TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Create policy to allow inserts (for the waitlist form)
CREATE POLICY "Allow waitlist inserts" ON waitlist
    FOR INSERT WITH CHECK (true);

-- Create policy to allow reading count (for showing total signups)
CREATE POLICY "Allow reading waitlist count" ON waitlist
    FOR SELECT USING (true);
