'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { BoardingBooking, Pet, UserProfile, BoardingHealthLog } from '@/types';
import styles from './StaffBoardingDashboard.module.css';

type TabKey = 'pending' | 'checked_in' | 'completed';

interface BookingWithDetails extends BoardingBooking {
    pet?: Pet | null;
    owner?: UserProfile | null;
}

export default function StaffBoardingDashboard() {
    const { user } = useAuth();

    // --- KHAI BÁO STATE (Giữ nguyên vị trí) ---
    const [tab, setTab] = useState<TabKey>('pending');
    const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Health log modal
    const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
    const [healthLogs, setHealthLogs] = useState<BoardingHealthLog[]>([]);
    const [showHealthModal, setShowHealthModal] = useState(false);

    // Health log form
    const [healthStatus, setHealthStatus] = useState<'normal' | 'mild_issue' | 'serious_issue'>('normal');
    const [behaviorNotes, setBehaviorNotes] = useState('');
    const [foodIntake, setFoodIntake] = useState('');
    const [waterIntake, setWaterIntake] = useState('');
    const [activities, setActivities] = useState('');
    const [medicationGiven, setMedicationGiven] = useState('');
    const [notes, setNotes] = useState('');
    const [savingLog, setSavingLog] = useState(false);

    // --- DI CHUYỂN USE EFFECT LÊN TRÊN ĐOẠN CHECK USER ---
    // Load bookings
    useEffect(() => {
        // Thêm kiểm tra ở đây để tránh fetch nếu không có user
        if (!user) return;

        const loadBookings = async () => {
            setLoading(true);
            setError(null);

            try {
                const { data: bookingData, error: bookingErr } = await supabase
                    .from('boarding_bookings')
                    .select(
                        `*,
                        pet:pets(*),
                        owner:profiles!owner_id(id,email,full_name,role)`
                    )
                    .eq('status', tab)
                    .order('check_in_date', { ascending: true });

                if (bookingErr) throw bookingErr;
                setBookings((bookingData as unknown as BookingWithDetails[]) || []);
            } catch (e: any) {
                setError(e?.message || 'Failed to load bookings');
            } finally {
                setLoading(false);
            }
        };

        void loadBookings();
    }, [tab, user]); // Thêm user vào dependency

    // --- BÂY GIỜ MỚI ĐƯỢC PHÉP RETURN SỚM ---
    if (!user || !['staff', 'admin'].includes(user.role)) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>Only staff and admin can access this dashboard.</div>
            </div>
        );
    }

    // --- CÁC HÀM XỬ LÝ (Handlers) ---
    const handleCheckIn = async (bookingId: string) => {
        setError(null);
        try {
            const { error: updateErr } = await supabase
                .from('boarding_bookings')
                .update({
                    status: 'checked_in',
                    staff_checked_in_by: user.id,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', bookingId);

            if (updateErr) throw updateErr;

            // Refresh
            setBookings((prev) => prev.filter((b) => b.id !== bookingId));
        } catch (e: any) {
            setError(e?.message || 'Failed to check in');
        }
    };

    const handleCheckOut = async (bookingId: string) => {
        setError(null);
        try {
            const { error: updateErr } = await supabase
                .from('boarding_bookings')
                .update({
                    status: 'completed',
                    staff_checked_out_by: user.id,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', bookingId);

            if (updateErr) throw updateErr;

            setBookings((prev) => prev.filter((b) => b.id !== bookingId));
        } catch (e: any) {
            setError(e?.message || 'Failed to check out');
        }
    };

    const openHealthModal = async (booking: BookingWithDetails) => {
        setSelectedBooking(booking);

        try {
            const { data: logs, error: logsErr } = await supabase
                .from('boarding_health_logs')
                .select('*')
                .eq('booking_id', booking.id)
                .order('log_date', { ascending: false });

            if (logsErr) throw logsErr;
            setHealthLogs((logs as BoardingHealthLog[]) || []);
        } catch (e: any) {
            setError(e?.message || 'Failed to load health logs');
        }

        setShowHealthModal(true);
    };

    const handleAddHealthLog = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBooking) return;

        setSavingLog(true);
        setError(null);

        try {
            const { error: insertErr } = await supabase.from('boarding_health_logs').insert({
                booking_id: selectedBooking.id,
                logged_by_staff_id: user.id,
                log_date: new Date().toISOString(),
                health_status: healthStatus,
                behavior_notes: behaviorNotes || null,
                food_intake: foodIntake || null,
                water_intake: waterIntake || null,
                activities: activities || null,
                medication_given: medicationGiven || null,
                notes: notes || null,
            });

            if (insertErr) throw insertErr;

            // Reset form and refresh logs
            setHealthStatus('normal');
            setBehaviorNotes('');
            setFoodIntake('');
            setWaterIntake('');
            setActivities('');
            setMedicationGiven('');
            setNotes('');

            // Refresh health logs
            const { data: logs } = await supabase
                .from('boarding_health_logs')
                .select('*')
                .eq('booking_id', selectedBooking.id)
                .order('log_date', { ascending: false });

            setHealthLogs((logs as BoardingHealthLog[]) || []);
        } catch (e: any) {
            setError(e?.message || 'Failed to add health log');
        } finally {
            setSavingLog(false);
        }
    };

    // --- RENDER UI ---
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Pet Boarding Management</h1>
                <p className={styles.subtitle}>Manage boarding bookings and pet health updates</p>
            </div>

            {error && <div className={styles.banner}>{error}</div>}

            {/* Tabs */}
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${tab === 'pending' ? styles.tabActive : ''}`}
                    onClick={() => setTab('pending')}
                >
                    Pending ({bookings.length})
                </button>
                <button
                    className={`${styles.tab} ${tab === 'checked_in' ? styles.tabActive : ''}`}
                    onClick={() => setTab('checked_in')}
                >
                    Checked In ({bookings.length})
                </button>
                <button
                    className={`${styles.tab} ${tab === 'completed' ? styles.tabActive : ''}`}
                    onClick={() => setTab('completed')}
                >
                    Completed ({bookings.length})
                </button>
            </div>

            {/* Bookings List */}
            {loading ? (
                <div className={styles.loading}>Loading...</div>
            ) : bookings.length === 0 ? (
                <div className={styles.empty}>No bookings in this category</div>
            ) : (
                <div className={styles.bookingsList}>
                    {bookings.map((booking) => (
                        <div key={booking.id} className={styles.bookingCard}>
                            <div className={styles.bookingHeader}>
                                <div>
                                    <h3 className={styles.petName}>{booking.pet?.name || 'Unknown'}</h3>
                                    <p className={styles.ownerName}>Owner: {booking.owner?.full_name}</p>
                                </div>
                                <div className={styles.dates}>
                                    <small>
                                        {new Date(booking.check_in_date).toLocaleDateString()} →{' '}
                                        {new Date(booking.check_out_date).toLocaleDateString()}
                                    </small>
                                </div>
                            </div>

                            <div className={styles.bookingBody}>
                                <div className={styles.info}>
                                    <span>Status:</span>
                                    <strong>{booking.status.toUpperCase()}</strong>
                                </div>
                                {booking.special_notes && (
                                    <div className={styles.info}>
                                        <span>Notes:</span>
                                        <p>{booking.special_notes}</p>
                                    </div>
                                )}
                                {booking.dietary_requirements && (
                                    <div className={styles.info}>
                                        <span>Diet:</span>
                                        <p>{booking.dietary_requirements}</p>
                                    </div>
                                )}
                                {booking.medical_requirements && (
                                    <div className={styles.info}>
                                        <span>Medical:</span>
                                        <p>{booking.medical_requirements}</p>
                                    </div>
                                )}
                            </div>

                            <div className={styles.actions}>
                                <button
                                    className={styles.btnSecondary}
                                    onClick={() => openHealthModal(booking)}
                                >
                                    📊 Health Updates
                                </button>

                                {tab === 'pending' && (
                                    <button
                                        className={styles.btnPrimary}
                                        onClick={() => handleCheckIn(booking.id)}
                                    >
                                        ✓ Check In
                                    </button>
                                )}

                                {tab === 'checked_in' && (
                                    <button
                                        className={styles.btnPrimary}
                                        onClick={() => handleCheckOut(booking.id)}
                                    >
                                        ← Check Out
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Health Modal */}
            {showHealthModal && selectedBooking && (
                <div className={styles.modal} onClick={() => setShowHealthModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Health Updates: {selectedBooking.pet?.name}</h2>
                            <button
                                className={styles.closeBtn}
                                onClick={() => setShowHealthModal(false)}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Health Logs History */}
                        {healthLogs.length > 0 && (
                            <div className={styles.logsHistory}>
                                <h3>Recent Logs</h3>
                                {healthLogs.map((log) => (
                                    <div key={log.id} className={styles.logEntry}>
                                        <div className={styles.logDate}>
                                            {new Date(log.log_date).toLocaleString()}
                                        </div>
                                        <div className={styles.logStatus}>
                                            Status: <strong>{log.health_status || 'N/A'}</strong>
                                        </div>
                                        {log.behavior_notes && <p>Behavior: {log.behavior_notes}</p>}
                                        {log.food_intake && <p>Food: {log.food_intake}</p>}
                                        {log.water_intake && <p>Water: {log.water_intake}</p>}
                                        {log.activities && <p>Activities: {log.activities}</p>}
                                        {log.medication_given && <p>Medication: {log.medication_given}</p>}
                                        {log.notes && <p className={styles.notes}>{log.notes}</p>}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add New Log */}
                        <form onSubmit={handleAddHealthLog} className={styles.logForm}>
                            <h3>Add Health Update</h3>

                            <div className={styles.field}>
                                <label>Health Status *</label>
                                <select
                                    value={healthStatus}
                                    onChange={(e) =>
                                        setHealthStatus(
                                            e.target.value as 'normal' | 'mild_issue' | 'serious_issue'
                                        )
                                    }
                                    disabled={savingLog}
                                >
                                    <option value="normal">Normal</option>
                                    <option value="mild_issue">Mild Issue</option>
                                    <option value="serious_issue">Serious Issue</option>
                                </select>
                            </div>

                            <div className={styles.grid2}>
                                <div className={styles.field}>
                                    <label>Food Intake</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Full meal, half meal"
                                        value={foodIntake}
                                        onChange={(e) => setFoodIntake(e.target.value)}
                                        disabled={savingLog}
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label>Water Intake</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Normal, reduced"
                                        value={waterIntake}
                                        onChange={(e) => setWaterIntake(e.target.value)}
                                        disabled={savingLog}
                                    />
                                </div>
                            </div>

                            <div className={styles.field}>
                                <label>Behavior & Activities</label>
                                <textarea
                                    placeholder="Describe behavior, activity level, mood..."
                                    value={behaviorNotes}
                                    onChange={(e) => setBehaviorNotes(e.target.value)}
                                    disabled={savingLog}
                                />
                            </div>

                            <div className={styles.field}>
                                <label>Medication Given</label>
                                <textarea
                                    placeholder="List any medications given today..."
                                    value={medicationGiven}
                                    onChange={(e) => setMedicationGiven(e.target.value)}
                                    disabled={savingLog}
                                />
                            </div>

                            <div className={styles.field}>
                                <label>Additional Notes</label>
                                <textarea
                                    placeholder="Any other observations or concerns..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    disabled={savingLog}
                                />
                            </div>

                            <button type="submit" className={styles.btnPrimary} disabled={savingLog}>
                                {savingLog ? 'Saving...' : 'Add Log'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}