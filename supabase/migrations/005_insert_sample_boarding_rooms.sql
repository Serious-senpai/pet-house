-- Insert sample boarding rooms
INSERT INTO boarding_rooms (name, description, room_type, capacity, available_count, price_per_day, is_available)
VALUES
    ('Standard Room A', 'Cozy room for small pets, basic amenities', 'standard', 3, 3, 25.00, TRUE),
    ('Standard Room B', 'Comfortable room for small to medium pets', 'standard', 3, 3, 25.00, TRUE),
    ('Premium Suite 1', 'Spacious suite with window view and enrichment toys', 'premium', 2, 2, 45.00, TRUE),
    ('Premium Suite 2', 'Luxury suite with climate control and play area', 'premium', 2, 2, 45.00, TRUE),
    ('Deluxe Villa 1', 'Exclusive villa with separate play and rest areas, premium bedding', 'deluxe', 1, 1, 75.00, TRUE),
    ('Deluxe Villa 2', 'Executive villa with outdoor access and special care attention', 'deluxe', 1, 1, 75.00, TRUE)
ON CONFLICT DO NOTHING;
