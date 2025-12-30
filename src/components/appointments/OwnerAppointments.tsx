'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import styles from './OwnerAppointments.module.css';
import CreateAppointmentModal from './CreateAppointmentModal';

type TabKey = 'upcoming' | 'past' | 'cancelled';

type PetOption = { id: string; name: string | null };

// Supabase join có thể trả về object hoặc array (tùy schema/typing),
// nên mình chuẩn hóa bằng type linh hoạt.
type SupabaseJoinOne<T> = T | T[] | null;

type AppointmentRow = {
    id: string;
    start_time: string; // timestamptz ISO
    end_time: string | null;
    status: string | null;
    service_type: string | null;
    owner_note: string | null;
    created_at?: string | null;

    pet: { id: string; name: string | null } | null;
    vet: { id: string; full_name: string | null } | null;
};

// Shape dữ liệu “thô” từ supabase (pet/vet có thể là array)
type AppointmentRowRaw = Omit<AppointmentRow, 'pet' | 'vet'> & {
    pet: SupabaseJoinOne<{ id: string; name: string | null }>;
    vet: SupabaseJoinOne<{ id: string; full_name: string | null }>;
};

function firstOrNull<T>(value: SupabaseJoinOne<T>): T | null {
    if (!value) return null;
    return Array.isArray(value) ? value[0] ?? null : value;
}

function fmtDateTime(iso: string) {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(d);
}

function normalizeISODate(d: string) {
    // input type="date" => YYYY-MM-DD
    return d ? `${d}T00:00:00.000Z` : '';
}

function statusLabel(status: string | null) {
    switch (status) {
        case 'pending':
            return 'Pending';
        case 'confirmed':
            return 'Confirmed';
        case 'completed':
            return 'Completed';
        case 'cancelled':
            return 'Cancelled';
        case 'rejected':
            return 'Rejected';
        default:
            return status || '-';
    }
}

function statusClass(status: string | null) {
    switch (status) {
        case 'pending':
            return styles.badgePending;
        case 'confirmed':
            return styles.badgeConfirmed;
        case 'completed':
            return styles.badgeCompleted;
        case 'cancelled':
        case 'rejected':
            return styles.badgeCancelled;
        default:
            return styles.badgeDefault;
    }
}

function toDatetimeLocal(value: string | null): string {
    if (!value) return '';
    const d = new Date(value);
    const pad = (n: number) => String(n).padStart(2, '0');
    // local datetime-local format
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIsoFromDatetimeLocal(value: string): string {
    // "YYYY-MM-DDTHH:mm" interpreted as local time
    return new Date(value).toISOString();
}

const SERVICE_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'checkup', label: 'Check-up' },
    { value: 'vaccination', label: 'Vaccination' },
    { value: 'grooming', label: 'Grooming' },
    { value: 'boarding', label: 'Boarding' },
];

export default function OwnerAppointments() {
    const { user } = useAuth();

    const [tab, setTab] = useState<TabKey>('upcoming');

    const [pets, setPets] = useState<PetOption[]>([]);
    const [rows, setRows] = useState<AppointmentRow[]>([]);

    const [loading, setLoading] = useState(false);
    const [actionId, setActionId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [createOpen, setCreateOpen] = useState(false);

    // filters
    const [petId, setPetId] = useState<string>('');
    const [serviceType, setServiceType] = useState<string>('');
    const [status, setStatus] = useState<string>('');
    const [fromDate, setFromDate] = useState<string>(''); // YYYY-MM-DD
    const [toDate, setToDate] = useState<string>(''); // YYYY-MM-DD

    // edit modal (merged View + Reschedule)
    const [editing, setEditing] = useState<AppointmentRow | null>(null);
    const [editDraft, setEditDraft] = useState({
        start_time: '',
        end_time: '',
        service_type: 'checkup',
        owner_note: '',
    });
    const [savingEdit, setSavingEdit] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

    // để tránh thay đổi "now" trong cùng 1 session render
    const now = useMemo(() => new Date(), []);

    const fetchPets = async () => {
        if (!user) return;

        const { data, error } = await supabase
            .from('pets')
            .select('id,name')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            setError(error.message);
            return;
        }

        setPets((data as PetOption[]) ?? []);
    };

    const fetchAppointments = async () => {
        if (!user) return;

        setLoading(true);
        setError(null);

        const base = supabase
            .from('appointments')
            .select(
                `
        id,
        start_time,
        end_time,
        status,
        service_type,
        owner_note,
        created_at,
        pet:pets!appointments_pet_id_fkey(id,name),
        vet:profiles!appointments_vet_id_fkey(id,full_name)
        `
            )
            .eq('owner_id', user.id);

        // tab filter
        const nowIso = new Date().toISOString();
        let query = base;

        if (tab === 'upcoming') {
            query = query.in('status', ['pending', 'confirmed']).gte('start_time', nowIso);
        } else if (tab === 'past') {
            query = query.or(`start_time.lt.${nowIso},status.eq.completed`);
        } else {
            query = query.in('status', ['cancelled', 'rejected']);
        }

        // filters
        if (petId) query = query.eq('pet_id', petId);
        if (serviceType) query = query.eq('service_type', serviceType);
        if (status) query = query.eq('status', status);

        if (fromDate) query = query.gte('start_time', normalizeISODate(fromDate));
        if (toDate) {
            // inclusive: toDate + 1 day
            const end = new Date(normalizeISODate(toDate));
            end.setUTCDate(end.getUTCDate() + 1);
            query = query.lt('start_time', end.toISOString());
        }

        query = query.order('start_time', { ascending: tab !== 'past' });

        const { data, error } = await query;

        if (error) {
            setError(error.message);
            setRows([]);
            setLoading(false);
            return;
        }

        // IMPORTANT: normalize join results (pet/vet array -> first element)
        const normalized: AppointmentRow[] =
            ((data as AppointmentRowRaw[]) ?? []).map((r) => ({
                ...r,
                pet: firstOrNull(r.pet),
                vet: firstOrNull(r.vet),
            })) ?? [];

        setRows(normalized);
        setLoading(false);
    };

    useEffect(() => {
        if (!user) return;
        void fetchPets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    useEffect(() => {
        if (!user) return;
        void fetchAppointments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, tab]);

    const clearFilters = () => {
        setPetId('');
        setServiceType('');
        setStatus('');
        setFromDate('');
        setToDate('');
    };

    const applyFilters = async () => {
        await fetchAppointments();
    };

    const canCancel = (a: AppointmentRow) => {
        if (!a.status) return false;
        if (!['pending', 'confirmed'].includes(a.status)) return false;
        const start = new Date(a.start_time);
        return start.getTime() > Date.now();
    };

    const cancelAppointment = async (a: AppointmentRow) => {
        if (!user) return;
        if (!canCancel(a)) return;

        const ok = window.confirm('Cancel this appointment?');
        if (!ok) return;

        setActionId(a.id);
        setError(null);

        try {
            const { error } = await supabase
                .from('appointments')
                .update({
                    status: 'cancelled',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', a.id)
                .eq('owner_id', user.id);

            if (error) {
                setError(error.message);
                return;
            }

            await fetchAppointments();
            setEditing(null);
        } finally {
            setActionId(null);
        }
    };

    const openEdit = (a: AppointmentRow) => {
        // only allow edit when pending
        if (a.status !== 'pending') return;

        setEditError(null);
        setEditing(a);

        const initialService =
            a.service_type && SERVICE_OPTIONS.some((s) => s.value === a.service_type)
                ? a.service_type
                : SERVICE_OPTIONS[0].value;

        setEditDraft({
            start_time: toDatetimeLocal(a.start_time),
            end_time: toDatetimeLocal(a.end_time),
            service_type: initialService,
            owner_note: a.owner_note ?? '',
        });
    };

    const closeEdit = () => {
        if (savingEdit) return;
        setEditing(null);
        setEditError(null);
    };

    const saveEdit = async () => {
        if (!user) return;
        if (!editing) return;

        if (editing.status !== 'pending') {
            setEditError('Only pending appointments can be edited.');
            return;
        }

        if (!editDraft.start_time) {
            setEditError('Please select a start time.');
            return;
        }

        const start = new Date(editDraft.start_time);
        const end = editDraft.end_time ? new Date(editDraft.end_time) : null;

        if (end && !(end > start)) {
            setEditError('End time must be after start time.');
            return;
        }

        if (!editDraft.service_type) {
            setEditError('Please select a service.');
            return;
        }

        setSavingEdit(true);
        setEditError(null);

        try {
            const { error } = await supabase
                .from('appointments')
                .update({
                    start_time: toIsoFromDatetimeLocal(editDraft.start_time),
                    end_time: editDraft.end_time ? toIsoFromDatetimeLocal(editDraft.end_time) : null,
                    service_type: editDraft.service_type,
                    owner_note: editDraft.owner_note.trim() ? editDraft.owner_note.trim() : null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', editing.id)
                .eq('owner_id', user.id)
                .eq('status', 'pending'); // server-side guard

            if (error) {
                setEditError(error.message);
                return;
            }

            await fetchAppointments();
            closeEdit();
        } catch (e) {
            console.error(e);
            setEditError('Failed to update appointment. Please try again.');
        } finally {
            setSavingEdit(false);
        }
    };

    if (!user) return null;

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <div>
                        <div className={styles.title}>My Appointments</div>
                        <div className={styles.subtitle}>Manage your bookings, upcoming visits, and history.</div>
                    </div>

                    <div className={styles.headerRight}>
                        <div className={styles.count}>{loading ? 'Loading…' : `${rows.length} shown`}</div>
                        <button className={`${styles.button}`} onClick={fetchAppointments} disabled={loading}>
                            Refresh
                        </button>
                        <button
                            className={`${styles.button} ${styles.buttonPrimary}`}
                            onClick={() => setCreateOpen(true)}
                        >
                            New Appointment
                        </button>
                    </div>
                </div>

                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${tab === 'upcoming' ? styles.tabActive : ''}`}
                        onClick={() => setTab('upcoming')}
                    >
                        Upcoming
                    </button>
                    <button
                        className={`${styles.tab} ${tab === 'past' ? styles.tabActive : ''}`}
                        onClick={() => setTab('past')}
                    >
                        Past
                    </button>
                    <button
                        className={`${styles.tab} ${tab === 'cancelled' ? styles.tabActive : ''}`}
                        onClick={() => setTab('cancelled')}
                    >
                        Cancelled
                    </button>
                </div>

                <div className={styles.filters}>
                    <div className={styles.filterRow}>
                        <div className={styles.field}>
                            <label className={styles.label}>Pet</label>
                            <select className={styles.select} value={petId} onChange={(e) => setPetId(e.target.value)}>
                                <option value="">All</option>
                                {pets.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name || '(Unnamed)'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>Service</label>
                            <select className={styles.select} value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                                <option value="">All</option>
                                {SERVICE_OPTIONS.map((s) => (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>Status</label>
                            <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
                                <option value="">All</option>
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>From</label>
                            <input className={styles.input} type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>To</label>
                            <input className={styles.input} type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                        </div>

                        <div className={styles.filterActions}>
                            <button className={styles.button} onClick={clearFilters} disabled={loading}>
                                Clear
                            </button>
                            <button className={`${styles.button} ${styles.buttonPrimary}`} onClick={applyFilters} disabled={loading}>
                                Apply
                            </button>
                        </div>
                    </div>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.th}>Date/Time</th>
                                <th className={styles.th}>Pet</th>
                                <th className={styles.th}>Service</th>
                                <th className={styles.th}>Vet</th>
                                <th className={styles.th}>Status</th>
                                <th className={styles.th} style={{ width: 220 }}>
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {rows.map((a) => (
                                <tr key={a.id} className={styles.tr}>
                                    <td className={styles.td}>
                                        <div className={styles.dtMain}>{fmtDateTime(a.start_time)}</div>
                                        {a.end_time ? <div className={styles.dtSub}>→ {fmtDateTime(a.end_time)}</div> : null}
                                    </td>

                                    <td className={styles.td}>{a.pet?.name || '-'}</td>

                                    <td className={styles.td}>
                                        <span className={styles.servicePill}>{a.service_type || '-'}</span>
                                    </td>

                                    <td className={styles.td}>{a.vet?.full_name || '-'}</td>

                                    <td className={styles.td}>
                                        <span className={`${styles.badge} ${statusClass(a.status)}`}>{statusLabel(a.status)}</span>
                                    </td>

                                    <td className={styles.td}>
                                        <div className={styles.actionGroup}>
                                            <button
                                                className={`${styles.button} ${styles.buttonPrimary}`}
                                                onClick={() => openEdit(a)}
                                                disabled={a.status !== 'pending'}
                                                title={a.status === 'pending' ? 'Edit appointment' : 'Only pending appointments can be edited'}
                                            >
                                                Edit
                                            </button>

                                            <button
                                                className={`${styles.button} ${styles.buttonDanger}`}
                                                onClick={() => cancelAppointment(a)}
                                                disabled={!canCancel(a) || actionId === a.id}
                                                title={!canCancel(a) ? 'Only pending/confirmed future appointments can be cancelled' : 'Cancel appointment'}
                                            >
                                                {actionId === a.id ? 'Cancelling…' : 'Cancel'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {!loading && rows.length === 0 && (
                                <tr>
                                    <td className={styles.td} colSpan={6}>
                                        No appointments found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {editing && (
                    <div className={styles.modalOverlay} onClick={closeEdit}>
                        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                            <div className={styles.modalHeader}>
                                <div className={styles.modalTitle}>Edit Appointment</div>
                                <button className={styles.modalClose} onClick={closeEdit} disabled={savingEdit}>
                                    ✕
                                </button>
                            </div>

                            <div className={styles.modalBody}>
                                {editError && <div className={styles.error}>{editError}</div>}

                                <div className={styles.detailGrid} style={{ marginBottom: 12 }}>
                                    <div className={styles.detailItem}>
                                        <div className={styles.detailLabel}>Pet</div>
                                        <div className={styles.detailValue}>{editing.pet?.name || '-'}</div>
                                    </div>

                                    <div className={styles.detailItem}>
                                        <div className={styles.detailLabel}>Vet</div>
                                        <div className={styles.detailValue}>{editing.vet?.full_name || '-'}</div>
                                    </div>

                                    <div className={styles.detailItem}>
                                        <div className={styles.detailLabel}>Status</div>
                                        <div className={styles.detailValue}>
                                            <span className={`${styles.badge} ${statusClass(editing.status)}`}>{statusLabel(editing.status)}</span>
                                        </div>
                                    </div>

                                    <div className={styles.detailItem}>
                                        <div className={styles.detailLabel}>Created</div>
                                        <div className={styles.detailValue}>{editing.created_at ? fmtDateTime(editing.created_at) : '-'}</div>
                                    </div>
                                </div>

                                <div className={styles.detailGrid}>
                                    <div className={styles.field}>
                                        <label className={styles.label}>Service</label>
                                        <select
                                            className={styles.select}
                                            value={editDraft.service_type}
                                            onChange={(e) => setEditDraft((p) => ({ ...p, service_type: e.target.value }))}
                                            disabled={savingEdit || editing.status !== 'pending'}
                                        >
                                            {SERVICE_OPTIONS.map((s) => (
                                                <option key={s.value} value={s.value}>
                                                    {s.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div />

                                    <div className={styles.field}>
                                        <label className={styles.label}>Start time</label>
                                        <input
                                            type="datetime-local"
                                            className={styles.input}
                                            value={editDraft.start_time}
                                            onChange={(e) => setEditDraft((p) => ({ ...p, start_time: e.target.value }))}
                                            disabled={savingEdit || editing.status !== 'pending'}
                                        />
                                    </div>

                                    <div className={styles.field}>
                                        <label className={styles.label}>End time</label>
                                        <input
                                            type="datetime-local"
                                            className={styles.input}
                                            value={editDraft.end_time}
                                            onChange={(e) => setEditDraft((p) => ({ ...p, end_time: e.target.value }))}
                                            disabled={savingEdit || editing.status !== 'pending'}
                                        />
                                    </div>

                                    <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                                        <label className={styles.label}>Owner note</label>
                                        <textarea
                                            className={styles.input}
                                            style={{ height: 90, padding: 10 }}
                                            value={editDraft.owner_note}
                                            onChange={(e) => setEditDraft((p) => ({ ...p, owner_note: e.target.value }))}
                                            disabled={savingEdit || editing.status !== 'pending'}
                                            placeholder="Optional note for the vet…"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.modalFooter}>
                                <button className={styles.button} onClick={closeEdit} disabled={savingEdit}>
                                    Close
                                </button>

                                <button
                                    className={`${styles.button} ${styles.buttonPrimary}`}
                                    onClick={saveEdit}
                                    disabled={savingEdit || editing.status !== 'pending'}
                                    title={editing.status === 'pending' ? 'Save changes' : 'Only pending appointments can be edited'}
                                >
                                    {savingEdit ? 'Saving…' : 'Save changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className={styles.hint}>
                Tip: “New Appointment” và “Reschedule” sẽ làm ở mục B/C. Hiện tại đây là list + cancel flow.
            </div>

            <CreateAppointmentModal
                isOpen={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreated={() => {
                    setCreateOpen(false);
                    void fetchAppointments();
                }}
            />
        </div>
    );
}
