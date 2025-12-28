-- Create the pets table
CREATE TABLE IF NOT EXISTS pets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date_of_birth DATE,
  breed TEXT,
  weight_kg NUMERIC,
  next_vaccination_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Keep updated_at current
CREATE TRIGGER pets_updated_at
  BEFORE UPDATE ON pets
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE INDEX IF NOT EXISTS pets_owner_id_idx ON pets(owner_id);
CREATE INDEX IF NOT EXISTS pets_name_idx ON pets(name);
