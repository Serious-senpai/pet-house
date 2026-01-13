ALTER TABLE boarding_bookings 
ADD COLUMN payment_status text DEFAULT 'unpaid';

-- (Tùy chọn) Thêm ràng buộc để chỉ nhận 'paid' hoặc 'unpaid'
ALTER TABLE boarding_bookings 
ADD CONSTRAINT check_payment_status CHECK (payment_status IN ('paid', 'unpaid'));