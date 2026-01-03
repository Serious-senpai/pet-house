export type UserRole = 'admin' | 'pet_owner' | 'vet' | 'staff';

export interface UserProfile {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    phone?: string;
    address?: string;
    created_at: string;
    updated_at: string;
}

export interface AuthState {
    user: UserProfile | null;
    loading: boolean;
    error: string | null;
}

export interface Pet {
    id: string;
    owner_id: string;
    name: string;
    species: string;
    date_of_birth: string | null;
    breed: string | null;
    weight_kg: number | null;
    next_vaccination_date: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}
export type RoomType = 'standard' | 'premium' | 'deluxe';
export type BoardingStatus = 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled';
export type HealthStatus = 'normal' | 'mild_issue' | 'serious_issue';

export interface BoardingRoom {
    id: string;
    name: string;
    description: string | null;
    room_type: RoomType;
    capacity: number;
    available_count: number;
    price_per_day: number;
    is_available: boolean;
    created_at: string;
    updated_at: string;
}

export interface BoardingBooking {
    id: string;
    owner_id: string;
    pet_id: string;
    room_id: string;
    check_in_date: string;
    check_out_date: string;
    price_per_day: number;
    total_price: number;
    special_notes: string | null;
    dietary_requirements: string | null;
    medical_requirements: string | null;
    status: BoardingStatus;
    staff_checked_in_by: string | null;
    staff_checked_out_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface BoardingHealthLog {
    id: string;
    booking_id: string;
    logged_by_staff_id: string;
    log_date: string;
    health_status: HealthStatus | null;
    behavior_notes: string | null;
    food_intake: string | null;
    water_intake: string | null;
    activities: string | null;
    medication_given: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface MedicalRecord {
    id: string;
    appointment_id: string;
    pet_id: string;
    vet_id: string;
    diagnosis: string;
    symptoms: string;
    treatment: string;
    prescription: string;
    doctor_notes: string;
    created_at: string;
}