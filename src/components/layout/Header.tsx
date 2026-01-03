'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Header.module.css'; // Chúng ta sẽ tách CSS ra file riêng

export default function Header() {
    const router = useRouter();
    const { user, loading, logout } = useAuth();

    const openLogin = () => router.push('/auth/login');
    const openRegister = () => router.push('/auth/register');

    const getRoleDisplayName = (role: string) => {
        const roleNames: Record<string, string> = {
            admin: 'Administrator',
            pet_owner: 'Pet Owner',
            vet: 'Veterinarian',
            staff: 'Staff Member',
        };
        return roleNames[role] || role;
    };

    return (
        <header className={styles.header}>
            <div className={styles.headerContent}>
                {/* LOGIC QUAY VỀ TRANG CHỦ TẠI ĐÂY */}
                <Link href="/" className={styles.logoLink}>
                    <div className={styles.logo}>
                        <span className={styles.logoIcon}>🏠</span>
                        <span className={styles.logoText}>PetHouse</span>
                    </div>
                </Link>

                <nav className={styles.nav}>
                    {loading ? (
                        <div className={styles.loadingSpinner}></div>
                    ) : user ? (
                        <div className={styles.userSection}>
                            <div className={styles.userInfo}>
                                <span className={styles.userName}>{user.full_name}</span>
                                <span className={styles.userRole}>{getRoleDisplayName(user.role)}</span>
                            </div>
                            <Link href="/appointments" className={styles.headerLinkButton}>
                                Appointments
                            </Link>
                            {user.role === 'pet_owner' && (
                                <Link href="/boarding" className={styles.headerLinkButton}>
                                    Boarding
                                </Link>
                            )}
                            {user.role === 'pet_owner' && (
                                <Link href="/boarding/my-bookings" className={styles.headerLinkButton}>
                                    My Bookings
                                </Link>
                            )}
                            {(user.role === 'staff' || user.role === 'admin') && (
                                <Link href="/boarding/staff" className={styles.headerLinkButton}>
                                    Staff Dashboard
                                </Link>
                            )}
                            {(user.role === 'staff' || user.role === 'admin') && (
                                <Link href="/boarding/approvals" className={styles.headerLinkButton}>
                                    Booking Approvals
                                </Link>
                            )}
                            <button onClick={logout} className={styles.logoutButton}>
                                Logout
                            </button>
                        </div>
                    ) : (
                        <div className={styles.authButtons}>
                            <button onClick={openLogin} className={styles.loginButton}>
                                Sign In
                            </button>
                            <button onClick={openRegister} className={styles.registerButton}>
                                Get Started
                            </button>
                        </div>
                    )}
                </nav>
            </div>
        </header>
    );
}