'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { BoardingRoom, Pet } from '@/types';
import styles from './BoardingRegistration.module.css';

// function addDays(date: Date, days: number) {
//     const result = new Date(date);
//     result.setDate(result.getDate() + days);
//     return result;
// }

function calcDays(checkIn: string, checkOut: string): number {
    if (!checkIn || !checkOut) return 0;
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    return Math.ceil((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24));
}

function calcTotal(pricePerDay: number, days: number): number {
    return pricePerDay * Math.max(1, days);
}

export default function BoardingRegistration() {
    const { user } = useAuth();

    const [step, setStep] = useState<1 | 2 | 3>(1); // 1: select pet & dates, 2: room selection, 3: confirmation
    const [pets, setPets] = useState<Pet[]>([]);
    const [rooms, setRooms] = useState<BoardingRoom[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [selectedPetId, setSelectedPetId] = useState('');
    const [checkInDate, setCheckInDate] = useState('');
    const [checkOutDate, setCheckOutDate] = useState('');
    const [selectedRoomId, setSelectedRoomId] = useState('');
    const [specialNotes, setSpecialNotes] = useState('');
    const [dietaryReq, setDietaryReq] = useState('');
    const [medicalReq, setMedicalReq] = useState('');

    // Confirmations for step 3
    const [confirmedTerms, setConfirmedTerms] = useState(false);
    const [confirmedDates, setConfirmedDates] = useState(false);
    const [confirmedRequirements, setConfirmedRequirements] = useState(false);

    const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
    const daysCount = calcDays(checkInDate, checkOutDate);
    const totalPrice = selectedRoom ? calcTotal(selectedRoom.price_per_day, daysCount) : 0;

    const allConfirmed = confirmedTerms && confirmedDates && confirmedRequirements;

    // Load user's pets on mount
    useEffect(() => {
        if (!user || user.role !== 'pet_owner') return;

        const loadPets = async () => {
            setLoading(true);
            try {
                const { data, error: err } = await supabase
                    .from('pets')
                    .select('*')
                    .eq('owner_id', user.id)
                    .order('created_at', { ascending: false });

                if (err) throw err;
                setPets((data as Pet[]) || []);
            } catch (err: unknown) {
                const e = err as Error;
                setError(e?.message || 'Failed to load pets');
            } finally {
                setLoading(false);
            }
        };

        void loadPets();
    }, [user]);

    // Load available rooms
    const loadRooms = useCallback(async () => {
        if (!checkInDate || !checkOutDate) return;

        setLoading(true);
        setError(null);
        try {
            // Get all available rooms
            const { data: roomData, error: roomErr } = await supabase
                .from('boarding_rooms')
                .select('*')
                .eq('is_available', true)
                .order('room_type', { ascending: true });

            if (roomErr) throw roomErr;
            setRooms((roomData as BoardingRoom[]) || []);
        } catch (err: unknown) {
            const e = err as Error;
            setError(e?.message || 'Failed to load rooms');
        } finally {
            setLoading(false);
        }
    }, [checkInDate, checkOutDate]);

    const handleStepOne = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!selectedPetId || !checkInDate || !checkOutDate) {
            setError('Please select pet and dates');
            return;
        }

        const inDate = new Date(checkInDate);
        const outDate = new Date(checkOutDate);

        if (outDate <= inDate) {
            setError('Check-out date must be after check-in date');
            return;
        }

        // Proceed to room selection
        await loadRooms();
        setStep(2);
    };

    const handleStepTwo = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!selectedRoomId) {
            setError('Please select a room');
            return;
        }

        setStep(3);
    };

    const handleConfirmBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!user || !selectedPetId || !selectedRoom) return;

        setLoading(true);
        try {
            const { error: insertErr } = await supabase.from('boarding_bookings').insert({
                owner_id: user.id,
                pet_id: selectedPetId,
                room_id: selectedRoomId,
                check_in_date: new Date(checkInDate).toISOString(),
                check_out_date: new Date(checkOutDate).toISOString(),
                price_per_day: selectedRoom.price_per_day,
                total_price: totalPrice,
                special_notes: specialNotes || null,
                dietary_requirements: dietaryReq || null,
                medical_requirements: medicalReq || null,
                status: 'pending',
            });

            if (insertErr) throw insertErr;

            // Reset and show success
            alert('Booking created successfully! Waiting for confirmation.');
            setStep(1);
            setSelectedPetId('');
            setCheckInDate('');
            setCheckOutDate('');
            setSelectedRoomId('');
            setSpecialNotes('');
            setDietaryReq('');
            setMedicalReq('');
        } catch (err: unknown) {
            const e = err as Error;
            setError(e?.message || 'Failed to create booking');
        } finally {
            setLoading(false);
        }
    };

    if (!user || user.role !== 'pet_owner') {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.error}>Only pet owners can register for boarding services.</div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.title}>Pet Boarding Registration</h1>

                {error && <div className={styles.banner}>{error}</div>}

                {/* Step 1: Pet & Dates */}
                {step === 1 && (
                    <form onSubmit={handleStepOne} className={styles.form}>
                        <h2 className={styles.stepTitle}>Step 1: Select Pet & Dates</h2>

                        <div className={styles.field}>
                            <label className={styles.label}>Your Pet *</label>
                            {pets.length === 0 ? (
                                <div className={styles.info}>You have no pets. Please add a pet first.</div>
                            ) : (
                                <select
                                    className={styles.input}
                                    value={selectedPetId}
                                    onChange={(e) => setSelectedPetId(e.target.value)}
                                    disabled={loading}
                                >
                                    <option value="">-- Select Pet --</option>
                                    {pets.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} ({p.breed || 'Unknown breed'})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className={styles.grid2}>
                            <div className={styles.field}>
                                <label className={styles.label}>Check-in Date *</label>
                                <input
                                    type="date"
                                    className={styles.input}
                                    value={checkInDate}
                                    onChange={(e) => setCheckInDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    disabled={loading}
                                />
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>Check-out Date *</label>
                                <input
                                    type="date"
                                    className={styles.input}
                                    value={checkOutDate}
                                    onChange={(e) => setCheckOutDate(e.target.value)}
                                    min={checkInDate || new Date().toISOString().split('T')[0]}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {checkInDate && checkOutDate && (
                            <div className={styles.info}>
                                Duration: <strong>{daysCount}</strong> day(s)
                            </div>
                        )}

                        <button type="submit" className={styles.btnPrimary} disabled={loading}>
                            {loading ? 'Loading...' : 'Next: View Available Rooms'}
                        </button>
                    </form>
                )}

                {/* Step 2: Room Selection */}
                {step === 2 && (
                    <form onSubmit={handleStepTwo} className={styles.form}>
                        <h2 className={styles.stepTitle}>Step 2: Select Room</h2>

                        <div className={styles.info}>
                            Duration: <strong>{daysCount}</strong> day(s) | Checking availability...
                        </div>

                        {rooms.length === 0 ? (
                            <div className={styles.error}>No available rooms for selected dates</div>
                        ) : (
                            <div className={styles.roomGrid}>
                                {rooms.map((room) => (
                                    <div
                                        key={room.id}
                                        className={`${styles.roomCard} ${selectedRoomId === room.id ? styles.roomCardSelected : ''
                                            }`}
                                        onClick={() => setSelectedRoomId(room.id)}
                                    >
                                        <h3 className={styles.roomName}>{room.name}</h3>
                                        <p className={styles.roomType}>{room.room_type.toUpperCase()}</p>
                                        <p className={styles.roomDesc}>{room.description}</p>
                                        <div className={styles.roomPrice}>
                                            ${room.price_per_day}/day
                                        </div>
                                        <div className={styles.roomAvail}>
                                            Available: {room.available_count}/{room.capacity}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className={styles.buttons}>
                            <button
                                type="button"
                                className={styles.btnSecondary}
                                onClick={() => setStep(1)}
                                disabled={loading}
                            >
                                Back
                            </button>
                            <button type="submit" className={styles.btnPrimary} disabled={loading || !selectedRoomId}>
                                Next: Confirm Booking
                            </button>
                        </div>
                    </form>
                )}

                {/* Step 3: Confirmation & Payment */}
                {step === 3 && selectedRoom && (
                    <form onSubmit={handleConfirmBooking} className={styles.form}>
                        <h2 className={styles.stepTitle}>Step 3: Confirm & Book</h2>

                        <div className={styles.summary}>
                            <div className={styles.summaryItem}>
                                <span>Pet:</span>
                                <strong>{pets.find((p) => p.id === selectedPetId)?.name}</strong>
                            </div>
                            <div className={styles.summaryItem}>
                                <span>Room:</span>
                                <strong>{selectedRoom.name}</strong>
                            </div>
                            <div className={styles.summaryItem}>
                                <span>Check-in:</span>
                                <strong>{new Date(checkInDate).toLocaleDateString()}</strong>
                            </div>
                            <div className={styles.summaryItem}>
                                <span>Check-out:</span>
                                <strong>{new Date(checkOutDate).toLocaleDateString()}</strong>
                            </div>
                            <div className={styles.summaryItem}>
                                <span>Duration:</span>
                                <strong>{daysCount} days</strong>
                            </div>
                            <div className={styles.summaryDivider}></div>
                            <div className={styles.summaryItem} style={{ fontSize: '1.1em' }}>
                                <span>Total Price:</span>
                                <strong className={styles.totalPrice}>${totalPrice.toFixed(2)}</strong>
                            </div>
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>Dietary Requirements</label>
                            <textarea
                                className={styles.textarea}
                                value={dietaryReq}
                                onChange={(e) => setDietaryReq(e.target.value)}
                                placeholder="e.g., Low-fat diet, allergies, special food..."
                                disabled={loading}
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>Medical Requirements</label>
                            <textarea
                                className={styles.textarea}
                                value={medicalReq}
                                onChange={(e) => setMedicalReq(e.target.value)}
                                placeholder="e.g., Medications, allergies, health conditions..."
                                disabled={loading}
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>Special Notes</label>
                            <textarea
                                className={styles.textarea}
                                value={specialNotes}
                                onChange={(e) => setSpecialNotes(e.target.value)}
                                placeholder="Any other notes or requests..."
                                disabled={loading}
                            />
                        </div>

                        {/* Confirmation Checkboxes */}
                        <div className={styles.confirmSection}>
                            <h3 className={styles.confirmTitle}>Please confirm the following:</h3>

                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={confirmedDates}
                                    onChange={(e) => setConfirmedDates(e.target.checked)}
                                    disabled={loading}
                                />
                                <span>
                                    I confirm the check-in date of{' '}
                                    <strong>{new Date(checkInDate).toLocaleDateString()}</strong> and check-out
                                    date of <strong>{new Date(checkOutDate).toLocaleDateString()}</strong>
                                </span>
                            </label>

                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={confirmedRequirements}
                                    onChange={(e) => setConfirmedRequirements(e.target.checked)}
                                    disabled={loading}
                                />
                                <span>
                                    I have provided accurate dietary and medical requirements for my pet
                                </span>
                            </label>

                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={confirmedTerms}
                                    onChange={(e) => setConfirmedTerms(e.target.checked)}
                                    disabled={loading}
                                />
                                <span>
                                    I understand the total cost is <strong>${totalPrice.toFixed(2)}</strong> and
                                    agree to the boarding terms & conditions
                                </span>
                            </label>
                        </div>

                        <div className={styles.buttons}>
                            <button
                                type="button"
                                className={styles.btnSecondary}
                                onClick={() => setStep(2)}
                                disabled={loading}
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                className={styles.btnPrimary}
                                disabled={loading || !allConfirmed}
                            >
                                {loading ? 'Processing...' : 'Confirm & Book'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
