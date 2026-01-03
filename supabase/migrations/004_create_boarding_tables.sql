-- Create boarding_rooms table (Room types and pricing)
CREATE TABLE IF NOT EXISTS boarding_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Room details
  name TEXT NOT NULL,
  description TEXT,
  room_type TEXT NOT NULL CHECK (room_type IN ('standard', 'premium', 'deluxe')),
  
  -- Capacity
  capacity INTEGER NOT NULL DEFAULT 1,
  available_count INTEGER NOT NULL DEFAULT 1,
  
  -- Pricing (per day)
  price_per_day NUMERIC(10, 2) NOT NULL,
  
  -- Status
  is_available BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Keep updated_at current
CREATE TRIGGER boarding_rooms_updated_at
  BEFORE UPDATE ON boarding_rooms
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE INDEX IF NOT EXISTS boarding_rooms_room_type_idx ON boarding_rooms(room_type);


-- Create boarding_bookings table
CREATE TABLE IF NOT EXISTS boarding_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Owner and pet info
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  
  -- Room info
  room_id UUID NOT NULL REFERENCES boarding_rooms(id) ON DELETE RESTRICT,
  
  -- Timeline
  check_in_date TIMESTAMP WITH TIME ZONE NOT NULL,
  check_out_date TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Pricing
  price_per_day NUMERIC(10, 2) NOT NULL,
  total_price NUMERIC(10, 2) NOT NULL,
  
  -- Special notes/requirements
  special_notes TEXT,
  dietary_requirements TEXT,
  medical_requirements TEXT,
  
  -- Booking status workflow
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled')),
  
  -- Staff who handled the booking
  staff_checked_in_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  staff_checked_out_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Basic validation
  CONSTRAINT boarding_bookings_date_valid CHECK (check_out_date > check_in_date)
);

-- Keep updated_at current
CREATE TRIGGER boarding_bookings_updated_at
  BEFORE UPDATE ON boarding_bookings
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE INDEX IF NOT EXISTS boarding_bookings_owner_id_idx ON boarding_bookings(owner_id);
CREATE INDEX IF NOT EXISTS boarding_bookings_pet_id_idx ON boarding_bookings(pet_id);
CREATE INDEX IF NOT EXISTS boarding_bookings_room_id_idx ON boarding_bookings(room_id);
CREATE INDEX IF NOT EXISTS boarding_bookings_status_idx ON boarding_bookings(status);
CREATE INDEX IF NOT EXISTS boarding_bookings_check_in_date_idx ON boarding_bookings(check_in_date);
CREATE INDEX IF NOT EXISTS boarding_bookings_check_out_date_idx ON boarding_bookings(check_out_date);


-- Create boarding_health_logs table
CREATE TABLE IF NOT EXISTS boarding_health_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Reference to booking
  booking_id UUID NOT NULL REFERENCES boarding_bookings(id) ON DELETE CASCADE,
  
  -- Staff who logged
  logged_by_staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  
  -- Log details
  log_date TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Health and behavior info
  health_status TEXT CHECK (health_status IN ('normal', 'mild_issue', 'serious_issue')),
  behavior_notes TEXT,
  food_intake TEXT, -- e.g., "full meal", "half meal", "refused"
  water_intake TEXT,
  activities TEXT,
  medication_given TEXT,
  
  -- Any concerns or updates
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Keep updated_at current
CREATE TRIGGER boarding_health_logs_updated_at
  BEFORE UPDATE ON boarding_health_logs
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE INDEX IF NOT EXISTS boarding_health_logs_booking_id_idx ON boarding_health_logs(booking_id);
CREATE INDEX IF NOT EXISTS boarding_health_logs_staff_id_idx ON boarding_health_logs(logged_by_staff_id);
CREATE INDEX IF NOT EXISTS boarding_health_logs_date_idx ON boarding_health_logs(log_date);
