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
    date_of_birth: string | null;
    breed: string | null;
    weight_kg: number | null;
    next_vaccination_date: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}
