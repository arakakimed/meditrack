import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface AdjustStockModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStockUpdate: (medicationId: string, newStock: number) => void;
    initialMedication?: any;
    allMedications?: any[];
}

const AdjustStockModal: React.FC<AdjustStockModalProps> = ({ isOpen, onClose, onStockUpdate, initialMedication, allMedications = [] }) => {
    const [loading, setLoading] = useState(false);
    const [selectedMedId, setSelectedMedId] = useState('');
    const [operation, setOperation] = useState<'add' | 'subtract'>('add');
    const [amount, setAmount] = useState('1');
    const [reason, setReason] = useState('Compra');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (initialMedication) {
                setSelectedMedId(initialMedication.id);
            } else if (allMedications.length > 0) {
                setSelectedMedId(allMedications[0].id);
            }
            // Reset form
            setAmount('1');
            setOperation('add');
            setReason('Compra');
            setError(null);
            setLoading(false);
        }
    }, [isOpen, initialMedication, allMedications]);

    // Don't render anything if not open
    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const med = allMedications.find(m => m.id === selectedMedId) || initialMedication;
            if (!med) throw new Error('Selecione um medicamento');

            const currentStock = Number(med.stock) || 0;
            const adjustment = parseInt(amount);

            if (isNaN(adjustment) || adjustment <= 0) throw new Error('Quantidade inválida');

            const newStock = operation === 'add' ? currentStock + adjustment : currentStock - adjustment;

            if (newStock < 0) throw new Error('O estoque não pode ser negativo');

            const { error: updateError } = await supabase
                .from('medications')
                .update({ stock: newStock })
                .eq('id', selectedMedId);

            if (updateError) throw updateError;

            // Update parent state and close - use requestAnimationFrame to ensure clean update
            const medId = selectedMedId;
            const stock = newStock;

            // Schedule state update for next frame to avoid React reconciliation issues
            requestAnimationFrame(() => {
                onStockUpdate(medId, stock);
            });

            onClose();

        } catch (err: any) {
            console.error('Error adjusting stock:', err);
            setError(err.message || 'Erro ao ajustar estoque');
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
                    maxWidth: '28rem',
                    overflow: 'hidden'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h2 className="text-xl font-bold text-slate-900">Ajustar Estoque</h2>
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

                    <div className="space-y-4">
                        {!initialMedication && (
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Medicamento</label>
                                <select
                                    value={selectedMedId}
                                    onChange={(e) => setSelectedMedId(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900"
                                >
                                    <option value="">Selecione...</option>
                                    {allMedications.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {initialMedication && (
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <label className="block text-xs font-bold text-slate-500 uppercase">Medicamento</label>
                                <p className="text-slate-900 font-semibold">{initialMedication.name}</p>
                                <p className="text-xs text-slate-500">Estoque atual: {initialMedication.stock} frascos</p>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setOperation('add')}
                                className={`flex-1 py-2 rounded-xl border transition-all flex items-center justify-center gap-2 font-semibold ${operation === 'add' ? 'bg-green-500 text-white border-green-500' : 'bg-white text-slate-600 border-slate-200'}`}
                            >
                                <span className="material-symbols-outlined text-base">add_circle</span>
                                Adicionar
                            </button>
                            <button
                                type="button"
                                onClick={() => setOperation('subtract')}
                                className={`flex-1 py-2 rounded-xl border transition-all flex items-center justify-center gap-2 font-semibold ${operation === 'subtract' ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-slate-600 border-slate-200'}`}
                            >
                                <span className="material-symbols-outlined text-base">remove_circle</span>
                                Remover
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Quantidade</label>
                                <input
                                    required
                                    type="number"
                                    min="1"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Motivo</label>
                                <select
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900"
                                >
                                    <option value="Compra">Compra</option>
                                    <option value="Ajuste">Ajuste de Saldo</option>
                                    <option value="Perda">Perda / Avaria</option>
                                    <option value="Outro">Outro</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
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
                            className={`flex-1 px-4 py-2.5 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${operation === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <span className="material-symbols-outlined text-base">task_alt</span>
                            )}
                            Confirmar Ajuste
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdjustStockModal;
