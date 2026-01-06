'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import RegisterForm from '@/components/auth/RegisterForm';

export default function RegisterPage() {
    const router = useRouter();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!loading && user) router.replace('/');
    }, [loading, user, router]);

    // const handleBack = () => {
    //     if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    //     else router.push('/');
    // };

    if (loading) return <div style={{ padding: 24 }}>Loading...</div>;

    return (
        <main
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
            }}
        >
            <div style={{ width: 'min(520px, 100%)' }}>

                <RegisterForm
                    onSwitchToLogin={() => router.push('/auth/login')}
                    onBack={() => router.push('/')}
                />
            </div>
        </main>
    );
}
