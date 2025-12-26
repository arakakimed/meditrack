import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface AddMedicationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    medicationToEdit?: any;
}

const AddMedicationModal: React.FC<AddMedicationModalProps> = ({ isOpen, onClose, onSuccess, medicationToEdit }) => {
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [supplier, setSupplier] = useState('');
    const [stock, setStock] = useState('0');
    const [costPrice, setCostPrice] = useState('0');
    const [salePrice, setSalePrice] = useState('0');
    const [concentrationMgMl, setConcentrationMgMl] = useState('20');
    const [totalMgPerVial, setTotalMgPerVial] = useState('10');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (medicationToEdit) {
                setName(medicationToEdit.name || '');
                setSupplier(medicationToEdit.supplier || '');
                setStock(medicationToEdit.stock?.toString() || '0');
                setCostPrice(medicationToEdit.cost_price?.toString() || '0');
                setSalePrice(medicationToEdit.sale_price?.toString() || '0');
                setConcentrationMgMl(medicationToEdit.concentration_mg_ml?.toString() || '20');
                setTotalMgPerVial(medicationToEdit.total_mg_per_vial?.toString() || '10');
            } else {
                setName('');
                setSupplier('');
                setStock('0');
                setCostPrice('0');
                setSalePrice('0');
                setConcentrationMgMl('20');
                setTotalMgPerVial('10');
            }
            setError(null);
            setLoading(false);
        }
    }, [medicationToEdit, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            const conc = parseFloat(concentrationMgMl) || 1;
            const totalMg = parseFloat(totalMgPerVial) || 0;
            const volume = totalMg / conc;

            const medData = {
                name,
                supplier,
                stock: parseInt(stock) || 0,
                cost_price: parseFloat(costPrice) || 0,
                sale_price: parseFloat(salePrice) || 0,
                concentration_mg_ml: conc,
                total_mg_per_vial: totalMg,
                volume_ml_per_vial: isFinite(volume) ? volume : 0,
                user_id: user.id
            };

            if (medicationToEdit?.id) {
                const { error: updateError } = await supabase
                    .from('medications')
                    .update(medData)
                    .eq('id', medicationToEdit.id);
                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('medications')
                    .insert([medData]);
                if (insertError) throw insertError;
            }

            // Close the modal first
            onClose();

            // Schedule the refresh for next frame to avoid reconciliation issues
            requestAnimationFrame(() => {
                onSuccess();
            });

        } catch (err: any) {
            console.error('Error saving medication:', err);
            setError(err.message || 'Erro ao salvar medicação');
            setLoading(false);
        }
    };

    const calculatedVolume = (() => {
        const c = parseFloat(concentrationMgMl) || 1;
        const t = parseFloat(totalMgPerVial) || 0;
        return (t / c).toFixed(2);
    })();

    const calculatedUI = (() => {
        const c = parseFloat(concentrationMgMl) || 1;
        const t = parseFloat(totalMgPerVial) || 0;
        return ((t / c) * 100).toFixed(0);
    })();

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
                    overflow: 'hidden',
                    maxHeight: '90vh',
                    overflowY: 'auto'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0">
                    <h2 className="text-xl font-bold text-slate-900">
                        {medicationToEdit ? 'Editar Medicação' : 'Nova Medicação'}
                    </h2>
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
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Nome da Medicação</label>
                            <input
                                required
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900"
                                placeholder="Ex: Tirzepatida 2.5mg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Fornecedor</label>
                            <input
                                type="text"
                                value={supplier}
                                onChange={(e) => setSupplier(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900"
                                placeholder="Ex: Farmácia X"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Concentração</label>
                                <div className="relative">
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        value={concentrationMgMl}
                                        onChange={(e) => setConcentrationMgMl(e.target.value)}
                                        className="w-full pl-4 pr-16 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 font-mono"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">mg/mL</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Conteúdo Total</label>
                                <div className="relative">
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        value={totalMgPerVial}
                                        onChange={(e) => setTotalMgPerVial(e.target.value)}
                                        className="w-full pl-4 pr-12 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 font-mono"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">mg</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-500">calculate</span>
                                <span className="text-xs font-medium text-slate-600">Volume Resultante:</span>
                            </div>
                            <div className="text-right">
                                <span className="text-sm font-bold text-blue-600">{calculatedVolume} mL</span>
                                <span className="text-[10px] block text-slate-500">(ou {calculatedUI} UI)</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Estoque Inicial</label>
                            <div className="relative">
                                <input
                                    required
                                    type="number"
                                    value={stock}
                                    onChange={(e) => setStock(e.target.value)}
                                    className="w-full pl-4 pr-16 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 font-mono"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">FRASCOS</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Custo (Frasco)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-mono">R$</span>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        value={costPrice}
                                        onChange={(e) => setCostPrice(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 font-mono"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Venda (Dose)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-mono">R$</span>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        value={salePrice}
                                        onChange={(e) => setSalePrice(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 font-mono"
                                    />
                                </div>
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
                            className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <span className="material-symbols-outlined text-base">save</span>
                            )}
                            {medicationToEdit ? 'Salvar Alterações' : 'Cadastrar Medicação'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddMedicationModal;
