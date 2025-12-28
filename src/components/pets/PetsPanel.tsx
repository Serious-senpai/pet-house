'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Pet } from '@/types';
import styles from './PetsPanel.module.css';

type EditablePet = Pick<Pet, 'id' | 'owner_id' | 'name' | 'date_of_birth' | 'breed' | 'weight_kg' | 'next_vaccination_date' | 'notes'>;

function toDateInputValue(value: string | null): string {
    if (!value) return '';
    // Accept either YYYY-MM-DD or ISO; normalize to YYYY-MM-DD.
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
        const { data, error } = isPetOwner
            ? await query.eq('owner_id', user.id)
            : await query;

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
        if (!user) return;
        void fetchPets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, user?.role]);

    const handleAddPet = async (e: React.FormEvent) => {
        e.preventDefault();
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

            setNewPet({
                name: '',
                date_of_birth: '',
                breed: '',
                weight_kg: '',
                next_vaccination_date: '',
                notes: '',
            });

            // Optimistic update; also keeps UI snappy.
            if (data) {
                setPets((prev) => [data as Pet, ...prev]);
            } else {
                await fetchPets();
            }
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
                <div className={styles.hint}>{loading ? 'Loading…' : `${pets.length} total`}</div>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {isPetOwner && (
                <div className={styles.addBlock}>
                    <form onSubmit={handleAddPet} className={styles.form}>
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="petName">Name *</label>
                            <input
                                id="petName"
                                className={styles.input}
                                value={newPet.name}
                                onChange={(e) => setNewPet((p) => ({ ...p, name: e.target.value }))}
                                placeholder="e.g. Mochi"
                                disabled={savingId === '__new__'}
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="petDob">Date of birth</label>
                            <input
                                id="petDob"
                                type="date"
                                className={styles.input}
                                value={newPet.date_of_birth}
                                onChange={(e) => setNewPet((p) => ({ ...p, date_of_birth: e.target.value }))}
                                disabled={savingId === '__new__'}
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="petBreed">Breed</label>
                            <input
                                id="petBreed"
                                className={styles.input}
                                value={newPet.breed}
                                onChange={(e) => setNewPet((p) => ({ ...p, breed: e.target.value }))}
                                placeholder="e.g. Golden Retriever"
                                disabled={savingId === '__new__'}
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="petWeight">Weight (kg)</label>
                            <input
                                id="petWeight"
                                inputMode="decimal"
                                className={styles.input}
                                value={newPet.weight_kg}
                                onChange={(e) => setNewPet((p) => ({ ...p, weight_kg: e.target.value }))}
                                placeholder="e.g. 12.5"
                                disabled={savingId === '__new__'}
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="petVacc">Next vaccination date</label>
                            <input
                                id="petVacc"
                                type="date"
                                className={styles.input}
                                value={newPet.next_vaccination_date}
                                onChange={(e) => setNewPet((p) => ({ ...p, next_vaccination_date: e.target.value }))}
                                disabled={savingId === '__new__'}
                            />
                        </div>

                        <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                            <label className={styles.label} htmlFor="petNotes">Notes</label>
                            <textarea
                                id="petNotes"
                                className={styles.textarea}
                                value={newPet.notes}
                                onChange={(e) => setNewPet((p) => ({ ...p, notes: e.target.value }))}
                                placeholder="Additional notes…"
                                disabled={savingId === '__new__'}
                            />
                        </div>

                        <div className={styles.actions} style={{ gridColumn: '1 / -1', justifyContent: 'flex-end' }}>
                            <button
                                type="submit"
                                className={`${styles.button} ${styles.buttonPrimary}`}
                                disabled={savingId === '__new__'}
                            >
                                {savingId === '__new__' ? 'Adding…' : 'Add Pet'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className={styles.grid}>
                {pets.map((pet) => {
                    const editable = canEditPet(pet);
                    return (
                        <PetCard
                            key={pet.id}
                            pet={pet}
                            editable={editable}
                            isPetOwner={isPetOwner}
                            saving={savingId === pet.id}
                            deleting={deletingId === pet.id}
                            onSave={(updates) => updatePet(pet.id, updates)}
                            onDelete={() => deletePet(pet.id)}
                        />
                    );
                })}

                {!loading && pets.length === 0 && (
                    <div className={styles.hint}>
                        {isPetOwner ? 'No pets yet. Add your first pet above.' : 'No pets found.'}
                    </div>
                )}
            </div>
        </div>
    );
}

function PetCard({
    pet,
    editable,
    isPetOwner,
    saving,
    deleting,
    onSave,
    onDelete,
}: {
    pet: Pet;
    editable: boolean;
    isPetOwner: boolean;
    saving: boolean;
    deleting: boolean;
    onSave: (updates: Partial<EditablePet>) => void;
    onDelete: () => void;
}) {
    const [draft, setDraft] = useState({
        name: pet.name ?? '',
        date_of_birth: toDateInputValue(pet.date_of_birth),
        breed: pet.breed ?? '',
        weight_kg: pet.weight_kg === null || pet.weight_kg === undefined ? '' : String(pet.weight_kg),
        next_vaccination_date: toDateInputValue(pet.next_vaccination_date),
        notes: pet.notes ?? '',
    });

    useEffect(() => {
        setDraft({
            name: pet.name ?? '',
            date_of_birth: toDateInputValue(pet.date_of_birth),
            breed: pet.breed ?? '',
            weight_kg: pet.weight_kg === null || pet.weight_kg === undefined ? '' : String(pet.weight_kg),
            next_vaccination_date: toDateInputValue(pet.next_vaccination_date),
            notes: pet.notes ?? '',
        });
    }, [pet]);

    const handleSave = () => {
        const name = draft.name.trim();
        if (!name) return;

        onSave({
            name,
            date_of_birth: draft.date_of_birth ? draft.date_of_birth : null,
            breed: draft.breed.trim() ? draft.breed.trim() : null,
            weight_kg: parseWeight(draft.weight_kg),
            next_vaccination_date: draft.next_vaccination_date ? draft.next_vaccination_date : null,
            notes: draft.notes.trim() ? draft.notes.trim() : null,
        });
    };

    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <div className={styles.petName}>{pet.name}</div>
                <div className={styles.actions}>
                    <button
                        className={`${styles.button} ${styles.buttonPrimary}`}
                        onClick={handleSave}
                        disabled={!editable || saving}
                        title={editable ? 'Save changes' : 'You can only edit pets you own'}
                    >
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                    {isPetOwner && (
                        <button
                            className={`${styles.button} ${styles.buttonDanger}`}
                            onClick={onDelete}
                            disabled={!editable || deleting}
                            title={editable ? 'Remove pet' : 'You can only remove pets you own'}
                        >
                            {deleting ? 'Removing…' : 'Remove'}
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.form}>
                <div className={styles.field}>
                    <label className={styles.label}>Name</label>
                    <input
                        className={styles.input}
                        value={draft.name}
                        onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                        disabled={!editable || saving}
                    />
                </div>

                <div className={styles.field}>
                    <label className={styles.label}>Date of birth</label>
                    <input
                        type="date"
                        className={styles.input}
                        value={draft.date_of_birth}
                        onChange={(e) => setDraft((p) => ({ ...p, date_of_birth: e.target.value }))}
                        disabled={!editable || saving}
                    />
                </div>

                <div className={styles.field}>
                    <label className={styles.label}>Breed</label>
                    <input
                        className={styles.input}
                        value={draft.breed}
                        onChange={(e) => setDraft((p) => ({ ...p, breed: e.target.value }))}
                        disabled={!editable || saving}
                    />
                </div>

                <div className={styles.field}>
                    <label className={styles.label}>Weight (kg)</label>
                    <input
                        inputMode="decimal"
                        className={styles.input}
                        value={draft.weight_kg}
                        onChange={(e) => setDraft((p) => ({ ...p, weight_kg: e.target.value }))}
                        disabled={!editable || saving}
                    />
                </div>

                <div className={styles.field}>
                    <label className={styles.label}>Next vaccination date</label>
                    <input
                        type="date"
                        className={styles.input}
                        value={draft.next_vaccination_date}
                        onChange={(e) => setDraft((p) => ({ ...p, next_vaccination_date: e.target.value }))}
                        disabled={!editable || saving}
                    />
                </div>

                <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.label}>Notes</label>
                    <textarea
                        className={styles.textarea}
                        value={draft.notes}
                        onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))}
                        disabled={!editable || saving}
                    />
                </div>
            </div>
        </div>
    );
}
