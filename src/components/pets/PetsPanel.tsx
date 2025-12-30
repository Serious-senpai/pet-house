'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Pet } from '@/types';
import styles from './PetsPanel.module.css';

type EditablePet = Pick<
    Pet,
    'id' | 'owner_id' | 'name' | 'date_of_birth' | 'breed' | 'weight_kg' | 'next_vaccination_date' | 'notes'
>;

function toDateInputValue(value: string | null): string {
    if (!value) return '';
    return value.length >= 10 ? value.slice(0, 10) : value;
}

function parseWeight(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) return null;
    return parsed;
}

export default function PetsPanel() {
    const { user } = useAuth();

    const isPetOwner = user?.role === 'pet_owner';

    const [pets, setPets] = useState<Pet[]>([]);
    const [loading, setLoading] = useState(false);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Edit modal
    const [editingPet, setEditingPet] = useState<Pet | null>(null);
    const [editDraft, setEditDraft] = useState({
        name: '',
        date_of_birth: '',
        breed: '',
        weight_kg: '',
        next_vaccination_date: '',
        notes: '',
    });

    // Add modal (pet owner)
    const [addOpen, setAddOpen] = useState(false);
    const [newPet, setNewPet] = useState({
        name: '',
        date_of_birth: '',
        breed: '',
        weight_kg: '',
        next_vaccination_date: '',
        notes: '',
    });

    const canEditPet = useMemo(() => {
        return (pet: Pet) => {
            if (!user) return false;
            if (user.role === 'pet_owner') return pet.owner_id === user.id;
            return true;
        };
    }, [user]);

    const fetchPets = async () => {
        if (!user) return;
        setLoading(true);
        setError(null);

        const query = supabase.from('pets').select('*').order('created_at', { ascending: false });
        const { data, error } = isPetOwner ? await query.eq('owner_id', user.id) : await query;

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        setPets((data as Pet[]) ?? []);
        setLoading(false);
    };

    useEffect(() => {
        setPets([]);
        setError(null);
        setEditingPet(null);
        setAddOpen(false);

        if (!user) return;
        void fetchPets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, user?.role]);

    useEffect(() => {
        if (!editingPet) return;

        setEditDraft({
            name: editingPet.name ?? '',
            date_of_birth: toDateInputValue(editingPet.date_of_birth),
            breed: editingPet.breed ?? '',
            weight_kg:
                editingPet.weight_kg === null || editingPet.weight_kg === undefined
                    ? ''
                    : String(editingPet.weight_kg),
            next_vaccination_date: toDateInputValue(editingPet.next_vaccination_date),
            notes: editingPet.notes ?? '',
        });
    }, [editingPet]);

    const resetNewPet = () => {
        setNewPet({
            name: '',
            date_of_birth: '',
            breed: '',
            weight_kg: '',
            next_vaccination_date: '',
            notes: '',
        });
    };

    const openAddModal = () => {
        if (!isPetOwner) return;
        setError(null);
        resetNewPet();
        setAddOpen(true);
    };

    const closeAddModal = () => setAddOpen(false);

    const handleCreatePet = async () => {
        if (!user) return;

        if (!isPetOwner) {
            setError('Only pet owners can add new pets.');
            return;
        }

        const name = newPet.name.trim();
        if (!name) {
            setError('Pet name is required.');
            return;
        }

        setSavingId('__new__');
        setError(null);

        const payload = {
            owner_id: user.id,
            name,
            date_of_birth: newPet.date_of_birth ? newPet.date_of_birth : null,
            breed: newPet.breed.trim() ? newPet.breed.trim() : null,
            weight_kg: parseWeight(newPet.weight_kg),
            next_vaccination_date: newPet.next_vaccination_date ? newPet.next_vaccination_date : null,
            notes: newPet.notes.trim() ? newPet.notes.trim() : null,
        };

        try {
            const { data, error } = await supabase.from('pets').insert(payload).select('*').single();
            if (error) {
                setError(error.message);
                return;
            }

            if (data) {
                setPets((prev) => [data as Pet, ...prev]);
            } else {
                await fetchPets();
            }

            closeAddModal();
            resetNewPet();
        } catch (err) {
            console.error('Add pet exception:', err);
            setError('Failed to add pet. Please try again.');
        } finally {
            setSavingId(null);
        }
    };

    const updatePet = async (petId: string, updates: Partial<EditablePet>) => {
        if (!user) return;

        const pet = pets.find((p) => p.id === petId);
        if (!pet) return;

        if (!canEditPet(pet)) {
            setError('You can only update pets you own.');
            return;
        }

        setSavingId(petId);
        setError(null);

        try {
            const { error } = await supabase
                .from('pets')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', petId);

            if (error) {
                setError(error.message);
                return;
            }

            await fetchPets();
        } catch (err) {
            console.error('Update pet exception:', err);
            setError('Failed to save changes. Please try again.');
        } finally {
            setSavingId(null);
        }
    };

    const deletePet = async (petId: string) => {
        if (!user) return;

        // theo nghiệp vụ hiện tại: chỉ pet_owner được remove
        if (!isPetOwner) {
            setError('Only pet owners can remove pets.');
            return;
        }

        const pet = pets.find((p) => p.id === petId);
        if (!pet) return;
        if (pet.owner_id !== user.id) {
            setError('You can only remove pets you own.');
            return;
        }

        setDeletingId(petId);
        setError(null);

        try {
            const { error } = await supabase.from('pets').delete().eq('id', petId);
            if (error) {
                setError(error.message);
                return;
            }

            setPets((prev) => prev.filter((p) => p.id !== petId));
        } catch (err) {
            console.error('Delete pet exception:', err);
            setError('Failed to remove pet. Please try again.');
        } finally {
            setDeletingId(null);
        }
    };

    const handleSaveEdit = async () => {
        if (!editingPet) return;

        const name = editDraft.name.trim();
        if (!name) {
            setError('Pet name is required.');
            return;
        }

        await updatePet(editingPet.id, {
            name,
            date_of_birth: editDraft.date_of_birth ? editDraft.date_of_birth : null,
            breed: editDraft.breed.trim() ? editDraft.breed.trim() : null,
            weight_kg: parseWeight(editDraft.weight_kg),
            next_vaccination_date: editDraft.next_vaccination_date ? editDraft.next_vaccination_date : null,
            notes: editDraft.notes.trim() ? editDraft.notes.trim() : null,
        });

        setEditingPet(null);
    };

    if (!user) return null;

    return (
        <div className={styles.panel}>
            <div className={styles.header}>
                <div>
                    <div className={styles.title}>{isPetOwner ? 'My Pets' : 'Pets'}</div>
                    <div className={styles.subtitle}>
                        {isPetOwner
                            ? 'Add/remove your pets and update their details.'
                            : 'Update pet details. (Pet owners can only edit their own pets.)'}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div className={styles.hint}>{loading ? 'Loading…' : `${pets.length} total`}</div>

                    {isPetOwner && (
                        <button
                            className={`${styles.button} ${styles.buttonPrimary}`}
                            onClick={openAddModal}
                            disabled={savingId === '__new__'}
                            title="Add a new pet"
                        >
                            Add Pet
                        </button>
                    )}
                </div>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {/* TABLE VIEW FOR ALL ROLES */}
            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.th}>Name</th>
                            <th className={styles.th}>Breed</th>
                            <th className={styles.th}>DOB</th>
                            <th className={styles.th}>Weight</th>
                            <th className={styles.th}>Next Vaccination</th>
                            <th className={styles.th}>Notes</th>
                            <th className={styles.th} style={{ width: isPetOwner ? 200 : 120 }}>
                                Actions
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {pets.map((pet) => {
                            const editable = canEditPet(pet);
                            return (
                                <tr key={pet.id} className={styles.tr}>
                                    <td className={styles.td}>{pet.name || '-'}</td>
                                    <td className={styles.td}>{pet.breed || '-'}</td>
                                    <td className={styles.td}>{toDateInputValue(pet.date_of_birth) || '-'}</td>
                                    <td className={styles.td}>
                                        {pet.weight_kg === null || pet.weight_kg === undefined ? '-' : `${pet.weight_kg} kg`}
                                    </td>
                                    <td className={styles.td}>{toDateInputValue(pet.next_vaccination_date) || '-'}</td>
                                    <td className={styles.td}>
                                        {pet.notes ? (
                                            <span className={styles.notes} title={pet.notes}>
                                                {pet.notes}
                                            </span>
                                        ) : (
                                            '-'
                                        )}
                                    </td>

                                    <td className={styles.td}>
                                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                            <button
                                                className={`${styles.button} ${styles.buttonPrimary}`}
                                                onClick={() => setEditingPet(pet)}
                                                disabled={!editable || savingId === pet.id}
                                                title={editable ? 'Edit pet' : 'You can only edit pets you own'}
                                            >
                                                Edit
                                            </button>

                                            {isPetOwner && (
                                                <button
                                                    className={`${styles.button} ${styles.buttonDanger}`}
                                                    onClick={() => deletePet(pet.id)}
                                                    disabled={!editable || deletingId === pet.id}
                                                    title={editable ? 'Remove pet' : 'You can only remove pets you own'}
                                                >
                                                    {deletingId === pet.id ? 'Removing…' : 'Remove'}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}

                        {!loading && pets.length === 0 && (
                            <tr>
                                <td className={styles.td} colSpan={7}>
                                    {isPetOwner ? 'No pets yet. Click “Add Pet” to create your first one.' : 'No pets found.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Pet Modal (pet owner) */}
            {addOpen && isPetOwner && (
                <div className={styles.modalOverlay} onClick={closeAddModal}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <div className={styles.modalTitle}>Add New Pet</div>
                            <button className={styles.modalClose} onClick={closeAddModal}>
                                ✕
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.form}>
                                <div className={styles.field}>
                                    <label className={styles.label}>Name *</label>
                                    <input
                                        className={styles.input}
                                        value={newPet.name}
                                        onChange={(e) => setNewPet((p) => ({ ...p, name: e.target.value }))}
                                        disabled={savingId === '__new__'}
                                        placeholder="e.g. Mochi"
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label className={styles.label}>Date of birth</label>
                                    <input
                                        type="date"
                                        className={styles.input}
                                        value={newPet.date_of_birth}
                                        onChange={(e) => setNewPet((p) => ({ ...p, date_of_birth: e.target.value }))}
                                        disabled={savingId === '__new__'}
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label className={styles.label}>Breed</label>
                                    <input
                                        className={styles.input}
                                        value={newPet.breed}
                                        onChange={(e) => setNewPet((p) => ({ ...p, breed: e.target.value }))}
                                        disabled={savingId === '__new__'}
                                        placeholder="e.g. Golden Retriever"
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label className={styles.label}>Weight (kg)</label>
                                    <input
                                        inputMode="decimal"
                                        className={styles.input}
                                        value={newPet.weight_kg}
                                        onChange={(e) => setNewPet((p) => ({ ...p, weight_kg: e.target.value }))}
                                        disabled={savingId === '__new__'}
                                        placeholder="e.g. 12.5"
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label className={styles.label}>Next vaccination date</label>
                                    <input
                                        type="date"
                                        className={styles.input}
                                        value={newPet.next_vaccination_date}
                                        onChange={(e) => setNewPet((p) => ({ ...p, next_vaccination_date: e.target.value }))}
                                        disabled={savingId === '__new__'}
                                    />
                                </div>

                                <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                                    <label className={styles.label}>Notes</label>
                                    <textarea
                                        className={styles.textarea}
                                        value={newPet.notes}
                                        onChange={(e) => setNewPet((p) => ({ ...p, notes: e.target.value }))}
                                        disabled={savingId === '__new__'}
                                        placeholder="Additional notes…"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            <button className={styles.button} onClick={closeAddModal} disabled={savingId === '__new__'}>
                                Cancel
                            </button>
                            <button
                                className={`${styles.button} ${styles.buttonPrimary}`}
                                onClick={handleCreatePet}
                                disabled={savingId === '__new__'}
                            >
                                {savingId === '__new__' ? 'Adding…' : 'Add Pet'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Pet Modal (all roles) */}
            {editingPet && (
                <div className={styles.modalOverlay} onClick={() => setEditingPet(null)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <div className={styles.modalTitle}>Edit Pet</div>
                            <button className={styles.modalClose} onClick={() => setEditingPet(null)}>
                                ✕
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.form}>
                                <div className={styles.field}>
                                    <label className={styles.label}>Name *</label>
                                    <input
                                        className={styles.input}
                                        value={editDraft.name}
                                        onChange={(e) => setEditDraft((p) => ({ ...p, name: e.target.value }))}
                                        disabled={savingId === editingPet.id}
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label className={styles.label}>Date of birth</label>
                                    <input
                                        type="date"
                                        className={styles.input}
                                        value={editDraft.date_of_birth}
                                        onChange={(e) => setEditDraft((p) => ({ ...p, date_of_birth: e.target.value }))}
                                        disabled={savingId === editingPet.id}
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label className={styles.label}>Breed</label>
                                    <input
                                        className={styles.input}
                                        value={editDraft.breed}
                                        onChange={(e) => setEditDraft((p) => ({ ...p, breed: e.target.value }))}
                                        disabled={savingId === editingPet.id}
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label className={styles.label}>Weight (kg)</label>
                                    <input
                                        inputMode="decimal"
                                        className={styles.input}
                                        value={editDraft.weight_kg}
                                        onChange={(e) => setEditDraft((p) => ({ ...p, weight_kg: e.target.value }))}
                                        disabled={savingId === editingPet.id}
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label className={styles.label}>Next vaccination date</label>
                                    <input
                                        type="date"
                                        className={styles.input}
                                        value={editDraft.next_vaccination_date}
                                        onChange={(e) => setEditDraft((p) => ({ ...p, next_vaccination_date: e.target.value }))}
                                        disabled={savingId === editingPet.id}
                                    />
                                </div>

                                <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                                    <label className={styles.label}>Notes</label>
                                    <textarea
                                        className={styles.textarea}
                                        value={editDraft.notes}
                                        onChange={(e) => setEditDraft((p) => ({ ...p, notes: e.target.value }))}
                                        disabled={savingId === editingPet.id}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            <button className={styles.button} onClick={() => setEditingPet(null)}>
                                Cancel
                            </button>
                            <button
                                className={`${styles.button} ${styles.buttonPrimary}`}
                                onClick={handleSaveEdit}
                                disabled={savingId === editingPet.id}
                            >
                                {savingId === editingPet.id ? 'Saving…' : 'Save changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
