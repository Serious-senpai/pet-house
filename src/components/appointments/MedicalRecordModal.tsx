'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { MedicalRecord } from '@/types';
import styles from './MedicalRecordModal.module.css'; // Bạn tự tạo CSS tương tự các modal khác

interface Props {
    isOpen: boolean;
    onClose: () => void;
    mode: 'read' | 'write';
    appointmentId: string | null;
    petId?: string; // Cần khi write
    petName?: string;
    vetId?: string; // Cần khi write
    onRecordSaved?: () => void; // Callback để refresh list bên ngoài
}

export default function MedicalRecordModal({
    isOpen, onClose, mode, appointmentId, petId, vetId, petName, onRecordSaved
}: Props) {
    const [loading, setLoading] = useState(false);
    const [record, setRecord] = useState<MedicalRecord | null>(null);

    // Form states
    const [formData, setFormData] = useState({
        symptoms: '',
        diagnosis: '',
        treatment: '',
        prescription: '',
        doctor_notes: ''
    });

    useEffect(() => {
        if (isOpen && appointmentId) {
            // Nếu là read hoặc write (để check xem đã có record chưa), ta đều fetch thử
            fetchRecord();
        } else {
            resetForm();
        }
    }, [isOpen, appointmentId]);

    const resetForm = () => {
        setRecord(null);
        setFormData({
            symptoms: '', diagnosis: '', treatment: '', prescription: '', doctor_notes: ''
        });
    };

    const fetchRecord = async () => {
        if (!appointmentId) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('medical_records')
            .select('*')
            .eq('appointment_id', appointmentId)
            .maybeSingle();

        if (data) {
            setRecord(data as MedicalRecord);
            if (mode === 'read') {
                // Fill data để hiển thị
            }
        }
        setLoading(false);
    };

    const handleSubmit = async () => {
        if (!appointmentId || !petId || !vetId) return;

        setLoading(true);
        try {
            // 1. Insert Medical Record
            const { error: recordError } = await supabase
                .from('medical_records')
                .insert({
                    appointment_id: appointmentId,
                    pet_id: petId,
                    vet_id: vetId,
                    symptoms: formData.symptoms,
                    diagnosis: formData.diagnosis,
                    treatment: formData.treatment,
                    prescription: formData.prescription,
                    doctor_notes: formData.doctor_notes
                });

            if (recordError) throw recordError;

            // 2. Update Appointment Status to 'completed'
            const { error: appError } = await supabase
                .from('appointments')
                .update({ status: 'completed' })
                .eq('id', appointmentId);

            if (appError) throw appError;

            alert('Medical record saved and appointment completed!');
            if (onRecordSaved) onRecordSaved();
            onClose();

        } catch (error: any) {
            alert('Error saving record: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <h3 className={styles.title}>
                        {mode === 'write' ? '🩺 Write Medical Record' : '📄 Medical Report'}
                    </h3>
                    <button className={styles.closeButton} onClick={onClose}>✕</button>
                </div>

                {/* Body */}
                <div className={styles.body}>
                    {loading && <div className={styles.loading}>Loading record data...</div>}

                    {/* READ MODE */}
                    {!loading && mode === 'read' && record && (
                        <div className={styles.readSection}>
                            <div className={styles.readRow}>
                                <div className={styles.readLabel}>Diagnosis</div>
                                <div className={styles.readValue}>{record.diagnosis}</div>
                            </div>
                            <div className={styles.readRow}>
                                <div className={styles.readLabel}>Symptoms</div>
                                <div className={styles.readValue}>{record.symptoms || 'None'}</div>
                            </div>
                            <div className={styles.readRow}>
                                <div className={styles.readLabel}>Treatment</div>
                                <div className={styles.readValue}>{record.treatment || 'None'}</div>
                            </div>
                            <div className={styles.readRow}>
                                <div className={styles.readLabel}>Prescription</div>
                                <div className={styles.readValue}>{record.prescription || 'None'}</div>
                            </div>
                            <div className={styles.readRow}>
                                <div className={styles.readLabel}>Doctor Notes</div>
                                <div className={styles.readValue}>{record.doctor_notes || '-'}</div>
                            </div>
                            <div className={styles.metaInfo}>
                                Record created: {new Date(record.created_at).toLocaleString()}
                            </div>
                        </div>
                    )}

                    {/* WRITE MODE */}
                    {!loading && mode === 'write' && (
                        <>
                            <div className={styles.infoText}>
                                Creating record for pet: <strong>{petName}</strong>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Diagnosis <span>*</span></label>
                                <input
                                    className={styles.input}
                                    value={formData.diagnosis}
                                    onChange={e => setFormData({ ...formData, diagnosis: e.target.value })}
                                    placeholder="e.g. Parvovirus, Skin Infection..."
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Symptoms</label>
                                <textarea
                                    className={styles.textarea}
                                    value={formData.symptoms}
                                    onChange={e => setFormData({ ...formData, symptoms: e.target.value })}
                                    placeholder="Vomiting, fever, etc."
                                />
                            </div>

                            {/* Các trường Treatment, Prescription tương tự... */}

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Prescription</label>
                                <textarea
                                    className={styles.textarea}
                                    rows={4}
                                    value={formData.prescription}
                                    onChange={e => setFormData({ ...formData, prescription: e.target.value })}
                                    placeholder="Medicines prescribed..."
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Footer chỉ hiện khi WRITE MODE */}
                {!loading && mode === 'write' && (
                    <div className={styles.footer}>
                        <button className={styles.btnSecondary} onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            className={styles.btnPrimary}
                            onClick={handleSubmit}
                            disabled={!formData.diagnosis.trim()}
                        >
                            Save & Complete
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}