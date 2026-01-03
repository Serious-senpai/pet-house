'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import MedicalRecordModal from './MedicalRecordModal';
import styles from './VetAppointments.module.css';

// --- Types ---
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
    vet_id: string | null;
    pet: { id: string; name: string | null } | null;
    owner: { id: string; full_name: string | null; email: string | null; phone: string | null } | null;
    vet: { id: string; full_name: string | null } | null;
};

type AppointmentRowRaw = Omit<AppointmentRow, 'pet' | 'owner' | 'vet'> & {
    pet: SupabaseJoinOne<{ id: string; name: string | null }>;
    owner: SupabaseJoinOne<{ id: string; full_name: string | null; email: string | null; phone: string | null }>;
    vet: SupabaseJoinOne<{ id: string; full_name: string | null }>;
};

// --- Helpers ---
function firstOrNull<T>(value: SupabaseJoinOne<T>): T | null {
    if (!value) return null;
    return Array.isArray(value) ? value[0] ?? null : value;
}

function fmtDateTime(iso: string) {
    return new Intl.DateTimeFormat('vi-VN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
}

function ymdLocal(iso: string) {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function statusLabel(status: string | null) {
    const labels: Record<string, string> = {
        pending: 'Chờ xác nhận',
        confirmed: 'Đã xác nhận',
        completed: 'Hoàn thành',
        cancelled: 'Đã hủy',
        rejected: 'Từ chối'
    };
    return status ? labels[status] || status : '-';
}

function statusClass(status: string | null, stylesObj: any) {
    switch (status) {
        case 'pending': return stylesObj.badgePending;
        case 'confirmed': return stylesObj.badgeConfirmed;
        case 'completed': return stylesObj.badgeCompleted;
        case 'cancelled':
        case 'rejected': return stylesObj.badgeCancelled;
        default: return stylesObj.badgeDefault;
    }
}

export default function VetAppointments() {
    const { user } = useAuth();

    const [tab, setTab] = useState<TabKey>('upcoming');
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [rows, setRows] = useState<AppointmentRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionId, setActionId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [recordModalOpen, setRecordModalOpen] = useState(false);
    const [selectedAppointmentForRecord, setSelectedAppointmentForRecord] = useState<AppointmentRow | null>(null);

    const [monthCursor, setMonthCursor] = useState<Date>(new Date());
    const [selectedDay, setSelectedDay] = useState<string>('');

    const fetchAppointments = async () => {
        if (!user || user.role !== 'vet') return;
        setLoading(true);
        setError(null);

        try {
            const base = supabase
                .from('appointments')
                .select(`
                    id, start_time, end_time, status, service_type, owner_note, created_at, vet_id,
                    pet:pets!appointments_pet_id_fkey(id, name),
                    owner:profiles!appointments_owner_id_fkey(id, full_name, email, phone),
                    vet:profiles!appointments_vet_id_fkey(id, full_name)
                `);

            const nowIso = new Date().toISOString();
            let query = base;

            if (tab === 'upcoming') {
                query = query
                    .in('status', ['pending', 'confirmed'])
                    .gte('start_time', nowIso)
                    .or(`vet_id.eq.${user.id},and(vet_id.is.null,status.eq.pending)`);
            } else if (tab === 'past') {
                query = query.eq('vet_id', user.id).or(`start_time.lt.${nowIso},status.eq.completed`);
            } else {
                query = query.eq('vet_id', user.id).in('status', ['cancelled', 'rejected']);
            }

            const { data, error: fetchError } = await query.order('start_time', { ascending: tab !== 'past' });
            if (fetchError) throw fetchError;

            const normalized = (data as AppointmentRowRaw[]).map(r => ({
                ...r,
                pet: firstOrNull(r.pet),
                owner: firstOrNull(r.owner),
                vet: firstOrNull(r.vet),
            }));
            setRows(normalized);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, [user?.id, tab]);

    const handleAccept = async (id: string) => {
        if (!user) return;
        setActionId(id);
        try {
            const { data, error: updateError } = await supabase
                .from('appointments')
                .update({ vet_id: user.id, status: 'confirmed', updated_at: new Date().toISOString() })
                .eq('id', id)
                .is('vet_id', null)
                .select().maybeSingle();

            if (updateError) throw updateError;
            if (!data) alert('Cuộc hẹn này đã được bác sĩ khác nhận.');
            await fetchAppointments();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setActionId(null);
        }
    };

    const handleOpenCompleteModal = (appointment: AppointmentRow) => {
        setSelectedAppointmentForRecord(appointment);
        setRecordModalOpen(true);
    };

    // --- Calendar Calculations ---
    const countsByDay = useMemo(() => {
        const m = new Map<string, number>();
        rows.forEach(a => {
            const key = ymdLocal(a.start_time);
            m.set(key, (m.get(key) ?? 0) + 1);
        });
        return m;
    }, [rows]);

    const monthDaysGrid = useMemo(() => {
        const start = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
        const dayIdx = (start.getDay() + 6) % 7; // Mon=0
        const gridStart = new Date(start);
        gridStart.setDate(start.getDate() - dayIdx);

        return Array.from({ length: 42 }).map((_, i) => {
            const d = new Date(gridStart);
            d.setDate(gridStart.getDate() + i);
            return {
                date: d,
                ymd: ymdLocal(d.toISOString()),
                inMonth: d.getMonth() === monthCursor.getMonth()
            };
        });
    }, [monthCursor]);

    const dayList = useMemo(() => rows.filter(r => ymdLocal(r.start_time) === selectedDay), [rows, selectedDay]);

    if (!user || user.role !== 'vet') return null;

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                {/* Header Section */}
                <div className={styles.header}>
                    <div>
                        <div className={styles.title}>Lịch Hẹn Bác Sĩ</div>
                        <div className={styles.subtitle}>Quản lý danh sách và lịch trình khám bệnh.</div>
                    </div>
                    <div className={styles.headerRight}>
                        <button className={styles.button} onClick={fetchAppointments} disabled={loading}>Làm mới</button>
                        <div className={styles.viewToggle}>
                            <button className={`${styles.tabSmall} ${viewMode === 'list' ? styles.tabSmallActive : ''}`} onClick={() => setViewMode('list')}>Danh sách</button>
                            <button className={`${styles.tabSmall} ${viewMode === 'calendar' ? styles.tabSmallActive : ''}`} onClick={() => setViewMode('calendar')}>Lịch</button>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className={styles.tabs}>
                    {(['upcoming', 'past', 'cancelled'] as TabKey[]).map(t => (
                        <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
                            {t === 'upcoming' ? 'Sắp tới' : t === 'past' ? 'Lịch sử' : 'Đã hủy'}
                        </button>
                    ))}
                </div>

                {error && <div className={styles.error}>{error}</div>}

                {viewMode === 'list' ? (
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.th}>Thời gian</th>
                                    <th className={styles.th}>Chủ nuôi</th>
                                    <th className={styles.th}>Thú cưng</th>
                                    <th className={styles.th}>Dịch vụ</th>
                                    <th className={styles.th}>Trạng thái</th>
                                    <th className={styles.th}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((a) => (
                                    <tr key={a.id} className={styles.tr}>
                                        <td className={styles.td}>
                                            <div className={styles.dtMain}>{fmtDateTime(a.start_time)}</div>
                                        </td>
                                        <td className={styles.td}>
                                            <div className={styles.ownerMain}>{a.owner?.full_name || '-'}</div>
                                            <div className={styles.ownerSub}>{a.owner?.phone}</div>
                                        </td>
                                        <td className={styles.td}>{a.pet?.name || '-'}</td>
                                        <td className={styles.td}><span className={styles.servicePill}>{a.service_type}</span></td>
                                        <td className={styles.td}>
                                            <span className={`${styles.badge} ${statusClass(a.status, styles)}`}>{statusLabel(a.status)}</span>
                                        </td>
                                        <td className={styles.td}>
                                            <div className={styles.actionGroup}>
                                                {/* Nút Accept cho các cuộc hẹn Pending chưa có bác sĩ */}
                                                {a.status === 'pending' && !a.vet_id && (
                                                    <button
                                                        className={`${styles.button} ${styles.buttonPrimary}`}
                                                        onClick={() => handleAccept(a.id)}
                                                        disabled={actionId === a.id}
                                                    >
                                                        {actionId === a.id ? 'Đang nhận...' : 'Nhận lịch'}
                                                    </button>
                                                )}

                                                {/* Nút Complete cho cuộc hẹn của chính mình */}
                                                {a.status === 'confirmed' && a.vet_id === user.id && (
                                                    <button
                                                        className={styles.button}
                                                        style={{ backgroundColor: '#10b981', color: '#fff', border: 'none' }}
                                                        onClick={() => handleOpenCompleteModal(a)}
                                                    >
                                                        Hoàn thành
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {!loading && rows.length === 0 && (
                                    <tr><td colSpan={6} className={styles.td} style={{ textAlign: 'center' }}>Không tìm thấy cuộc hẹn nào.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className={styles.calendarWrap}>
                        <div className={styles.calendarHeader}>
                            <button className={styles.button} onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}>Trước</button>
                            <div className={styles.calendarTitle}>{monthCursor.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</div>
                            <button className={styles.button} onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}>Sau</button>
                        </div>
                        <div className={styles.calendarGrid}>
                            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => <div key={d} className={styles.calDow}>{d}</div>)}
                            {monthDaysGrid.map(cell => {
                                const count = countsByDay.get(cell.ymd) ?? 0;
                                return (
                                    <button
                                        key={cell.ymd}
                                        className={`${styles.calCell} ${!cell.inMonth ? styles.calCellMuted : ''} ${selectedDay === cell.ymd ? styles.calCellSelected : ''}`}
                                        onClick={() => setSelectedDay(cell.ymd)}
                                    >
                                        <div className={styles.calDayNum}>{cell.date.getDate()}</div>
                                        {count > 0 && <div className={styles.calCount}>{count}</div>}
                                    </button>
                                );
                            })}
                        </div>
                        <div className={styles.dayPanel}>
                            <div className={styles.dayPanelTitle}>{selectedDay ? `Ngày ${selectedDay}` : 'Chọn một ngày'}</div>
                            {dayList.map(a => (
                                <div key={a.id} className={styles.dayItem}>
                                    <div className={styles.dayItemMain}>
                                        <div className={styles.dayTime}>{fmtDateTime(a.start_time)}</div>
                                        <div className={styles.dayOwner}>{a.owner?.full_name} ({a.pet?.name})</div>
                                    </div>
                                    <div className={styles.actionGroup}>
                                        {a.status === 'pending' && !a.vet_id && (
                                            <button className={styles.buttonSmall} onClick={() => handleAccept(a.id)}>Nhận</button>
                                        )}
                                        {a.status === 'confirmed' && a.vet_id === user.id && (
                                            <button className={styles.buttonSmall} onClick={() => handleOpenCompleteModal(a)}>Khám xong</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <MedicalRecordModal
                isOpen={recordModalOpen}
                onClose={() => setRecordModalOpen(false)}
                mode="write"
                appointmentId={selectedAppointmentForRecord?.id || null}
                petId={selectedAppointmentForRecord?.pet?.id}
                petName={selectedAppointmentForRecord?.pet?.name || ''}
                vetId={user.id}
                onRecordSaved={() => {
                    setRecordModalOpen(false);
                    fetchAppointments();
                }}
            />
        </div>
    );
}