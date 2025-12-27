import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Injection } from '../types';

interface EditDoseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    injection: Injection;
}

const EditDoseModal: React.FC<EditDoseModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    injection
}) => {
    const [loading, setLoading] = useState(false);
    const [dosage, setDosage] = useState('');
    const [notes, setNotes] = useState('');
    const [status, setStatus] = useState<'Applied' | 'Skipped'>('Applied');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && injection) {
            // Parse dosage (remove " mg" suffix if present)
            const dosageNum = injection.dosage?.replace(/[^\d.]/g, '') || '2.5';
            setDosage(dosageNum);
            setNotes(injection.notes || '');
            setStatus(injection.status === 'Aplicada' ? 'Applied' : 'Skipped');
            setError(null);
            setLoading(false);
        }
    }, [isOpen, injection]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error: updateError } = await supabase
                .from('injections')
                .update({
                    dosage: `${dosage} mg`,
                    notes: notes,
                    status: status
                })
                .eq('id', injection.id);

            if (updateError) throw updateError;

            onClose();
            requestAnimationFrame(() => {
                onSuccess();
            });

        } catch (err: any) {
            console.error('Error updating dose:', err);
            setError(err.message || 'Erro ao atualizar dose');
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                backgroundColor: 'rgba(15, 23, 42, 0.5)',
                backdropFilter: 'blur(4px)'
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                style={{
                    backgroundColor: 'white',
                    borderRadius: '1rem',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    width: '100%',
                    maxWidth: '26rem',
                    overflow: 'hidden'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined">edit</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Editar Dose</h2>
                            <p className="text-xs text-slate-500">{injection.date}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2">
                            <span className="material-symbols-outlined text-base">error</span>
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Dosagem</label>
                        <div className="relative">
                            <input
                                required
                                type="number"
                                step="0.5"
                                min="0.5"
                                value={dosage}
                                onChange={(e) => setDosage(e.target.value)}
                                className="w-full pl-4 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 font-mono"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">mg</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Observações</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ex: Dose aplicada normalmente"
                            rows={2}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setStatus('Applied')}
                                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${status === 'Applied'
                                        ? 'bg-green-100 text-green-700 ring-2 ring-green-300'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-base">check_circle</span>
                                Aplicada
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatus('Skipped')}
                                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${status === 'Skipped'
                                        ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-base">block</span>
                                Pulada
                            </button>
                        </div>
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <span className="material-symbols-outlined text-base">save</span>
                            )}
                            Salvar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditDoseModal;
