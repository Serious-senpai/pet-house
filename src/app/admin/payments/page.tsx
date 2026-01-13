'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import styles from './AdminPayments.module.css'; // Sẽ tạo CSS ở dưới
import { DollarSign, Search, Calendar, CheckCircle, XCircle } from 'lucide-react';

export default function AdminPaymentsPage() {
    const { user } = useAuth();
    const router = useRouter();

    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all'); // all, paid, unpaid
    const [totalRevenue, setTotalRevenue] = useState(0);

    // Fetch data
    useEffect(() => {
        if (!user) return;
        if (user.role !== 'admin') {
            router.push('/');
            return;
        }

        const fetchPayments = async () => {
            setLoading(true);
            try {
                // Lấy tất cả booking đã check-in hoặc completed (đã phát sinh phí)
                const { data, error } = await supabase
                    .from('boarding_bookings')
                    .select(`
                        id, total_price, payment_status, status, check_in_date, check_out_date,
                        owner:profiles!owner_id(full_name, email),
                        pet:pets(name, breed)
                    `)
                    .in('status', ['checked_in', 'completed']) // Chỉ lấy đơn đang ở hoặc đã xong
                    .order('check_out_date', { ascending: false });

                if (error) throw error;

                setPayments(data || []);

                // Tính tổng doanh thu (chỉ tính những đơn đã PAID)
                const total = (data || [])
                    .filter((p: any) => p.payment_status === 'paid')
                    .reduce((acc: number, curr: any) => acc + (curr.total_price || 0), 0);
                setTotalRevenue(total);

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchPayments();
    }, [user, router]);

    // Filter & Search logic
    const filteredPayments = payments.filter(p => {
        const matchesSearch =
            p.owner?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.pet?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.id.includes(searchTerm);

        const matchesFilter =
            filter === 'all' ? true : p.payment_status === filter;

        return matchesSearch && matchesFilter;
    });

    // Helper đổi màu badge
    const getStatusColor = (status: string) => {
        return status === 'paid'
            ? { bg: '#dcfce7', color: '#166534', icon: <CheckCircle size={14} /> } // Green
            : { bg: '#fee2e2', color: '#991b1b', icon: <XCircle size={14} /> };   // Red
    };

    if (loading) return <div className={styles.loading}>Loading payment history...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Payment History</h1>
                    <p className={styles.subtitle}>Track boarding revenues and payment status</p>
                </div>
                <div className={styles.revenueCard}>
                    <div className={styles.revenueLabel}>Total Revenue (Paid)</div>
                    <div className={styles.revenueValue}>${totalRevenue.toFixed(2)}</div>
                </div>
            </div>

            <div className={styles.controls}>
                <div className={styles.searchBox}>
                    <Search className={styles.searchIcon} size={18} />
                    <input
                        type="text"
                        placeholder="Search owner, pet, or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className={styles.filters}>
                    <button onClick={() => setFilter('all')} className={filter === 'all' ? styles.activeFilter : ''}>All</button>
                    <button onClick={() => setFilter('paid')} className={filter === 'paid' ? styles.activeFilter : ''}>Paid</button>
                    <button onClick={() => setFilter('unpaid')} className={filter === 'unpaid' ? styles.activeFilter : ''}>Unpaid</button>
                </div>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Booking Info</th>
                            <th>Pet Owner</th>
                            <th>Stay Duration</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Payment</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPayments.length === 0 ? (
                            <tr><td colSpan={6} className={styles.empty}>No payment records found.</td></tr>
                        ) : (
                            filteredPayments.map((p) => {
                                const style = getStatusColor(p.payment_status);
                                return (
                                    <tr key={p.id}>
                                        <td>
                                            <div className={styles.cellMain}>{p.pet?.name}</div>
                                            <div className={styles.cellSub}>#{p.id.slice(0, 8)}</div>
                                        </td>
                                        <td>
                                            <div className={styles.cellMain}>{p.owner?.full_name}</div>
                                            <div className={styles.cellSub}>{p.owner?.email}</div>
                                        </td>
                                        <td>
                                            <div className={styles.dateRow}>
                                                <Calendar size={12} style={{ marginRight: 4 }} />
                                                {new Date(p.check_in_date).toLocaleDateString()}
                                            </div>
                                            <div className={styles.cellSub}>to {new Date(p.check_out_date).toLocaleDateString()}</div>
                                        </td>
                                        <td className={styles.amount}>
                                            ${p.total_price?.toFixed(2)}
                                        </td>
                                        <td>
                                            <span className={styles.statusBadge}>{p.status}</span>
                                        </td>
                                        <td>
                                            <span
                                                className={styles.paymentBadge}
                                                style={{ backgroundColor: style.bg, color: style.color }}
                                            >
                                                {style.icon}
                                                <span style={{ marginLeft: 4, textTransform: 'capitalize' }}>{p.payment_status || 'Unpaid'}</span>
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}