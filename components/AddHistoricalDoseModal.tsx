import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface AddHistoricalDoseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    patientId: string;
    patientName: string;
}

const AddHistoricalDoseModal: React.FC<AddHistoricalDoseModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    patientId,
    patientName
}) => {
    const [loading, setLoading] = useState(false);
    const [applicationDate, setApplicationDate] = useState('');
    const [dosage, setDosage] = useState('2.5');
    const [doseValue, setDoseValue] = useState('60');
    const [notes, setNotes] = useState('');
    const [isPaid, setIsPaid] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            // Default to today's date
            const today = new Date().toISOString().split('T')[0];
            setApplicationDate(today);
            setDosage('2.5');
            setDoseValue('60');
            setNotes('');
            setIsPaid(false);
            setError(null);
            setLoading(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            // Create the injection record
            const { error: insertError } = await supabase
                .from('injections')
                .insert([{
                    patient_id: patientId,
                    dosage: `${dosage} mg`,
                    notes: notes || 'Dose histórica',
                    status: 'Applied',
                    application_date: applicationDate,
                    dose_value: parseFloat(doseValue) || 0,
                    is_historical: true,
                    created_at: new Date(applicationDate).toISOString(),
                    user_id: user.id
                }]);

            if (insertError) throw insertError;

            // If marked as paid, create a financial record
            if (isPaid && parseFloat(doseValue) > 0) {
                await supabase
                    .from('financial_records')
                    .insert([{
                        patient_id: patientId,
                        description: `Pagamento - Dose ${dosage}mg (${applicationDate})`,
                        value: parseFloat(doseValue),
                        type: 'income',
                        status: 'Paid',
                        date: applicationDate,
                        user_id: user.id
                    }]);
            }

            onClose();
            requestAnimationFrame(() => {
                onSuccess();
            });

        } catch (err: any) {
            console.error('Error saving historical dose:', err);
            setError(err.message || 'Erro ao salvar dose histórica');
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
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-amber-50 to-orange-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined">history</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Dose Histórica</h2>
                            <p className="text-xs text-slate-500">{patientName}</p>
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

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800 flex items-start gap-2">
                            <span className="material-symbols-outlined text-base mt-0.5">info</span>
                            Use este formulário para registrar doses que foram aplicadas <strong>antes</strong> de usar este sistema.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                            <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-base">calendar_today</span>
                                Data da Aplicação
                            </span>
                        </label>
                        <input
                            required
                            type="date"
                            value={applicationDate}
                            onChange={(e) => setApplicationDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 font-mono"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Valor Cobrado</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-mono">R$</span>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={doseValue}
                                    onChange={(e) => setDoseValue(e.target.value)}
                                    className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Observações (opcional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ex: Primeira dose do protocolo"
                            rows={2}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 resize-none"
                        />
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                        <input
                            type="checkbox"
                            id="isPaid"
                            checked={isPaid}
                            onChange={(e) => setIsPaid(e.target.checked)}
                            className="w-5 h-5 text-green-600 rounded border-slate-300 focus:ring-green-500"
                        />
                        <label htmlFor="isPaid" className="flex-1 text-sm text-green-800 cursor-pointer">
                            <strong>Esta dose já foi paga</strong>
                            <span className="block text-xs text-green-600">Marque para registrar automaticamente o pagamento</span>
                        </label>
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
                            className="flex-1 px-4 py-2.5 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <span className="material-symbols-outlined text-base">history</span>
                            )}
                            Registrar Dose
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddHistoricalDoseModal;
