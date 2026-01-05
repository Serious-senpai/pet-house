'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import styles from './BoardingAnalytics.module.css';

// Màu sắc tương ứng với status badge của bạn
const COLORS = {
    pending: '#f59e0b',    // Cam
    confirmed: '#10b981',  // Xanh lá
    checked_in: '#3b82f6', // Xanh dương
    completed: '#9ca3af',  // Xám
    cancelled: '#ef4444'   // Đỏ
};

type StatData = {
    name: string;
    value: number;
    color: string;
};

export default function BoardingAnalytics() {
    const [data, setData] = useState<StatData[]>([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalBookings, setTotalBookings] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            // Lấy status và price của TẤT CẢ booking
            const { data: bookings, error } = await supabase
                .from('boarding_bookings')
                .select('status, total_price');

            if (error || !bookings) {
                console.error('Error fetching stats:', error);
                setLoading(false);
                return;
            }

            // 1. Tính tổng doanh thu
            const revenue = bookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
            setTotalRevenue(revenue);
            setTotalBookings(bookings.length);

            // 2. Gom nhóm theo status để vẽ biểu đồ
            const statusCounts: Record<string, number> = {
                pending: 0,
                confirmed: 0,
                checked_in: 0,
                completed: 0,
                cancelled: 0
            };

            bookings.forEach((b) => {
                const s = b.status as string;
                if (statusCounts[s] !== undefined) {
                    statusCounts[s]++;
                }
            });

            // Format dữ liệu cho Recharts
            const chartData = Object.keys(statusCounts)
                .filter(key => statusCounts[key] > 0) // Chỉ hiện status nào có dữ liệu
                .map((key) => ({
                    name: key.replace('_', ' ').toUpperCase(),
                    value: statusCounts[key],
                    color: COLORS[key as keyof typeof COLORS] || '#000'
                }));

            setData(chartData);
            setLoading(false);
        };

        fetchStats();
    }, []);

    if (loading) return <div className={styles.container}>Loading analytics...</div>;

    return (
        <div className={styles.container}>
            {/* Phần 1: Biểu đồ Tròn */}
            <div className={styles.chartSection}>
                <h3 className={styles.title}>Booking Status Distribution</h3>
                <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60} // Tạo biểu đồ Donut (rỗng giữa) nhìn hiện đại hơn
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            // Sửa dòng này: chỉ trả về value
                            formatter={(value: any) => value}
                        />
                    </PieChart>
                </ResponsiveContainer>

                {/* Custom Legend */}
                <div className={styles.customLegend}>
                    {data.map((entry) => (
                        <div key={entry.name} className={styles.legendItem}>
                            <div className={styles.colorBox} style={{ backgroundColor: entry.color }}></div>
                            <span>{entry.name} ({entry.value})</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Phần 2: Số liệu tổng quan */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Total Bookings</span>
                    <span className={styles.statValue}>{totalBookings}</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Total Revenue</span>
                    <span className={`${styles.statValue} ${styles.revenue}`}>
                        ${totalRevenue.toLocaleString()}
                    </span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Active (In Care)</span>
                    <span className={styles.statValue}>
                        {data.find(d => d.name === 'CHECKED IN')?.value || 0}
                    </span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Pending Request</span>
                    <span className={styles.statValue}>
                        {data.find(d => d.name === 'PENDING')?.value || 0}
                    </span>
                </div>
            </div>
        </div>
    );
}