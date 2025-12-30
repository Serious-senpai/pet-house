'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import PetsPanel from '@/components/pets/PetsPanel';
import styles from './LandingPage.module.css';

const features = [
    {
        icon: '🐕',
        title: 'Pet Management',
        description: 'Keep track of all your pets\' information, medical history, and schedules in one place.',
    },
    {
        icon: '👨‍⚕️',
        title: 'Expert Veterinarians',
        description: 'Connect with qualified veterinarians for consultations and treatments.',
    },
    {
        icon: '📅',
        title: 'Easy Scheduling',
        description: 'Book appointments, grooming sessions, and boarding with just a few clicks.',
    },
    {
        icon: '💊',
        title: 'Medical Records',
        description: 'Access complete medical histories, vaccinations, and prescriptions anytime.',
    },
    {
        icon: '🏠',
        title: 'Pet Boarding',
        description: 'Safe and comfortable boarding facilities for when you\'re away.',
    },
    {
        icon: '📊',
        title: 'Reports & Analytics',
        description: 'Comprehensive reports on pet health, appointments, and center operations.',
    },
];

const userTypes = [
    {
        icon: '🐾',
        title: 'Pet Owners',
        description: 'Manage your pets, book appointments, and access medical records.',
    },
    {
        icon: '🩺',
        title: 'Veterinarians',
        description: 'Access patient records, manage appointments, and provide care.',
    },
    {
        icon: '👥',
        title: 'Staff Members',
        description: 'Handle daily operations, bookings, and customer service.',
    },
    {
        icon: '⚙️',
        title: 'Administrators',
        description: 'Full system access for management and reporting.',
    },
];

export default function LandingPage() {
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
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <div className={styles.logo}>
                        <span className={styles.logoIcon}>🏠</span>
                        <span className={styles.logoText}>PetHouse</span>
                    </div>
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

            {/* Hero Section */}
            <section className={styles.hero}>
                <div className={styles.heroContent}>
                    <h1 className={styles.heroTitle}>
                        Complete Care for Your
                        <span className={styles.highlight}> Beloved Pets</span>
                    </h1>
                    <p className={styles.heroSubtitle}>
                        PetHouse is your all-in-one solution for pet care management. From appointments
                        to medical records, we make caring for your furry friends easier than ever.
                    </p>
                    {!user && (
                        <div className={styles.heroCta}>
                            <button onClick={openRegister} className={styles.ctaPrimary}>
                                Create Free Account
                            </button>
                            <button onClick={openLogin} className={styles.ctaSecondary}>
                                Sign In
                            </button>
                        </div>
                    )}
                    {user && (
                        <div className={styles.welcomeCard}>
                            <h3>Welcome back, {user.full_name}! 👋</h3>
                            <p>You are logged in as {getRoleDisplayName(user.role)}.</p>
                        </div>
                    )}

                </div>
                <div className={styles.heroImage}>
                    <div className={styles.heroImagePlaceholder}>
                        <span>🐕</span>
                        <span>🐈</span>
                        <span>🐰</span>
                    </div>
                </div>
            </section>

            {user && (
                <section className={styles.dashboardSection}>
                    <div className={styles.dashboardContainer}>
                        <PetsPanel />
                    </div>
                </section>
            )}


            {/* Features Section */}
            <section className={styles.features}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Everything You Need</h2>
                    <p className={styles.sectionSubtitle}>
                        Comprehensive tools to manage all aspects of pet care
                    </p>
                </div>
                <div className={styles.featureGrid}>
                    {features.map((feature, index) => (
                        <div key={index} className={styles.featureCard}>
                            <div className={styles.featureIcon}>{feature.icon}</div>
                            <h3 className={styles.featureTitle}>{feature.title}</h3>
                            <p className={styles.featureDescription}>{feature.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* User Types Section */}
            <section className={styles.userTypes}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>For Everyone</h2>
                    <p className={styles.sectionSubtitle}>
                        Tailored experiences for different roles
                    </p>
                </div>
                <div className={styles.userTypeGrid}>
                    {userTypes.map((type, index) => (
                        <div key={index} className={styles.userTypeCard}>
                            <div className={styles.userTypeIcon}>{type.icon}</div>
                            <h3 className={styles.userTypeTitle}>{type.title}</h3>
                            <p className={styles.userTypeDescription}>{type.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            {!user && (
                <section className={styles.ctaSection}>
                    <div className={styles.ctaContent}>
                        <h2 className={styles.ctaTitle}>Ready to Get Started?</h2>
                        <p className={styles.ctaSubtitle}>
                            Join PetHouse today and give your pets the care they deserve.
                        </p>
                        <button onClick={openRegister} className={styles.ctaButton}>
                            Create Your Free Account
                        </button>
                    </div>
                </section>
            )}

            {/* Footer */}
            <footer className={styles.footer}>
                <div className={styles.footerContent}>
                    <div className={styles.footerLogo}>
                        <span className={styles.logoIcon}>🏠</span>
                        <span className={styles.logoText}>PetHouse</span>
                    </div>
                    <p className={styles.footerText}>
                        © 2025 PetHouse. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}
