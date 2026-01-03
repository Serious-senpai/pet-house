'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import OwnerAppointments from '@/components/appointments/OwnerAppointments';
import VetAppointments from '@/components/appointments/VetAppointments';
import AdminAppointments from '@/components/appointments/AdminAppointments'; // Import mới

export default function AppointmentsPage() {
    const { user, loading } = useAuth();

    if (loading) return <div>Loading...</div>; // Có thể thay bằng spinner đẹp hơn nếu muốn
    if (!user) return null;

    if (user.role === 'pet_owner') {
        return <OwnerAppointments />;
    }

    if (user.role === 'vet') {
        return <VetAppointments />;
    }

    // Cho phép cả Admin và Staff truy cập trang quản lý chung
    if (user.role === 'admin' || user.role === 'staff') {
        return <AdminAppointments />;
    }

    return (
        <div style={{ padding: 24 }}>
            Unknown role: <b>{user.role}</b>
        </div>
    );
}