'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import styles from './CreateAppointmentModal.module.css';

type PetOption = { id: string; name: string | null };
type VetOption = { id: string; full_name: string | null };

type ServiceType = 'checkup' | 'vaccination' | 'grooming' | 'boarding';

const SERVICE_OPTIONS: { value: ServiceType; label: string }[] = [
    { value: 'checkup', label: 'Checkup' },
    { value: 'vaccination', label: 'Vaccination' },
    { value: 'grooming', label: 'Grooming' },
    { value: 'boarding', label: 'Boarding' },
];

function addMinutes(date: Date, minutes: number) {
    return new Date(date.getTime() + minutes * 60_000);
}

export default function CreateAppointmentModal({
    isOpen,
    onClose,
    onCreated,
}: {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}) {
    const { user } = useAuth();

    const [pets, setPets] = useState<PetOption[]>([]);
    const [vets, setVets] = useState<VetOption[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(false);
    const loadedRef = useRef(false);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [petId, setPetId] = useState('');
    const [serviceType, setServiceType] = useState<ServiceType>('checkup');
    const [vetId, setVetId] = useState<string>(''); // optional
    const [start, setStart] = useState(''); // datetime-local
    const [durationMin, setDurationMin] = useState<number>(30);
    const [note, setNote] = useState('');

    const canCreate = user?.role === 'pet_owner';

    const defaultStartValue = useMemo(() => {
        // default: now + 30 minutes, rounded to next 5 minutes
        const now = new Date();
        const plus = addMinutes(now, 30);
        const rounded = new Date(Math.ceil(plus.getTime() / (5 * 60_000)) * (5 * 60_000));
        // datetime-local needs YYYY-MM-DDTHH:mm
        const pad = (n: number) => String(n).padStart(2, '0');
        const y = rounded.getFullYear();
        const m = pad(rounded.getMonth() + 1);
        const d = pad(rounded.getDate());
        const hh = pad(rounded.getHours());
        const mm = pad(rounded.getMinutes());
        return `${y}-${m}-${d}T${hh}:${mm}`;
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        setError(null);

        if (!start) setStart(defaultStartValue);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            loadedRef.current = false;
            return;
        }
        if (!user) return;

        const load = async () => {
            setLoadingOptions(true);
            setError(null);

            try {
                // Load pets owned by user
                const { data: petData, error: petErr } = await supabase
                    .from('pets')
                    .select('id,name')
                    .eq('owner_id', user.id)
                    .order('created_at', { ascending: false });

                if (petErr) throw petErr;

                const petOptions = (petData ?? []) as PetOption[];
                setPets(petOptions);

                // default pet selection
                if (!petId && petOptions.length > 0) setPetId(petOptions[0].id);

                // Load vets
                const { data: vetData, error: vetErr } = await supabase
                    .from('profiles')
                    .select('id,full_name')
                    .eq('role', 'vet')
                    .order('full_name', { ascending: true });

                if (vetErr) throw vetErr;
                setVets((vetData ?? []) as VetOption[]);
            } catch (e: any) {
                setError(e?.message || 'Failed to load options.');
            } finally {
                setLoadingOptions(false);
                loadedRef.current = true;
            }
        };

        // Only load once per modal open
        if (!loadedRef.current) {
            void load();
        }
    }, [isOpen, user?.id]);

    if (!isOpen) return null;

    const resetAndClose = () => {
        setError(null);
        setSaving(false);
        loadedRef.current = false;
        onClose();
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!canCreate) {
            setError('Only pet owners can create appointments.');
            return;
        }

        setError(null);

        if (!petId) {
            setError('Please select a pet.');
            return;
        }
        if (!start) {
            setError('Please select date & time.');
            return;
        }

        const startDate = new Date(start); // local time
        if (Number.isNaN(startDate.getTime())) {
            setError('Invalid start date/time.');
            return;
        }

        const endDate = addMinutes(startDate, Math.max(5, durationMin || 30));

        setSaving(true);
        try {
            const payload: any = {
                owner_id: user.id,
                pet_id: petId,
                service_type: serviceType,
                start_time: startDate.toISOString(),
                end_time: endDate.toISOString(),
                status: 'pending',
                owner_note: note.trim() ? note.trim() : null,
            };

            // optional vet assignment
            if (vetId) payload.vet_id = vetId;

            const { error: insErr } = await supabase.from('appointments').insert(payload);
            if (insErr) throw insErr;

            onCreated();
            resetAndClose();
        } catch (e: any) {
            setError(e?.message || 'Failed to create appointment.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={resetAndClose}>
            <div className={styles.modal} onClick={(ev) => ev.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.title}>New Appointment</div>
                    <button className={styles.close} onClick={resetAndClose} aria-label="Close">
                        ✕
                    </button>
                </div>

                <div className={styles.body}>
                    {!canCreate && (
                        <div className={styles.bannerError}>
                            Only Pet Owner accounts can create appointments.
                        </div>
                    )}

                    {error && <div className={styles.bannerError}>{error}</div>}

                    {loadingOptions ? (
                        <div className={styles.loading}>Loading…</div>
                    ) : pets.length === 0 ? (
                        <div className={styles.empty}>
                            You have no pets yet. Please add a pet first.
                        </div>
                    ) : (
                        <form className={styles.form} onSubmit={handleCreate}>
                            <div className={styles.grid}>
                                <div className={styles.field}>
                                    <label className={styles.label}>Pet *</label>
                                    <select
                                        className={styles.input}
                                        value={petId}
                                        onChange={(e) => setPetId(e.target.value)}
                                        disabled={saving || !canCreate}
                                    >
                                        {pets.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name ?? '(Unnamed)'}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className={styles.field}>
                                    <label className={styles.label}>Service *</label>
                                    <select
                                        className={styles.input}
                                        value={serviceType}
                                        onChange={(e) => setServiceType(e.target.value as ServiceType)}
                                        disabled={saving || !canCreate}
                                    >
                                        {SERVICE_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className={styles.field}>
                                    <label className={styles.label}>Date & time *</label>
                                    <input
                                        className={styles.input}
                                        type="datetime-local"
                                        value={start}
                                        onChange={(e) => setStart(e.target.value)}
                                        disabled={saving || !canCreate}
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label className={styles.label}>Duration (min)</label>
                                    <input
                                        className={styles.input}
                                        type="number"
                                        min={5}
                                        step={5}
                                        value={durationMin}
                                        onChange={(e) => setDurationMin(Number(e.target.value))}
                                        disabled={saving || !canCreate}
                                    />
                                </div>

                                <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                                    <label className={styles.label}>Preferred Vet (optional)</label>
                                    <select
                                        className={styles.input}
                                        value={vetId}
                                        onChange={(e) => setVetId(e.target.value)}
                                        disabled={saving || !canCreate}
                                    >
                                        <option value="">Auto-assign / Not specified</option>
                                        {vets.map((v) => (
                                            <option key={v.id} value={v.id}>
                                                {v.full_name ?? '(No name)'}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                                    <label className={styles.label}>Owner note</label>
                                    <textarea
                                        className={styles.textarea}
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        disabled={saving || !canCreate}
                                        placeholder="Symptoms / requests / notes for vet…"
                                    />
                                </div>
                            </div>

                            <div className={styles.footer}>
                                <button type="button" className={styles.btn} onClick={resetAndClose} disabled={saving}>
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={`${styles.btn} ${styles.btnPrimary}`}
                                    disabled={saving || !canCreate || pets.length === 0}
                                >
                                    {saving ? 'Creating…' : 'Create'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
