'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import styles from './AdminAppointments.module.css';

// --- Types Helper ---
type SupabaseJoinOne<T> = T | T[] | null;

type AppointmentRow = {
    id: string;
    start_time: string;
    end_time: string | null;
    status: string | null;
    service_type: string | null;
    owner_note: string | null;
    created_at?: string | null;

    // Joined fields
    pet: { id: string; name: string | null } | null;
    owner: { id: string; full_name: string | null; email: string | null; phone: string | null } | null;
    vet: { id: string; full_name: string | null } | null;
};

// Raw shape from Supabase before normalization
type AppointmentRowRaw = Omit<AppointmentRow, 'pet' | 'owner' | 'vet'> & {
    pet: SupabaseJoinOne<{ id: string; name: string | null }>;
    owner: SupabaseJoinOne<{ id: string; full_name: string | null; email: string | null; phone: string | null }>;
    vet: SupabaseJoinOne<{ id: string; full_name: string | null }>;
};

// --- Utilities ---
function firstOrNull<T>(value: SupabaseJoinOne<T>): T | null {
    if (!value) return null;
    return Array.isArray(value) ? value[0] ?? null : value;
}

function fmtDateTime(iso: string) {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(d);
}

function normalizeISODate(d: string) {
    return d ? `${d}T00:00:00.000Z` : '';
}

function statusLabel(status: string | null) {
    if (!status) return '-';
    return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusClass(status: string | null) {
    switch (status) {
        case 'pending': return styles.badgePending;
        case 'confirmed': return styles.badgeConfirmed;
        case 'completed': return styles.badgeCompleted;
        case 'cancelled':
        case 'rejected': return styles.badgeCancelled;
        default: return styles.badgeDefault;
    }
}

// --- Component ---
export default function AdminAppointments() {
    const { user } = useAuth();

    // States
    const [rows, setRows] = useState<AppointmentRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionId, setActionId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [filterDate, setFilterDate] = useState<string>(''); // YYYY-MM-DD
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterVet, setFilterVet] = useState<string>(''); // 'assigned', 'unassigned', or ''

    const fetchAppointments = async () => {
        if (!user) return;
        setLoading(true);
        setError(null);

        // Build query
        let query = supabase
            .from('appointments')
            .select(`
                id,
                start_time,
                end_time,
                status,
                service_type,
                owner_note,
                created_at,
                pet:pets!appointments_pet_id_fkey(id,name),
                owner:profiles!appointments_owner_id_fkey(id,full_name,email,phone),
                vet:profiles!appointments_vet_id_fkey(id,full_name)
            `);

        // Apply filters
        if (filterStatus) {
            query = query.eq('status', filterStatus);
        }

        if (filterDate) {
            const start = normalizeISODate(filterDate);
            // End of day
            const endObj = new Date(start);
            endObj.setUTCDate(endObj.getUTCDate() + 1);
            const end = endObj.toISOString();

            query = query.gte('start_time', start).lt('start_time', end);
        }

        if (filterVet === 'unassigned') {
            query = query.is('vet_id', null);
        } else if (filterVet === 'assigned') {
            query = query.not('vet_id', 'is', null);
        }

        // Default sort: newest appointments first
        query = query.order('start_time', { ascending: false });

        const { data, error } = await query;

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        // Normalize data
        const normalized: AppointmentRow[] = ((data as AppointmentRowRaw[]) ?? []).map(r => ({
            ...r,
            pet: firstOrNull(r.pet),
            owner: firstOrNull(r.owner),
            vet: firstOrNull(r.vet),
        }));

        setRows(normalized);
        setLoading(false);
    };

    // Load data on mount or filter change
    useEffect(() => {
        void fetchAppointments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterDate, filterStatus, filterVet]);

    // Actions
    const handleCancel = async (id: string) => {
        if (!confirm('Are you sure you want to cancel this appointment? This action cannot be undone.')) return;

        setActionId(id);
        try {
            const { error } = await supabase
                .from('appointments')
                .update({
                    status: 'cancelled',
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;
            await fetchAppointments();
        } catch (error: unknown) {
            const e = error as Error;
            setError(e.message || 'Failed to cancel appointment');
        } finally {
            setActionId(null);
        }
    };

    const handleClearFilters = () => {
        setFilterDate('');
        setFilterStatus('');
        setFilterVet('');
    };

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <div>
                        <div className={styles.title}>All Appointments</div>
                        <div className={styles.subtitle}>
                            Admin View: Manage scheduling for all pets and vets.
                        </div>
                    </div>
                    <div className={styles.headerRight}>
                        <button className={styles.button} onClick={fetchAppointments} disabled={loading}>
                            Refresh List
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className={styles.filters}>
                    <div className={styles.field}>
                        <label className={styles.label}>Filter Date</label>
                        <input
                            type="date"
                            className={styles.input}
                            value={filterDate}
                            onChange={e => setFilterDate(e.target.value)}
                        />
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>Status</label>
                        <select
                            className={styles.select}
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                        >
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>Vet Assignment</label>
                        <select
                            className={styles.select}
                            value={filterVet}
                            onChange={e => setFilterVet(e.target.value)}
                        >
                            <option value="">All</option>
                            <option value="unassigned">Unassigned (Needs Vet)</option>
                            <option value="assigned">Assigned</option>
                        </select>
                    </div>

                    <div className={styles.field} style={{ justifyContent: 'flex-end' }}>
                        <button className={styles.button} onClick={handleClearFilters}>
                            Clear Filters
                        </button>
                    </div>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                {/* Table */}
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.th}>Date & Time</th>
                                <th className={styles.th}>Owner & Pet</th>
                                <th className={styles.th}>Service</th>
                                <th className={styles.th}>Assigned Vet</th>
                                <th className={styles.th}>Status</th>
                                <th className={styles.th}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className={styles.td} style={{ textAlign: 'center' }}>Loading data...</td></tr>
                            ) : rows.length === 0 ? (
                                <tr><td colSpan={6} className={styles.td} style={{ textAlign: 'center' }}>No appointments found matching filters.</td></tr>
                            ) : (
                                rows.map(row => (
                                    <tr key={row.id} className={styles.tr}>
                                        <td className={styles.td}>
                                            <div style={{ fontWeight: 600 }}>{fmtDateTime(row.start_time)}</div>
                                            {row.end_time && (
                                                <div style={{ fontSize: 12, color: '#6b7280' }}>
                                                    to {new Date(row.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            )}
                                        </td>
                                        <td className={styles.td}>
                                            <div className={styles.ownerInfo}>{row.owner?.full_name || 'Unknown Owner'}</div>
                                            <div className={styles.ownerSub}>{row.owner?.email || row.owner?.phone}</div>
                                            <div style={{ marginTop: 4 }}>
                                                🐾 <strong>{row.pet?.name || 'Unknown Pet'}</strong>
                                            </div>
                                        </td>
                                        <td className={styles.td}>
                                            <span className={styles.servicePill}>{row.service_type || 'General'}</span>
                                            {row.owner_note && (
                                                <div style={{ fontSize: 12, marginTop: 6, fontStyle: 'italic', color: '#4b5563' }}>
                                                    {row.owner_note}
                                                </div>
                                            )}
                                        </td>
                                        <td className={styles.td}>
                                            {row.vet ? (
                                                <span className={styles.vetInfo}>🩺 {row.vet.full_name}</span>
                                            ) : (
                                                <span className={styles.emptyVet}>-- Unassigned --</span>
                                            )}
                                        </td>
                                        <td className={styles.td}>
                                            <span className={`${styles.badge} ${statusClass(row.status)}`}>
                                                {statusLabel(row.status)}
                                            </span>
                                        </td>
                                        <td className={styles.td}>
                                            {['pending', 'confirmed'].includes(row.status || '') && (
                                                <button
                                                    className={`${styles.button} ${styles.buttonDanger}`}
                                                    onClick={() => handleCancel(row.id)}
                                                    disabled={actionId === row.id}
                                                    style={{ padding: '4px 10px', fontSize: 12 }}
                                                >
                                                    {actionId === row.id ? '...' : 'Cancel'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}