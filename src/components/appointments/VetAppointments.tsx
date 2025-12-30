'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import styles from './VetAppointments.module.css';

type TabKey = 'upcoming' | 'past' | 'cancelled';
type ViewMode = 'list' | 'calendar';

type SupabaseJoinOne<T> = T | T[] | null;

type AppointmentRow = {
    id: string;
    start_time: string;
    end_time: string | null;
    status: string | null;
    service_type: string | null;
    owner_note: string | null;
    created_at?: string | null;

    vet: { id: string; full_name: string | null } | null;
    pet: { id: string; name: string | null } | null;
    owner: { id: string; full_name: string | null; email: string | null; phone: string | null } | null;
};

type AppointmentRowRaw = Omit<AppointmentRow, 'pet' | 'owner' | 'vet'> & {
    pet: SupabaseJoinOne<{ id: string; name: string | null }>;
    owner: SupabaseJoinOne<{ id: string; full_name: string | null; email: string | null; phone: string | null }>;
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

function ymdLocal(iso: string) {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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

function statusClass(status: string | null, stylesObj: any) {
    switch (status) {
        case 'pending':
            return stylesObj.badgePending;
        case 'confirmed':
            return stylesObj.badgeConfirmed;
        case 'completed':
            return stylesObj.badgeCompleted;
        case 'cancelled':
        case 'rejected':
            return stylesObj.badgeCancelled;
        default:
            return stylesObj.badgeDefault;
    }
}

function startOfMonth(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export default function VetAppointments() {
    const { user } = useAuth();

    const [tab, setTab] = useState<TabKey>('upcoming');
    const [viewMode, setViewMode] = useState<ViewMode>('list');

    const [rows, setRows] = useState<AppointmentRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionId, setActionId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // calendar state
    const [monthCursor, setMonthCursor] = useState<Date>(() => new Date());
    const [selectedDay, setSelectedDay] = useState<string>(''); // YYYY-MM-DD

    const fetchAppointments = async () => {
        if (!user) return;
        if (user.role !== 'vet') return;

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
        owner:profiles!appointments_owner_id_fkey(id,full_name,email,phone),
        vet:profiles!appointments_vet_id_fkey(id,full_name)
        `
            );

        const nowIso = new Date().toISOString();
        let query = base;

        // Tab filter
        if (tab === 'upcoming') {
            // upcoming for vet: (assigned to me) OR (pending + unassigned)
            query = query
                .in('status', ['pending', 'confirmed'])
                .gte('start_time', nowIso)
                .or(`vet_id.eq.${user.id},and(vet_id.is.null,status.eq.pending)`);
        } else if (tab === 'past') {
            // past for vet: assigned to me only (keep it strict)
            query = query
                .eq('vet_id', user.id)
                .or(`start_time.lt.${nowIso},status.eq.completed`);
        } else {
            // cancelled/rejected for vet: assigned to me only
            query = query.eq('vet_id', user.id).in('status', ['cancelled', 'rejected']);
        }

        query = query.order('start_time', { ascending: tab !== 'past' });

        const { data, error } = await query;

        if (error) {
            setError(error.message);
            setRows([]);
            setLoading(false);
            return;
        }

        const normalized: AppointmentRow[] =
            ((data as AppointmentRowRaw[]) ?? []).map((r) => ({
                ...r,
                pet: firstOrNull(r.pet),
                owner: firstOrNull(r.owner),
                vet: firstOrNull(r.vet),
            })) ?? [];

        setRows(normalized);
        setLoading(false);
    };

    const acceptAppointment = async (appointmentId: string) => {
        if (!user) return;
        if (user.role !== 'vet') return;

        setActionId(appointmentId);
        setError(null);

        try {
            const { data, error } = await supabase
                .from('appointments')
                .update({
                    vet_id: user.id,
                    status: 'confirmed', // you can keep 'pending' if you prefer
                    updated_at: new Date().toISOString(),
                })
                .eq('id', appointmentId)
                .is('vet_id', null) // prevent race: only accept if still unassigned
                .select('id')
                .maybeSingle();

            if (error) {
                setError(error.message);
                return;
            }

            if (!data) {
                setError('This appointment was already accepted by another vet.');
                return;
            }

            await fetchAppointments();
        } finally {
            setActionId(null);
        }
    };

    useEffect(() => {
        if (!user) return;
        void fetchAppointments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, user?.role, tab]);

    // build counts for calendar
    const countsByDay = useMemo(() => {
        const m = new Map<string, number>();
        for (const a of rows) {
            const key = ymdLocal(a.start_time);
            m.set(key, (m.get(key) ?? 0) + 1);
        }
        return m;
    }, [rows]);

    const monthLabel = useMemo(() => {
        return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long' }).format(monthCursor);
    }, [monthCursor]);

    const monthDaysGrid = useMemo(() => {
        const start = startOfMonth(monthCursor);

        // calendar starts on Monday (0..6), convert JS Sunday(0) -> 6
        const jsDay = start.getDay(); // Sun=0..Sat=6
        const mondayIndex = (jsDay + 6) % 7; // Mon=0..Sun=6
        const gridStart = new Date(start);
        gridStart.setDate(start.getDate() - mondayIndex);

        const days: Array<{ date: Date; ymd: string; inMonth: boolean }> = [];
        for (let i = 0; i < 42; i++) {
            const d = new Date(gridStart);
            d.setDate(gridStart.getDate() + i);
            const ymd = ymdLocal(d.toISOString());
            days.push({
                date: d,
                ymd,
                inMonth: d.getMonth() === monthCursor.getMonth(),
            });
        }
        return days;
    }, [monthCursor]);

    const dayList = useMemo(() => {
        if (!selectedDay) return [];
        return rows.filter((r) => ymdLocal(r.start_time) === selectedDay);
    }, [rows, selectedDay]);

    if (!user) return null;
    if (user.role !== 'vet') return null;

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <div>
                        <div className={styles.title}>Vet Appointments</div>
                        <div className={styles.subtitle}>See your schedule and manage upcoming visits.</div>
                    </div>

                    <div className={styles.headerRight}>
                        <div className={styles.count}>{loading ? 'Loading…' : `${rows.length} shown`}</div>

                        <button className={styles.button} onClick={fetchAppointments} disabled={loading}>
                            Refresh
                        </button>

                        <div className={styles.viewToggle}>
                            <button
                                className={`${styles.tabSmall} ${viewMode === 'list' ? styles.tabSmallActive : ''}`}
                                onClick={() => setViewMode('list')}
                            >
                                List
                            </button>
                            <button
                                className={`${styles.tabSmall} ${viewMode === 'calendar' ? styles.tabSmallActive : ''}`}
                                onClick={() => setViewMode('calendar')}
                            >
                                Calendar
                            </button>
                        </div>
                    </div>
                </div>

                <div className={styles.tabs}>
                    <button className={`${styles.tab} ${tab === 'upcoming' ? styles.tabActive : ''}`} onClick={() => setTab('upcoming')}>
                        Upcoming
                    </button>
                    <button className={`${styles.tab} ${tab === 'past' ? styles.tabActive : ''}`} onClick={() => setTab('past')}>
                        Past
                    </button>
                    <button className={`${styles.tab} ${tab === 'cancelled' ? styles.tabActive : ''}`} onClick={() => setTab('cancelled')}>
                        Cancelled
                    </button>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                {viewMode === 'list' ? (
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.th}>Date/Time</th>
                                    <th className={styles.th}>Owner</th>
                                    <th className={styles.th}>Pet</th>
                                    <th className={styles.th}>Service</th>
                                    <th className={styles.th}>Status</th>
                                    <th className={styles.th} style={{ width: 160 }}>
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {rows.map((a) => {
                                    const isUnassignedPending = a.status === 'pending' && !a.vet;

                                    return (
                                        <tr key={a.id} className={styles.tr}>
                                            <td className={styles.td}>
                                                <div className={styles.dtMain}>{fmtDateTime(a.start_time)}</div>
                                                {a.end_time ? <div className={styles.dtSub}>→ {fmtDateTime(a.end_time)}</div> : null}
                                            </td>

                                            <td className={styles.td}>
                                                <div className={styles.ownerMain}>{a.owner?.full_name || '-'}</div>
                                                <div className={styles.ownerSub}>{a.owner?.email || a.owner?.phone || ''}</div>
                                            </td>

                                            <td className={styles.td}>{a.pet?.name || '-'}</td>

                                            <td className={styles.td}>
                                                <span className={styles.servicePill}>{a.service_type || '-'}</span>
                                            </td>

                                            <td className={styles.td}>
                                                <span className={`${styles.badge} ${statusClass(a.status, styles)}`}>{statusLabel(a.status)}</span>
                                            </td>

                                            <td className={styles.td}>
                                                <div className={styles.actionGroup}>
                                                    <button
                                                        className={`${styles.button} ${styles.buttonPrimary}`}
                                                        onClick={() => acceptAppointment(a.id)}
                                                        disabled={!isUnassignedPending || actionId === a.id}
                                                        title={!isUnassignedPending ? 'Only unassigned pending appointments can be accepted' : 'Accept appointment'}
                                                    >
                                                        {actionId === a.id ? 'Accepting…' : 'Accept'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

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
                ) : (
                    <div className={styles.calendarWrap}>
                        <div className={styles.calendarHeader}>
                            <button className={styles.button} onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>
                                Prev
                            </button>

                            <div className={styles.calendarTitle}>{monthLabel}</div>

                            <button className={styles.button} onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>
                                Next
                            </button>
                        </div>

                        <div className={styles.calendarGrid}>
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                                <div key={d} className={styles.calDow}>
                                    {d}
                                </div>
                            ))}

                            {monthDaysGrid.map((cell) => {
                                const count = countsByDay.get(cell.ymd) ?? 0;
                                const selected = selectedDay === cell.ymd;
                                return (
                                    <button
                                        key={cell.ymd}
                                        className={`${styles.calCell} ${cell.inMonth ? '' : styles.calCellMuted} ${selected ? styles.calCellSelected : ''}`}
                                        onClick={() => setSelectedDay(cell.ymd)}
                                        title={count ? `${count} appointment(s)` : 'No appointments'}
                                    >
                                        <div className={styles.calDayNum}>{cell.date.getDate()}</div>
                                        {count > 0 ? <div className={styles.calCount}>{count}</div> : <div className={styles.calCountEmpty} />}
                                    </button>
                                );
                            })}
                        </div>

                        <div className={styles.dayPanel}>
                            <div className={styles.dayPanelHeader}>
                                <div className={styles.dayPanelTitle}>{selectedDay ? `Appointments on ${selectedDay}` : 'Select a day'}</div>
                                <div className={styles.dayPanelSub}>{selectedDay ? `${dayList.length} item(s)` : ''}</div>
                            </div>

                            {selectedDay && dayList.length === 0 && <div className={styles.hint}>No appointments on this day.</div>}

                            {selectedDay && dayList.length > 0 && (
                                <div className={styles.dayList}>
                                    {dayList.map((a) => {
                                        const isUnassignedPending = a.status === 'pending' && !a.vet;

                                        return (
                                            <div key={a.id} className={styles.dayItem}>
                                                <div className={styles.dayItemMain}>
                                                    <div className={styles.dayTime}>{fmtDateTime(a.start_time)}</div>
                                                    <div className={styles.dayOwner}>{a.owner?.full_name || '-'}</div>
                                                </div>

                                                <div className={styles.dayItemSub}>
                                                    <span className={styles.servicePill}>{a.service_type || '-'}</span>
                                                    <span className={`${styles.badge} ${statusClass(a.status, styles)}`}>{statusLabel(a.status)}</span>
                                                    <span className={styles.dayPet}>{a.pet?.name || '-'}</span>

                                                    <button
                                                        className={`${styles.button} ${styles.buttonPrimary}`}
                                                        onClick={() => acceptAppointment(a.id)}
                                                        disabled={!isUnassignedPending || actionId === a.id}
                                                        title={!isUnassignedPending ? 'Only unassigned pending appointments can be accepted' : 'Accept appointment'}
                                                        style={{ marginLeft: 'auto' }}
                                                    >
                                                        {actionId === a.id ? 'Accepting…' : 'Accept'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className={styles.hint}>
                Mục A: List + Calendar view cho Vet (bao gồm pending chưa gán). Các action Confirm/Reject/Complete sẽ làm ở mục tiếp theo.
            </div>
        </div>
    );
}
