-- Create the appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,

  -- Vet can be assigned later (pending stage)
  vet_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Service type for appointment
  service_type TEXT NOT NULL CHECK (service_type IN ('checkup', 'vaccination', 'grooming', 'boarding')),

  -- Appointment time
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,

  -- Workflow status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled', 'completed')),

  -- Notes
  owner_note TEXT,
  vet_note TEXT,
  rejection_reason TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Basic validation: end_time must be after start_time
  CONSTRAINT appointments_time_valid CHECK (end_time IS NULL OR end_time > start_time)
);

-- Keep updated_at current
CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS appointments_owner_id_idx ON appointments(owner_id);
CREATE INDEX IF NOT EXISTS appointments_pet_id_idx ON appointments(pet_id);
CREATE INDEX IF NOT EXISTS appointments_vet_id_idx ON appointments(vet_id);

CREATE INDEX IF NOT EXISTS appointments_status_idx ON appointments(status);
CREATE INDEX IF NOT EXISTS appointments_service_type_idx ON appointments(service_type);

-- Useful for time-based queries (upcoming/past, calendar views)
CREATE INDEX IF NOT EXISTS appointments_start_time_idx ON appointments(start_time);

-- Composite indexes commonly used in list screens
CREATE INDEX IF NOT EXISTS appointments_owner_status_time_idx ON appointments(owner_id, status, start_time);
CREATE INDEX IF NOT EXISTS appointments_vet_status_time_idx ON appointments(vet_id, status, start_time);
