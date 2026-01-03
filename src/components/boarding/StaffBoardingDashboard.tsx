'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { BoardingBooking, Pet, UserProfile, BoardingHealthLog } from '@/types';
import styles from './StaffBoardingDashboard.module.css';
import {
    PawPrint,
    BarChart2,
    LogOut,
    CheckCircle,
    XCircle,
    Calendar,
    User,
    ClipboardList
} from 'lucide-react';

type TabKey = 'pending' | 'confirmed' | 'checked_in' | 'completed';

interface BookingWithDetails extends BoardingBooking {
    pet?: Pet | null;
    owner?: UserProfile | null;
}

export default function StaffBoardingDashboard() {
    const { user } = useAuth();

    // --- STATE ---
    const [tab, setTab] = useState<TabKey>('pending');
    const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [actionId, setActionId] = useState<string | null>(null);

    // Modal States
    const [showHealthModal, setShowHealthModal] = useState(false);
    const [selectedBookingForHealth, setSelectedBookingForHealth] = useState<BookingWithDetails | null>(null);
    const [healthLogs, setHealthLogs] = useState<BoardingHealthLog[]>([]);

    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedBookingForReject, setSelectedBookingForReject] = useState<BookingWithDetails | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    // Health Log Form
    const [healthStatus, setHealthStatus] = useState<'normal' | 'mild_issue' | 'serious_issue'>('normal');
    const [behaviorNotes, setBehaviorNotes] = useState('');
    const [foodIntake, setFoodIntake] = useState('');
    const [waterIntake, setWaterIntake] = useState('');
    const [savingLog, setSavingLog] = useState(false);

    // --- FETCHING ---
    useEffect(() => {
        if (!user) return;
        const loadBookings = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data, error } = await supabase
                    .from('boarding_bookings')
                    .select(`*, pet:pets(*), owner:profiles!owner_id(*)`)
                    .eq('status', tab)
                    .order(tab === 'pending' ? 'created_at' : 'check_in_date', { ascending: true });

                if (error) throw error;
                setBookings((data as unknown as BookingWithDetails[]) || []);
            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };
        void loadBookings();
    }, [tab, user]);

    // --- HELPERS ---
    const calcDays = (checkIn: string, checkOut: string): number => {
        const inDate = new Date(checkIn);
        const outDate = new Date(checkOut);
        const diffTime = Math.abs(outDate.getTime() - inDate.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    };

    // --- ACTIONS ---
    const handleApprove = async (id: string) => {
        if (!confirm('Approve this booking?')) return;
        setActionId(id);
        try {
            const { error } = await supabase.from('boarding_bookings').update({ status: 'confirmed' }).eq('id', id);
            if (error) throw error;
            setBookings(prev => prev.filter(b => b.id !== id));
        } catch (e: any) { setError(e.message); }
        finally { setActionId(null); }
    };

    const handleReject = async () => {
        if (!selectedBookingForReject) return;
        setActionId(selectedBookingForReject.id);
        try {
            const { error } = await supabase.from('boarding_bookings').update({ status: 'cancelled' }).eq('id', selectedBookingForReject.id);
            if (error) throw error;
            setBookings(prev => prev.filter(b => b.id !== selectedBookingForReject.id));
            setShowRejectModal(false);
        } catch (e: any) { setError(e.message); }
        finally { setActionId(null); }
    };

    const handleCheckIn = async (id: string) => {
        setActionId(id);
        try {
            const { error } = await supabase.from('boarding_bookings').update({
                status: 'checked_in',
                staff_checked_in_by: user?.id,
                updated_at: new Date().toISOString()
            }).eq('id', id);
            if (error) throw error;
            setBookings(prev => prev.filter(b => b.id !== id));
        } catch (e: any) { setError(e.message); }
        finally { setActionId(null); }
    };

    const handleCheckOut = async (id: string) => {
        if (!confirm('Confirm check out for this pet?')) return;
        setActionId(id);
        try {
            const { error } = await supabase.from('boarding_bookings').update({
                status: 'completed',
                staff_checked_out_by: user?.id,
                updated_at: new Date().toISOString()
            }).eq('id', id);
            if (error) throw error;
            setBookings(prev => prev.filter(b => b.id !== id));
        } catch (e: any) { setError(e.message); }
        finally { setActionId(null); }
    };

    // --- HEALTH LOGS ---
    const openHealthModal = async (booking: BookingWithDetails) => {
        setSelectedBookingForHealth(booking);
        setShowHealthModal(true);
        const { data } = await supabase.from('boarding_health_logs').select('*').eq('booking_id', booking.id).order('log_date', { ascending: false });
        setHealthLogs(data || []);
    };

    const handleAddLog = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBookingForHealth || !user) return;
        setSavingLog(true);
        try {
            const { error } = await supabase.from('boarding_health_logs').insert({
                booking_id: selectedBookingForHealth.id,
                logged_by_staff_id: user.id,
                health_status: healthStatus,
                behavior_notes: behaviorNotes,
                food_intake: foodIntake,
                water_intake: waterIntake
            });
            if (error) throw error;
            setBehaviorNotes(''); setFoodIntake(''); setWaterIntake('');
            // Refresh logs
            const { data } = await supabase.from('boarding_health_logs').select('*').eq('booking_id', selectedBookingForHealth.id).order('log_date', { ascending: false });
            setHealthLogs(data || []);
        } catch (e: any) { alert(e.message); }
        finally { setSavingLog(false); }
    };

    if (!user || !['staff', 'admin'].includes(user.role)) return <div className={styles.error}>Access Denied</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Boarding Dashboard</h1>
                <p className={styles.subtitle}>Manage pet stays and daily care</p>
            </div>

            {error && <div className={styles.banner}>{error}</div>}

            <div className={styles.tabs}>
                {['pending', 'confirmed', 'checked_in', 'completed'].map((t) => (
                    <button
                        key={t}
                        className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
                        onClick={() => setTab(t as TabKey)}
                    >
                        {t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')}
                    </button>
                ))}
            </div>

            {loading ? <div className={styles.loading}>Loading...</div> : (
                <div className={styles.bookingsList}>
                    {bookings.length === 0 && <div className={styles.empty}>No bookings in this tab.</div>}

                    {bookings.map(booking => (
                        <div key={booking.id} className={styles.bookingCard}>
                            {/* --- CARD HEADER --- */}
                            <div className={styles.cardHeader}>
                                <div className={styles.petIdentity}>
                                    <PawPrint className={styles.petIcon} size={24} />
                                    <div className={styles.petInfo}>
                                        <h3>{booking.pet?.name || 'Unknown Pet'}</h3>
                                        <p className={styles.petBreed}>{booking.pet?.breed || 'Unknown Breed'}</p>
                                    </div>
                                </div>
                                <div className={styles.dateBlock}>
                                    <div><span className={styles.dateLabel}>In:</span><span className={styles.dateValue}>{formatDate(booking.check_in_date)}</span></div>
                                    <div><span className={styles.dateLabel}>Out:</span><span className={styles.dateValue}>{formatDate(booking.check_out_date)}</span></div>
                                    <span className={styles.duration}>({calcDays(booking.check_in_date, booking.check_out_date)} days)</span>
                                </div>
                            </div>

                            {/* --- CARD BODY --- */}
                            <div className={styles.cardBody}>
                                <div className={styles.ownerSection}>
                                    <h4 className={styles.sectionTitle}>Owner Info</h4>
                                    <p className={styles.ownerName}>{booking.owner?.full_name || 'N/A'}</p>
                                    <p className={styles.ownerEmail}>{booking.owner?.email}</p>
                                    <div className={styles.priceRow}>
                                        Total Price: <strong>${booking.total_price.toFixed(2)}</strong>
                                    </div>
                                    <div className={styles.statusText}>
                                        {booking.status.toUpperCase()}
                                    </div>
                                </div>

                                <div className={styles.reqList}>
                                    <div className={styles.reqItem}>
                                        <span className={styles.reqIcon}>🍽️</span>
                                        <span>
                                            <span className={styles.reqLabel}>Diet:</span>
                                            {booking.dietary_requirements || 'Standard'}
                                        </span>
                                    </div>
                                    <div className={styles.reqItem}>
                                        <span className={styles.reqIcon}>💊</span>
                                        <span>
                                            <span className={styles.reqLabel}>Medical:</span>
                                            {booking.medical_requirements || 'No'}
                                        </span>
                                    </div>
                                    <div className={styles.reqItem}>
                                        <span className={styles.reqIcon}>📝</span>
                                        <span>
                                            <span className={styles.reqLabel}>Note:</span>
                                            {booking.special_notes || 'She needs to drink twice amount of water as other cats'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* --- CARD ACTIONS --- */}
                            <div className={styles.cardActions}>
                                {tab === 'pending' && (
                                    <>
                                        <button
                                            className={`${styles.btn} ${styles.btnPurple}`}
                                            onClick={() => handleApprove(booking.id)}
                                            disabled={actionId === booking.id}
                                        >
                                            <CheckCircle size={18} /> Approve
                                        </button>
                                        <button
                                            className={`${styles.btn} ${styles.btnDanger}`}
                                            onClick={() => { setSelectedBookingForReject(booking); setShowRejectModal(true); }}
                                        >
                                            <XCircle size={18} /> Reject
                                        </button>
                                    </>
                                )}

                                {tab === 'confirmed' && (
                                    <button
                                        className={`${styles.btn} ${styles.btnPurple}`}
                                        onClick={() => handleCheckIn(booking.id)}
                                        disabled={actionId === booking.id}
                                    >
                                        <Calendar size={18} /> Check In Now
                                    </button>
                                )}

                                {tab === 'checked_in' && (
                                    <>
                                        <button
                                            className={`${styles.btn} ${styles.btnLight}`}
                                            onClick={() => openHealthModal(booking)}
                                        >
                                            <BarChart2 size={18} /> Health Logs
                                        </button>
                                        <button
                                            className={`${styles.btn} ${styles.btnPurple}`}
                                            onClick={() => handleCheckOut(booking.id)}
                                            disabled={actionId === booking.id}
                                        >
                                            <LogOut size={18} /> Check Out
                                        </button>
                                    </>
                                )}

                                {tab === 'completed' && (
                                    <button
                                        className={`${styles.btn} ${styles.btnLight}`}
                                        onClick={() => openHealthModal(booking)}
                                    >
                                        <ClipboardList size={18} /> View History
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* --- MODALS (Reject & Health) giữ nguyên logic --- */}
            {showRejectModal && (
                <div className={styles.modal} onClick={() => setShowRejectModal(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Reject Booking</h2>
                            <button className={styles.closeBtn} onClick={() => setShowRejectModal(false)}>✕</button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.field}>
                                <label>Reason:</label>
                                <textarea
                                    rows={3}
                                    value={rejectionReason}
                                    onChange={e => setRejectionReason(e.target.value)}
                                />
                            </div>
                            <button className={`${styles.btn} ${styles.btnDanger}`} onClick={handleReject}>Confirm Reject</button>
                        </div>
                    </div>
                </div>
            )}

            {showHealthModal && selectedBookingForHealth && (
                <div className={styles.modal} onClick={() => setShowHealthModal(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Health Logs: {selectedBookingForHealth.pet?.name}</h2>
                            <button className={styles.closeBtn} onClick={() => setShowHealthModal(false)}>✕</button>
                        </div>
                        <div className={styles.modalBody}>
                            {tab === 'checked_in' && (
                                <form onSubmit={handleAddLog} className={styles.logForm}>
                                    <div className={styles.field}>
                                        <label>Status</label>
                                        <select value={healthStatus} onChange={e => setHealthStatus(e.target.value as any)}>
                                            <option value="normal">Normal</option>
                                            <option value="mild_issue">Mild Issue</option>
                                            <option value="serious_issue">Serious Issue</option>
                                        </select>
                                    </div>
                                    <div className={styles.field}>
                                        <textarea
                                            placeholder="Behavior / Activities..."
                                            value={behaviorNotes}
                                            onChange={e => setBehaviorNotes(e.target.value)}
                                        />
                                    </div>
                                    <button className={`${styles.btn} ${styles.btnPurple}`} disabled={savingLog}>
                                        {savingLog ? 'Saving...' : 'Add Log'}
                                    </button>
                                </form>
                            )}
                            <div style={{ marginTop: '1rem' }}>
                                <h3>History</h3>
                                {healthLogs.map(log => (
                                    <div key={log.id} style={{ background: '#f9fafb', padding: '10px', marginBottom: '10px', borderRadius: '8px' }}>
                                        <div><strong>{new Date(log.log_date).toLocaleString()}</strong> - {log.health_status}</div>
                                        <div>{log.behavior_notes}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}