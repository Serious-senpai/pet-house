'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import styles from './AuthForms.module.css';

interface LoginFormProps {
    onSwitchToRegister: () => void;
    onSuccess?: () => void;
    onBack?: () => void;
    backLabel?: string;
}

export default function LoginForm({
    onSwitchToRegister,
    onSuccess,
    onBack,
    backLabel = 'Quay lại trang chủ',
}: LoginFormProps) {
    const { login, loading, error, clearError } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);
        clearError();

        if (!email || !password) {
            setLocalError('Please fill in all fields');
            return;
        }

        const result = await login(email, password);
        if (!result.success) {
            setLocalError(result.error || 'Login failed');
        } else {
            onSuccess?.();
        }
    };

    return (
        <div className={styles.formContainer}>
            <h2 className={styles.formTitle}>Welcome Back</h2>
            <p className={styles.formSubtitle}>Sign in to your account</p>

            <form onSubmit={handleSubmit} className={styles.form}>
                {(localError || error) && (
                    <div className={styles.error}>{localError || error}</div>
                )}

                <div className={styles.inputGroup}>
                    <label htmlFor="email" className={styles.label}>
                        Email
                    </label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={styles.input}
                        placeholder="Enter your email"
                        disabled={loading}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label htmlFor="password" className={styles.label}>
                        Password
                    </label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={styles.input}
                        placeholder="Enter your password"
                        disabled={loading}
                    />
                </div>

                <button type="submit" className={styles.submitButton} disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                </button>
                {onBack && (
                    <button type="button" onClick={onBack} className={styles.backLink}>
                        <span aria-hidden>←</span>
                        {backLabel}
                    </button>
                )}
            </form>

            <p className={styles.switchText}>
                Don&apos;t have an account?{' '}
                <button
                    type="button"
                    onClick={onSwitchToRegister}
                    className={styles.switchButton}
                >
                    Register
                </button>
            </p>
        </div>
    );
}
