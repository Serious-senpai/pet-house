'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { BoardingBooking, Pet, UserProfile } from '@/types';
import styles from './AdminBoardingApproval.module.css';

interface BookingWithDetails extends BoardingBooking {
    pet?: Pet | null;
    owner?: UserProfile | null;
}

export default function AdminBoardingApproval() {
    const { user } = useAuth();

    // --- KHAI BÁO STATE (Giữ nguyên) ---
    const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [actionId, setActionId] = useState<string | null>(null);

    // Rejection modal
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    // --- DI CHUYỂN USE EFFECT LÊN TRÊN ĐOẠN CHECK USER ---
    // Load pending bookings
    useEffect(() => {
        // Thêm kiểm tra này để tránh gọi API khi chưa có user
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
                        owner:profiles!owner_id(id,email,full_name,phone,address)`
                    )
                    .eq('status', 'pending')
                    .order('created_at', { ascending: true });

                if (bookingErr) throw bookingErr;
                setBookings((bookingData as unknown as BookingWithDetails[]) || []);
            } catch (e: any) {
                setError(e?.message || 'Failed to load bookings');
            } finally {
                setLoading(false);
            }
        };

        void loadBookings();
    }, [user]); // Thêm user vào dependency

    // --- BÂY GIỜ MỚI ĐƯỢC PHÉP RETURN SỚM ---
    if (!user || !['admin', 'staff'].includes(user.role)) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>Only admin and staff can access this page.</div>
            </div>
        );
    }

    // --- CÁC HÀM XỬ LÝ (Handlers) ---
    const handleApprove = async (bookingId: string) => {
        setError(null);
        setActionId(bookingId);

        try {
            const { error: updateErr } = await supabase
                .from('boarding_bookings')
                .update({
                    status: 'confirmed',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', bookingId);

            if (updateErr) throw updateErr;

            // Remove from list
            setBookings((prev) => prev.filter((b) => b.id !== bookingId));
        } catch (e: any) {
            setError(e?.message || 'Failed to approve booking');
        } finally {
            setActionId(null);
        }
    };

    const handleReject = async () => {
        if (!selectedBooking || !rejectionReason.trim()) {
            setError('Please provide a rejection reason');
            return;
        }

        setError(null);
        setActionId(selectedBooking.id);

        try {
            const { error: updateErr } = await supabase
                .from('boarding_bookings')
                .update({
                    status: 'cancelled',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', selectedBooking.id);

            if (updateErr) throw updateErr;

            // TODO: Send notification to owner about rejection
            alert(`Booking rejected. Owner should be notified of reason: "${rejectionReason}"`);

            // Remove from list
            setBookings((prev) => prev.filter((b) => b.id !== selectedBooking.id));
            setShowRejectModal(false);
            setSelectedBooking(null);
            setRejectionReason('');
        } catch (e: any) {
            setError(e?.message || 'Failed to reject booking');
        } finally {
            setActionId(null);
        }
    };

    const calcDays = (checkIn: string, checkOut: string): number => {
        const inDate = new Date(checkIn);
        const outDate = new Date(checkOut);
        return Math.ceil((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24));
    };

    // --- RENDER UI ---
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Booking Approvals</h1>
                <p className={styles.subtitle}>Review and approve pending pet boarding reservations</p>
            </div>

            {error && <div className={styles.banner}>{error}</div>}

            {loading ? (
                <div className={styles.loading}>Loading...</div>
            ) : bookings.length === 0 ? (
                <div className={styles.empty}>
                    <p>✓ All pending bookings have been reviewed!</p>
                </div>
            ) : (
                <div className={styles.bookingsList}>
                    {bookings.map((booking) => (
                        <div key={booking.id} className={styles.bookingCard}>
                            <div className={styles.cardHeader}>
                                <div className={styles.petInfo}>
                                    <h3 className={styles.petName}>🐾 {booking.pet?.name || 'Unknown'}</h3>
                                    <p className={styles.breed}>{booking.pet?.breed || 'Unknown breed'}</p>
                                </div>
                                <div className={styles.bookingDate}>
                                    <small>Requested: {new Date(booking.created_at || '').toLocaleDateString()}</small>
                                </div>
                            </div>

                            <div className={styles.ownerCard}>
                                <h4 className={styles.ownerTitle}>Owner Information</h4>
                                <div className={styles.ownerDetails}>
                                    <div className={styles.detailRow}>
                                        <span>Name:</span>
                                        <strong>{booking.owner?.full_name}</strong>
                                    </div>
                                    <div className={styles.detailRow}>
                                        <span>Email:</span>
                                        <span className={styles.email}>{booking.owner?.email}</span>
                                    </div>
                                    {booking.owner?.phone && (
                                        <div className={styles.detailRow}>
                                            <span>Phone:</span>
                                            <span>{booking.owner.phone}</span>
                                        </div>
                                    )}
                                    {booking.owner?.address && (
                                        <div className={styles.detailRow}>
                                            <span>Address:</span>
                                            <span>{booking.owner.address}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={styles.bookingDetails}>
                                <h4 className={styles.detailsTitle}>Booking Details</h4>

                                <div className={styles.detailRow}>
                                    <span>Check-in:</span>
                                    <strong>{new Date(booking.check_in_date).toLocaleDateString()}</strong>
                                </div>

                                <div className={styles.detailRow}>
                                    <span>Check-out:</span>
                                    <strong>{new Date(booking.check_out_date).toLocaleDateString()}</strong>
                                </div>

                                <div className={styles.detailRow}>
                                    <span>Duration:</span>
                                    <strong>{calcDays(booking.check_in_date, booking.check_out_date)} days</strong>
                                </div>

                                <div className={styles.detailRow}>
                                    <span>Price/Day:</span>
                                    <strong>${booking.price_per_day.toFixed(2)}</strong>
                                </div>

                                <div className={styles.totalPrice}>
                                    <span>Total:</span>
                                    <strong>${booking.total_price.toFixed(2)}</strong>
                                </div>

                                {booking.dietary_requirements && (
                                    <div className={styles.requirement}>
                                        <strong>🍽️ Dietary:</strong>
                                        <p>{booking.dietary_requirements}</p>
                                    </div>
                                )}

                                {booking.medical_requirements && (
                                    <div className={styles.requirement}>
                                        <strong>💊 Medical:</strong>
                                        <p>{booking.medical_requirements}</p>
                                    </div>
                                )}

                                {booking.special_notes && (
                                    <div className={styles.requirement}>
                                        <strong>📝 Notes:</strong>
                                        <p>{booking.special_notes}</p>
                                    </div>
                                )}
                            </div>

                            <div className={styles.actions}>
                                <button
                                    className={styles.btnApprove}
                                    onClick={() => handleApprove(booking.id)}
                                    disabled={actionId === booking.id}
                                >
                                    {actionId === booking.id ? 'Processing...' : '✓ Approve Booking'}
                                </button>

                                <button
                                    className={styles.btnReject}
                                    onClick={() => {
                                        setSelectedBooking(booking);
                                        setShowRejectModal(true);
                                    }}
                                    disabled={actionId === booking.id}
                                >
                                    ✗ Reject Booking
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Rejection Modal */}
            {showRejectModal && selectedBooking && (
                <div className={styles.modal} onClick={() => setShowRejectModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Reject Booking</h2>
                            <button
                                className={styles.closeBtn}
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setSelectedBooking(null);
                                    setRejectionReason('');
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            <p>
                                Are you sure you want to reject the booking for{' '}
                                <strong>{selectedBooking.pet?.name}</strong>?
                            </p>

                            <div className={styles.field}>
                                <label>Reason for Rejection *</label>
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="e.g., No available rooms for selected dates, pet allergies concern, capacity full, etc."
                                    rows={4}
                                />
                            </div>

                            <div className={styles.modalActions}>
                                <button
                                    className={styles.btnCancel}
                                    onClick={() => {
                                        setShowRejectModal(false);
                                        setSelectedBooking(null);
                                        setRejectionReason('');
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className={styles.btnConfirmReject}
                                    onClick={handleReject}
                                    disabled={!rejectionReason.trim()}
                                >
                                    Confirm Rejection
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}