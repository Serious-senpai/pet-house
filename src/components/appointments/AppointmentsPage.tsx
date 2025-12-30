'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import OwnerAppointments from './OwnerAppointments';
import VetAppointments from './VetAppointments';

export default function AppointmentsPage() {
    const { user, loading } = useAuth();

    if (loading) return null;
    if (!user) return null;

    if (user.role === 'pet_owner') return <OwnerAppointments />;
    if (user.role === 'vet') return <VetAppointments />;

    // staff/admin: bạn có thể làm sau
    return (
        <div style={{ padding: 24 }}>
            This page is not implemented for role: <b>{user.role}</b>
        </div>
    );
}
