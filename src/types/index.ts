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
