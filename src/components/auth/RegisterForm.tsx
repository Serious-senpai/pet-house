'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import styles from './AuthForms.module.css';

interface RegisterFormProps {
    onSwitchToLogin: () => void;
    onBack?: () => void;
    backLabel?: string;
}

const roleOptions: { value: UserRole; label: string; description: string }[] = [
    { value: 'pet_owner', label: 'Pet Owner', description: 'Register as a pet owner to manage your pets' },
    { value: 'vet', label: 'Veterinarian', description: 'Register as a veterinarian ' },
    { value: 'staff', label: 'Staff', description: 'Register as a staff member' },
    { value: 'admin', label: 'Administrator', description: 'Register as an administrator' },
];

export default function RegisterForm({
    onSwitchToLogin,
    onBack,
    backLabel = 'Quay lại trang chủ',
}: RegisterFormProps) {
    const { register, loading, error, clearError } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState<UserRole>('pet_owner');
    const [localError, setLocalError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);
        clearError();
        setSuccess(false);

        if (!email || !password || !confirmPassword || !fullName) {
            setLocalError('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            setLocalError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setLocalError('Password must be at least 6 characters');
            return;
        }

        const result = await register(email, password, fullName, role);
        if (result.success) {
            setSuccess(true);
        } else {
            setLocalError(result.error || 'Registration failed');
        }
    };

    if (success) {
        return (
            <div className={styles.formContainer}>
                <div className={styles.successMessage}>
                    <h2 className={styles.formTitle}>Registration Successful!</h2>
                    <p className={styles.formSubtitle}>
                        Your account has been created. You can now sign in.
                    </p>
                    <button onClick={onSwitchToLogin} className={styles.submitButton}>
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.formContainer}>
            <h2 className={styles.formTitle}>Create Account</h2>
            <p className={styles.formSubtitle}>Join PetHouse today</p>

            <form onSubmit={handleSubmit} className={styles.form}>
                {(localError || error) && (
                    <div className={styles.error}>{localError || error}</div>
                )}

                <div className={styles.inputGroup}>
                    <label htmlFor="fullName" className={styles.label}>
                        Full Name
                    </label>
                    <input
                        type="text"
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={styles.input}
                        placeholder="Enter your full name"
                        disabled={loading}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label htmlFor="registerEmail" className={styles.label}>
                        Email
                    </label>
                    <input
                        type="email"
                        id="registerEmail"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={styles.input}
                        placeholder="Enter your email"
                        disabled={loading}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label htmlFor="role" className={styles.label}>
                        Account Type
                    </label>
                    <select
                        id="role"
                        value={role}
                        onChange={(e) => setRole(e.target.value as UserRole)}
                        className={styles.select}
                        disabled={loading}
                    >
                        {roleOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <p className={styles.roleDescription}>
                        {roleOptions.find((r) => r.value === role)?.description}
                    </p>
                </div>

                <div className={styles.inputGroup}>
                    <label htmlFor="registerPassword" className={styles.label}>
                        Password
                    </label>
                    <input
                        type="password"
                        id="registerPassword"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={styles.input}
                        placeholder="Create a password"
                        disabled={loading}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label htmlFor="confirmPassword" className={styles.label}>
                        Confirm Password
                    </label>
                    <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={styles.input}
                        placeholder="Confirm your password"
                        disabled={loading}
                    />
                </div>

                <button type="submit" className={styles.submitButton} disabled={loading}>
                    {loading ? 'Creating Account...' : 'Create Account'}
                </button>
                {onBack && (
                    <button type="button" onClick={onBack} className={styles.backLink}>
                        <span aria-hidden>←</span>
                        {backLabel}
                    </button>
                )}
            </form>

            <p className={styles.switchText}>
                Already have an account?{' '}
                <button
                    type="button"
                    onClick={onSwitchToLogin}
                    className={styles.switchButton}
                >
                    Sign In
                </button>
            </p>
        </div>
    );
}
