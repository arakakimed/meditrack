import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Injection } from '../types';

interface DosePaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    injection: Injection;
    patientName: string;
}

const DosePaymentModal: React.FC<DosePaymentModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    injection,
    patientName
}) => {
    const [loading, setLoading] = useState(false);
    const [paymentDate, setPaymentDate] = useState('');
    const [paymentValue, setPaymentValue] = useState('60');
    const [pixAccount, setPixAccount] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            const today = new Date().toISOString().split('T')[0];
            setPaymentDate(today);
            setPaymentValue(injection.doseValue?.toString() || '60');
            setPixAccount('');
            setNotes('');
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
            if (!injection.id) throw new Error('ID da dose não encontrado');

            // Try updating with dose_value first
            let updateError;
            try {
                const { error } = await supabase
                    .from('injections')
                    .update({
                        is_paid: true,
                        dose_value: parseFloat(paymentValue) || 0
                    })
                    .eq('id', injection.id);
                updateError = error;
            } catch (err: any) {
                // If dose_value doesn't exist, try just is_paid
                console.warn('Initial update with dose_value failed, attempting fallback to update only is_paid:', err);
                const { error } = await supabase
                    .from('injections')
                    .update({ is_paid: true })
                    .eq('id', injection.id);
                updateError = error;
            }

            if (updateError) {
                // Fallback: try updating just is_paid if the combined update failed
                // This block will only be reached if updateError is still present after the try-catch,
                // meaning either the initial update failed and the fallback also failed,
                // or the initial update failed and the catch block didn't properly clear updateError.
                // Given the catch block already attempts a fallback, this might be redundant
                // but is included as per instruction.
                console.warn('Second fallback attempt for updating only is_paid due to previous error:', updateError);
                const { error: fallbackError } = await supabase
                    .from('injections')
                    .update({ is_paid: true })
                    .eq('id', injection.id);

                if (fallbackError) throw fallbackError;
            }

            onClose();
            requestAnimationFrame(() => {
                onSuccess();
            });

        } catch (err: any) {
            console.error('Error saving payment:', err);
            setError(err.message || 'Erro ao salvar pagamento');
            setLoading(false);
        }
    };

    const handleRemovePayment = async () => {
        if (!confirm('Deseja remover o registro de pagamento desta dose?')) return;

        setLoading(true);
        setError(null);
        try {
            if (!injection.id) throw new Error('ID da dose não encontrado');

            // Try updating both is_paid and dose_value
            let updateError;
            try {
                const { error } = await supabase
                    .from('injections')
                    .update({
                        is_paid: false,
                        dose_value: 0
                    })
                    .eq('id', injection.id);
                updateError = error;
            } catch (err) {
                // Fallback for missing dose_value column
                const { error } = await supabase
                    .from('injections')
                    .update({ is_paid: false })
                    .eq('id', injection.id);
                updateError = error;
            }

            if (updateError) throw updateError;

            onClose();
            requestAnimationFrame(() => {
                onSuccess();
            });
        } catch (err: any) {
            console.error('Error removing payment:', err);
            setError(err.message || 'Erro ao remover pagamento');
            setLoading(false);
        }
    };

    const isPaid = injection.isPaid;

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
                {/* Header */}
                <div className={`px-6 py-4 border-b flex justify-between items-center ${isPaid ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-100' : 'bg-gradient-to-r from-slate-50 to-gray-50 border-slate-100'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPaid ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}>
                            <span className="material-symbols-outlined">{isPaid ? 'check_circle' : 'payments'}</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                {isPaid ? 'Pagamento Registrado' : 'Registrar Pagamento'}
                            </h2>
                            <p className="text-xs text-slate-500">{injection.dosage} • {patientName}</p>
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

                    {/* Status Badge */}
                    {isPaid && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-green-600">verified</span>
                                <span className="text-sm font-medium text-green-800">Esta dose está paga</span>
                            </div>
                            <button
                                type="button"
                                onClick={handleRemovePayment}
                                className="text-xs text-red-500 hover:text-red-700 font-medium"
                            >
                                Remover
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">calendar_today</span>
                                    Data do Pagamento
                                </span>
                            </label>
                            <input
                                required
                                type="date"
                                value={paymentDate}
                                onChange={(e) => setPaymentDate(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Valor</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-mono">R$</span>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={paymentValue}
                                    onChange={(e) => setPaymentValue(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 text-sm font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                            <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">pix</span>
                                Chave PIX / Conta
                            </span>
                        </label>
                        <input
                            type="text"
                            value={pixAccount}
                            onChange={(e) => setPixAccount(e.target.value)}
                            placeholder="Ex: banco@clinica.com.br"
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Observações</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ex: Pago via PIX instantâneo"
                            rows={2}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 text-sm resize-none"
                        />
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`flex-1 px-4 py-2.5 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm ${isPaid ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <span className="material-symbols-outlined text-base">{isPaid ? 'save' : 'check_circle'}</span>
                            )}
                            {isPaid ? 'Atualizar' : 'Confirmar Pagamento'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DosePaymentModal;
