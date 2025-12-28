'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { UserProfile, UserRole } from '@/types';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
    user: UserProfile | null;
    session: Session | null;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (email: string, password: string, fullName: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }

        return data as UserProfile;
    }, []);

    const handleAuthChange = useCallback(async (authUser: User | null) => {
        if (authUser) {
            const profile = await fetchUserProfile(authUser.id);
            setUser(profile);
        } else {
            setUser(null);
        }
        setLoading(false);
    }, [fetchUserProfile]);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            handleAuthChange(session?.user ?? null);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setSession(session);
                await handleAuthChange(session?.user ?? null);
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, [handleAuthChange]);

    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
            return { success: false, error: error.message };
        }

        if (data.user) {
            const profile = await fetchUserProfile(data.user.id);
            setUser(profile);
        }

        setLoading(false);
        return { success: true };
    };

    const register = async (
        email: string,
        password: string,
        fullName: string,
        role: UserRole
    ): Promise<{ success: boolean; error?: string }> => {
        setLoading(true);
        setError(null);

        const friendlyDuplicateEmail = 'This email is already registered. Please sign in instead.';

        // Sign up the user
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            const message = (error.message || '').toLowerCase();
            const friendly = message.includes('already registered') || message.includes('already exists')
                ? friendlyDuplicateEmail
                : error.message;
            setError(friendly);
            setLoading(false);
            return { success: false, error: friendly };
        }

        // Supabase can return a "user" object even when the email is already registered
        // (to avoid account enumeration). In that case `identities` is typically empty.
        if (data.user && (data.user.identities?.length ?? 0) === 0) {
            setError(friendlyDuplicateEmail);
            setLoading(false);
            return { success: false, error: friendlyDuplicateEmail };
        }

        if (data.user) {
            // Create user profile
            const { error: profileError } = await supabase.from('profiles').insert({
                id: data.user.id,
                email: email,
                full_name: fullName,
                role: role,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });

            if (profileError) {
                const message = (profileError.message || '').toLowerCase();
                const code = (profileError as unknown as { code?: string }).code;
                const isFkViolation = code === '23503' || message.includes('foreign key') || message.includes('profiles_id_fkey');
                const isUniqueViolation = code === '23505' || message.includes('duplicate key');
                const friendly = (isFkViolation || isUniqueViolation)
                    ? friendlyDuplicateEmail
                    : profileError.message;

                setError(friendly);
                setLoading(false);
                return { success: false, error: friendly };
            }

            const profile = await fetchUserProfile(data.user.id);
            setUser(profile);
        }

        setLoading(false);
        return { success: true };
    };

    const logout = async () => {
        // Optimistic UI update: ensure the app logs out immediately.
        setUser(null);
        setSession(null);
        setLoading(false);

        // Best-effort remote sign-out; don't block UI on network.
        try {
            const { error } = await supabase.auth.signOut({ scope: 'local' });
            if (error) {
                console.error('Logout error:', error);
            }
        } catch (err) {
            console.error('Logout exception:', err);
        }
    };

    const clearError = () => {
        setError(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                loading,
                error,
                login,
                register,
                logout,
                clearError,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
