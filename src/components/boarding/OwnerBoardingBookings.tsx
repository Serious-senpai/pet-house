'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { BoardingBooking, Pet, BoardingHealthLog } from '@/types';
import styles from './OwnerBoardingBookings.module.css';

interface BookingWithDetails extends BoardingBooking {
    pet?: Pet | null;
}

export default function OwnerBoardingBookings() {
    const { user } = useAuth();
    const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Health log viewer
    const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
    const [healthLogs, setHealthLogs] = useState<BoardingHealthLog[]>([]);
    const [showLogs, setShowLogs] = useState(false);

    // Load user's bookings
    useEffect(() => {
        if (!user || user.role !== 'pet_owner') {
            return;
        }
        const loadBookings = async () => {
            setLoading(true);
            setError(null);

            try {
                const { data: bookingData, error: bookingErr } = await supabase
                    .from('boarding_bookings')
                    .select('*, pet:pets(*)')
                    .eq('owner_id', user.id)
                    .order('check_in_date', { ascending: false });

                if (bookingErr) throw bookingErr;
                setBookings((bookingData as unknown as BookingWithDetails[]) || []);
            } catch (err: unknown) {
                const e = err as Error;
                setError(e?.message || 'Failed to load bookings');
            } finally {
                setLoading(false);
            }
        };

        void loadBookings();
    }, [user]);

    if (!user || user.role !== 'pet_owner') {
        return (
            <div className={styles.container}>
                <div className={styles.error}>Only pet owners can view booking history.</div>
            </div>
        );
    }

    const handleViewHealthLogs = async (booking: BookingWithDetails) => {
        setSelectedBooking(booking);

        try {
            const { data: logs, error: logsErr } = await supabase
                .from('boarding_health_logs')
                .select('*')
                .eq('booking_id', booking.id)
                .order('log_date', { ascending: false });

            if (logsErr) throw logsErr;
            setHealthLogs((logs as BoardingHealthLog[]) || []);
        } catch (err: unknown) {
            const e = err as Error;
            setError(e?.message || 'Failed to load health logs');
        }

        setShowLogs(true);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className={styles.badgePending}>⏳ Pending</span>;
            case 'confirmed':
                return <span className={styles.badgeConfirmed}>✓ Confirmed</span>;
            case 'checked_in':
                return <span className={styles.badgeCheckedIn}>🏠 Checked In</span>;
            case 'completed':
                return <span className={styles.badgeCompleted}>✓ Completed</span>;
            case 'cancelled':
                return <span className={styles.badgeCancelled}>✗ Cancelled</span>;
            default:
                return <span>{status}</span>;
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>My Boarding Bookings</h1>
                <p className={styles.subtitle}>View and manage your pet&apos;s boarding reservations</p>
            </div>

            {error && <div className={styles.banner}>{error}</div>}

            {loading ? (
                <div className={styles.loading}>Loading...</div>
            ) : bookings.length === 0 ? (
                <div className={styles.empty}>
                    <p>No boarding bookings yet.</p>
                </div>
            ) : (
                <div className={styles.bookingsList}>
                    {bookings.map((booking) => (
                        <div key={booking.id} className={styles.bookingCard}>
                            <div className={styles.cardHeader}>
                                <div>
                                    <h3 className={styles.petName}>{booking.pet?.name || 'Unknown'}</h3>
                                    <p className={styles.breed}>{booking.pet?.breed || 'Unknown breed'}</p>
                                </div>
                                <div className={styles.status}>{getStatusBadge(booking.status)}</div>
                            </div>

                            <div className={styles.cardBody}>
                                <div className={styles.infoRow}>
                                    <span className={styles.label}>Check-in:</span>
                                    <span>{new Date(booking.check_in_date).toLocaleDateString()}</span>
                                </div>

                                <div className={styles.infoRow}>
                                    <span className={styles.label}>Check-out:</span>
                                    <span>{new Date(booking.check_out_date).toLocaleDateString()}</span>
                                </div>

                                <div className={styles.infoRow}>
                                    <span className={styles.label}>Total Price:</span>
                                    <span className={styles.price}>${booking.total_price.toFixed(2)}</span>
                                </div>

                                {booking.special_notes && (
                                    <div className={styles.notes}>
                                        <span className={styles.label}>Notes:</span>
                                        <p>{booking.special_notes}</p>
                                    </div>
                                )}

                                {booking.dietary_requirements && (
                                    <div className={styles.notes}>
                                        <span className={styles.label}>Diet:</span>
                                        <p>{booking.dietary_requirements}</p>
                                    </div>
                                )}

                                {booking.medical_requirements && (
                                    <div className={styles.notes}>
                                        <span className={styles.label}>Medical:</span>
                                        <p>{booking.medical_requirements}</p>
                                    </div>
                                )}
                            </div>

                            {booking.status === 'checked_in' && (
                                <button
                                    className={styles.btnViewLogs}
                                    onClick={() => handleViewHealthLogs(booking)}
                                >
                                    📊 View Health Updates
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Health Logs Modal */}
            {showLogs && selectedBooking && (
                <div className={styles.modal} onClick={() => setShowLogs(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Health Updates: {selectedBooking.pet?.name}</h2>
                            <button className={styles.closeBtn} onClick={() => setShowLogs(false)}>
                                ✕
                            </button>
                        </div>

                        {healthLogs.length === 0 ? (
                            <div className={styles.empty}>No health updates yet.</div>
                        ) : (
                            <div className={styles.logsList}>
                                {healthLogs.map((log) => (
                                    <div key={log.id} className={styles.logItem}>
                                        <div className={styles.logTime}>
                                            {new Date(log.log_date).toLocaleString()}
                                        </div>

                                        {log.health_status && (
                                            <div className={styles.logField}>
                                                <strong>Health Status:</strong>
                                                <span
                                                    className={
                                                        log.health_status === 'normal'
                                                            ? styles.healthNormal
                                                            : log.health_status === 'mild_issue'
                                                              ? styles.healthMild
                                                              : styles.healthSerious
                                                    }
                                                >
                                                    {log.health_status.replace(/_/g, ' ').toUpperCase()}
                                                </span>
                                            </div>
                                        )}

                                        {log.behavior_notes && (
                                            <div className={styles.logField}>
                                                <strong>Behavior:</strong>
                                                <p>{log.behavior_notes}</p>
                                            </div>
                                        )}

                                        {log.food_intake && (
                                            <div className={styles.logField}>
                                                <strong>Food Intake:</strong>
                                                <p>{log.food_intake}</p>
                                            </div>
                                        )}

                                        {log.water_intake && (
                                            <div className={styles.logField}>
                                                <strong>Water Intake:</strong>
                                                <p>{log.water_intake}</p>
                                            </div>
                                        )}

                                        {log.activities && (
                                            <div className={styles.logField}>
                                                <strong>Activities:</strong>
                                                <p>{log.activities}</p>
                                            </div>
                                        )}

                                        {log.medication_given && (
                                            <div className={styles.logField}>
                                                <strong>Medication:</strong>
                                                <p>{log.medication_given}</p>
                                            </div>
                                        )}

                                        {log.notes && (
                                            <div className={styles.logField}>
                                                <strong>Notes:</strong>
                                                <p className={styles.additionalNotes}>{log.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
