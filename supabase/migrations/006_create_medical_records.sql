-- 1. Create medical_records table
CREATE TABLE IF NOT EXISTS medical_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES pets(id), -- Redundant but good for quick history queries
  vet_id UUID NOT NULL REFERENCES profiles(id),
  
  diagnosis TEXT NOT NULL,          -- Chẩn đoán
  symptoms TEXT,                    -- Triệu chứng
  treatment TEXT,                   -- Phương pháp điều trị
  prescription TEXT,                -- Đơn thuốc
  doctor_notes TEXT,                -- Ghi chú thêm của bác sĩ
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint: Mỗi cuộc hẹn chỉ có 1 bệnh án
  CONSTRAINT unique_appointment_record UNIQUE (appointment_id)
);

-- 2. Trigger updated_at
CREATE TRIGGER medical_records_updated_at
  BEFORE UPDATE ON medical_records
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- 3. RLS Policies
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;

-- Bác sĩ: Được xem tất cả và tạo/sửa bệnh án do mình khám
CREATE POLICY "Vets can manage records" 
ON medical_records FOR ALL 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('vet', 'admin'))
);

-- Chủ nuôi: Chỉ xem bệnh án của thú cưng mình (thông qua bảng pets)
CREATE POLICY "Owners view own pet records" 
ON medical_records FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM pets 
    WHERE pets.id = medical_records.pet_id 
    AND pets.owner_id = auth.uid()
  )
);