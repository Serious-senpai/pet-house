'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile, Pet } from '@/types';
import styles from './AdminDashboard.module.css';

// Mở rộng kiểu Pet để bao gồm thông tin chủ (join bảng)
interface PetWithOwner extends Pet {
    owner?: UserProfile;
}

export default function AdminDashboard() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Data states
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [pets, setPets] = useState<PetWithOwner[]>([]);
    const [stats, setStats] = useState({
        totalPets: 0,
        totalOwners: 0,
        totalStaff: 0,
        totalAdmins: 0,
    });

    // State cho việc xóa
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<'pets' | 'staff' | 'owners'>('pets');

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setLoading(true);

            try {
                // 1. Fetch Users (Profiles)
                const { data: usersData, error: usersError } = await supabase
                    .from('profiles')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (usersError) throw usersError;

                // 2. Fetch Pets with Owner info
                const { data: petsData, error: petsError } = await supabase
                    .from('pets')
                    .select('*, owner:profiles!owner_id(*)')
                    .order('created_at', { ascending: false });

                if (petsError) throw petsError;

                const loadedUsers = (usersData as UserProfile[]) || [];
                const loadedPets = (petsData as unknown as PetWithOwner[]) || [];

                setUsers(loadedUsers);
                setPets(loadedPets);

                // Calculate Stats
                setStats({
                    totalPets: loadedPets.length,
                    totalOwners: loadedUsers.filter(u => u.role === 'pet_owner').length,
                    totalStaff: loadedUsers.filter(u => u.role === 'staff').length,
                    totalAdmins: loadedUsers.filter(u => u.role === 'admin').length,
                });

            } catch (error) {
                const err = error as Error;
                console.error('Admin dashboard error:', err);
                setError(err.message || 'Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    // --- HÀM XỬ LÝ XÓA USER ---
    const handleDeleteUser = async (targetUserId: string, targetUserRole: string) => {
        // 1. Không cho phép tự xóa chính mình
        if (targetUserId === user?.id) {
            alert("You cannot delete your own admin account.");
            return;
        }

        // 2. Xác nhận
        const confirmMessage = targetUserRole === 'staff'
            ? "Are you sure? Removing a staff member will revoke their access immediately."
            : "Are you sure? Deleting this owner will also DELETE ALL their pets and booking history.";

        if (!window.confirm(confirmMessage)) return;

        setDeletingId(targetUserId);

        try {
            // 3. Xóa khỏi bảng profiles
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', targetUserId);

            if (error) throw error;

            // 4. Cập nhật State UI (Xóa khỏi danh sách đang hiển thị)
            setUsers(prev => prev.filter(u => u.id !== targetUserId));

            // Cập nhật lại stats (tạm thời trừ đi 1)
            setStats(prev => ({
                ...prev,
                totalOwners: targetUserRole === 'pet_owner' ? prev.totalOwners - 1 : prev.totalOwners,
                totalStaff: targetUserRole === 'staff' ? prev.totalStaff - 1 : prev.totalStaff
            }));

            // Nếu xóa owner, cần xóa cả pet của họ khỏi list pets đang hiển thị
            if (targetUserRole === 'pet_owner') {
                setPets(prev => prev.filter(p => p.owner_id !== targetUserId));
                setStats(prev => ({ ...prev, totalPets: pets.length })); // Recalc pets sau
            }

            alert("User deleted successfully.");

        } catch (error: unknown) {
            const err = error as Error;
            console.error("Delete error:", err);
            alert("Failed to delete user: " + err.message);
        } finally {
            setDeletingId(null);
        }
    };

    if (!user || user.role !== 'admin') {
        return (
            <div className={styles.container}>
                <div className={styles.error}>Access Denied: Admin permissions required.</div>
            </div>
        );
    }

    // Filter lists based on tab
    const staffList = users.filter(u => u.role === 'staff' || u.role === 'admin');
    const ownersList = users.filter(u => u.role === 'pet_owner');

    const renderPetsTable = () => (
        <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Pet Name</th>
                        <th>Species</th>
                        <th>Breed</th>
                        <th>Owner Name</th>
                        <th>Owner Email</th>
                    </tr>
                </thead>
                <tbody>
                    {pets.length > 0 ? pets.map(pet => (
                        <tr key={pet.id}>
                            <td><strong>{pet.name}</strong></td>
                            <td>{pet.species}</td>
                            <td>{pet.breed || '-'}</td>
                            <td>{pet.owner?.full_name || 'Unknown'}</td>
                            <td>{pet.owner?.email || 'N/A'}</td>
                        </tr>
                    )) : (
                        <tr><td colSpan={5} className={styles.empty}>No pets found</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );

    const renderUsersTable = (userList: UserProfile[]) => (
        <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Full Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Joined Date</th>
                        <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {userList.length > 0 ? userList.map(u => (
                        <tr key={u.id}>
                            <td><strong>{u.full_name}</strong></td>
                            <td>{u.email}</td>
                            <td>
                                <span className={`${styles.roleBadge} ${styles[`role_${u.role}`]}`}>
                                    {u.role.replace('_', ' ').toUpperCase()}
                                </span>
                            </td>
                            <td>{new Date(u.created_at).toLocaleDateString()}</td>
                            <td style={{ textAlign: 'center' }}>
                                {u.id !== user.id && (
                                    <button
                                        className={styles.btnDelete}
                                        onClick={() => handleDeleteUser(u.id, u.role)}
                                        disabled={deletingId === u.id}
                                        title="Delete this user"
                                    >
                                        {deletingId === u.id ? '...' : '🗑️'}
                                    </button>
                                )}
                            </td>
                        </tr>
                    )) : (
                        <tr><td colSpan={6} className={styles.empty}>No users found</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Admin Dashboard</h1>
                <p className={styles.subtitle}>Overview of center statistics and records</p>
            </div>

            {loading ? (
                <div className={styles.loading}>Loading data...</div>
            ) : error ? (
                <div className={styles.error}>{error}</div>
            ) : (
                <>
                    {/* Stats Cards */}
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <span className={styles.statTitle}>Total Pets</span>
                            <span className={styles.statValue}>{stats.totalPets}</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statTitle}>Pet Owners</span>
                            <span className={styles.statValue}>{stats.totalOwners}</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statTitle}>Staff Members</span>
                            <span className={styles.statValue}>{stats.totalStaff}</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statTitle}>Admins</span>
                            <span className={styles.statValue}>{stats.totalAdmins}</span>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className={styles.tabs}>
                        <button
                            className={`${styles.tab} ${activeTab === 'pets' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('pets')}
                        >
                            Registered Pets
                        </button>
                        <button
                            className={`${styles.tab} ${activeTab === 'staff' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('staff')}
                        >
                            Staff List
                        </button>
                        <button
                            className={`${styles.tab} ${activeTab === 'owners' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('owners')}
                        >
                            Pet Owners
                        </button>
                    </div>

                    {/* Content */}
                    <div>
                        {activeTab === 'pets' && renderPetsTable()}
                        {activeTab === 'staff' && renderUsersTable(staffList)}
                        {activeTab === 'owners' && renderUsersTable(ownersList)}
                    </div>
                </>
            )}
        </div>
    );
}