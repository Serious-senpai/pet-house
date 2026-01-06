'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
    const router = useRouter();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!loading && user) router.replace('/');
    }, [loading, user, router]);

    // const handleBack = () => {
    //     // nếu có trang trước thì back, còn không thì về home
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

                <LoginForm
                    onSwitchToRegister={() => router.push('/auth/register')}
                    onSuccess={() => router.replace('/')}
                    onBack={() => router.push('/')}
                />
            </div>
        </main>
    );
}
