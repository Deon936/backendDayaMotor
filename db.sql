-- Users table for authentication
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  id_number TEXT,
  role TEXT DEFAULT 'customer',
  avatar TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  otp_code TEXT,
  otp_expires_at TIMESTAMPTZ,
  reset_token TEXT,
  reset_expires_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  google_id TEXT UNIQUE,
  facebook_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_reset_token ON users(reset_token);
CREATE INDEX idx_users_otp_code ON users(otp_code);

-- Insert demo accounts
INSERT INTO users (id, name, email, password, phone, role, email_verified) VALUES
('demo-admin-1', 'Super Admin', 'admin@dayamotor.com', 'admin123', '08123456789', 'admin', true),
('demo-customer-1', 'Demo Customer', 'demo@customer.com', 'demo123', '081987654321', 'customer', true);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies for users table
CREATE POLICY "Users can view own profile" ON users
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow public registration" ON users
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow admin full access" ON users
FOR ALL USING (role = 'admin');