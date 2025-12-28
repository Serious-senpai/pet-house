-- Create the profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'pet_owner', 'vet', 'staff')),
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -- Enable Row Level Security (RLS)
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- -- Create policies for profiles table
-- -- Allow users to read their own profile
-- CREATE POLICY "Users can view own profile" ON profiles
--   FOR SELECT USING (auth.uid() = id);

-- -- Allow users to update their own profile
-- CREATE POLICY "Users can update own profile" ON profiles
--   FOR UPDATE USING (auth.uid() = id);

-- -- Allow users to insert their own profile
-- CREATE POLICY "Users can insert own profile" ON profiles
--   FOR INSERT WITH CHECK (auth.uid() = id);

-- -- Allow admins to view all profiles
-- CREATE POLICY "Admins can view all profiles" ON profiles
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
--     )
--   );

-- -- Allow vets and staff to view pet owner profiles
-- CREATE POLICY "Staff and vets can view pet owner profiles" ON profiles
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('vet', 'staff')
--     ) AND role = 'pet_owner'
--   );

-- Create function to handle updated_at timestamp
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
