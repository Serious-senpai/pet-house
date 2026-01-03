'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import NotificationBell from './NotificationBell'; // Giữ lại chuông thông báo
import styles from './Header.module.css';

export default function Header() {
    const router = useRouter();
    const { user, loading, logout } = useAuth();

    // State quản lý dropdown
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const openLogin = () => router.push('/auth/login');
    const openRegister = () => router.push('/auth/register');

    // Đóng menu khi click ra ngoài
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getRoleDisplayName = (role: string) => {
        const roleNames: Record<string, string> = {
            admin: 'Administrator',
            pet_owner: 'Pet Owner',
            vet: 'Veterinarian',
            staff: 'Staff Member',
        };
        return roleNames[role] || role;
    };

    // Hàm lấy chữ cái đầu tên để làm avatar
    const getInitials = (name: string) => {
        return name ? name.charAt(0).toUpperCase() : 'U';
    };

    const handleLogout = async () => {
        setIsMenuOpen(false);
        await logout();
    };

    return (
        <header className={styles.header}>
            <div className={styles.headerContent}>
                {/* Logo */}
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

                            {/* 1. Chuông thông báo (Nằm ngoài dropdown) */}
                            <NotificationBell />

                            {/* 2. User Profile Trigger & Dropdown */}
                            <div ref={menuRef}>
                                <div
                                    className={styles.profileTrigger}
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                >
                                    <div className={styles.userInfo}>
                                        <span className={styles.userName}>{user.full_name}</span>
                                        <span className={styles.userRole}>{getRoleDisplayName(user.role)}</span>
                                    </div>
                                    <div className={styles.avatarPlaceholder}>
                                        {getInitials(user.full_name)}
                                    </div>
                                    <span className={styles.chevron}>▼</span>
                                </div>

                                {isMenuOpen && (
                                    <div className={styles.dropdownMenu}>
                                        {/* --- CÁC LINK MENU --- */}

                                        {/* Admin Dashboard */}
                                        {user.role === 'admin' && (
                                            <Link href="/admin/dashboard" className={styles.menuItem} onClick={() => setIsMenuOpen(false)}>
                                                <span>📊</span> Admin Dashboard
                                            </Link>
                                        )}

                                        {/* Appointments (Ai cũng có) */}
                                        <Link href="/appointments" className={styles.menuItem} onClick={() => setIsMenuOpen(false)}>
                                            <span>📅</span> Appointments
                                        </Link>

                                        {/* Pet Owner Menu */}
                                        {user.role === 'pet_owner' && (
                                            <>
                                                <Link href="/boarding" className={styles.menuItem} onClick={() => setIsMenuOpen(false)}>
                                                    <span>🏨</span> Boarding
                                                </Link>
                                                <Link href="/boarding/my-bookings" className={styles.menuItem} onClick={() => setIsMenuOpen(false)}>
                                                    <span>🎫</span> My Bookings
                                                </Link>
                                                {/* Có thể thêm link My Pets ở đây sau này */}
                                            </>
                                        )}

                                        {/* Staff/Admin Menu */}
                                        {(user.role === 'staff' || user.role === 'admin') && (
                                            <>
                                                <div className={styles.menuDivider}></div>
                                                <Link href="/boarding/staff" className={styles.menuItem} onClick={() => setIsMenuOpen(false)}>
                                                    <span>🗂️</span> Staff Boarding
                                                </Link>
                                                <Link href="/boarding/approvals" className={styles.menuItem} onClick={() => setIsMenuOpen(false)}>
                                                    <span>✅</span> Approvals
                                                </Link>
                                            </>
                                        )}

                                        <div className={styles.menuDivider}></div>

                                        <button onClick={handleLogout} className={`${styles.menuItem} ${styles.logoutItem}`}>
                                            <span>🚪</span> Logout
                                        </button>
                                    </div>
                                )}
                            </div>
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