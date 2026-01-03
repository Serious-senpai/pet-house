-- 1. Tạo bảng notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- Người nhận
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT, -- Đường dẫn khi click vào (vd: /appointments)
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Bật RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" 
ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications" 
ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- 3. Tạo Function để tự động bắn thông báo khi Appointment thay đổi
CREATE OR REPLACE FUNCTION notify_appointment_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Trường hợp 1: Lịch hẹn được CONFIRMED (Bác sĩ nhận lịch)
  IF OLD.status = 'pending' AND NEW.status = 'confirmed' THEN
    INSERT INTO notifications (user_id, title, message, link)
    VALUES (
      NEW.owner_id, 
      'Appointment Confirmed', 
      'Your appointment has been confirmed by Dr. ' || (SELECT full_name FROM profiles WHERE id = NEW.vet_id),
      '/appointments'
    );
  END IF;

  -- Trường hợp 2: Lịch hẹn COMPLETED (Khám xong)
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    INSERT INTO notifications (user_id, title, message, link)
    VALUES (
      NEW.owner_id, 
      'Visit Completed', 
      'Your pet''s visit is complete. Click to view the medical report.',
      '/appointments' -- Hoặc link tới tab Past
    );
  END IF;

  -- Trường hợp 3: Lịch hẹn CANCELLED (Bị hủy)
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
     -- Nếu người hủy là Vet hoặc Admin (không phải chính chủ), thì báo cho chủ
     -- Logic đơn giản: cứ báo hết
     INSERT INTO notifications (user_id, title, message, link)
     VALUES (
       NEW.owner_id, 
       'Appointment Cancelled', 
       'An appointment has been cancelled.',
       '/appointments'
     );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Gắn Trigger vào bảng appointments
CREATE TRIGGER trigger_notify_appointment
AFTER UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION notify_appointment_change();