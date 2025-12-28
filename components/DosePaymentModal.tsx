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
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

    useEffect(() => {
        const calculateSuggestedValue = async () => {
            if (!isOpen || !injection.dosage) return;

            const today = new Date().toISOString().split('T')[0];
            setPaymentDate(today);
            setPixAccount('');
            setNotes('');
            setError(null);
            setLoading(false);

            // If already has a value, use it
            if (injection.doseValue && injection.doseValue > 0) {
                setPaymentValue(injection.doseValue.toString());
                return;
            }

            try {
                // Extract dose value in mg (e.g., "2.5 mg" -> 2.5)
                const doseMatch = injection.dosage.match(/(\d+\.?\d*)/);
                if (!doseMatch) {
                    setPaymentValue('60');
                    return;
                }
                const doseMg = parseFloat(doseMatch[1]);

                // Fetch medications to find package prices
                const { data: medications } = await supabase
                    .from('medications')
                    .select('*')
                    .limit(1)
                    .single();

                if (!medications) {
                    setPaymentValue('60');
                    return;
                }

                // Define standard packages (doses and prices)
                const packages = [
                    { dose: 2.5, price: 160 },
                    { dose: 5.0, price: 230 },
                    { dose: 7.5, price: 300 },
                    { dose: 10.0, price: 370 },
                    { dose: 12.5, price: 440 },
                    { dose: 15.0, price: 510 }
                ];

                // Check if dose matches a package
                const matchingPackage = packages.find(pkg => Math.abs(pkg.dose - doseMg) < 0.01);
                if (matchingPackage) {
                    setPaymentValue(matchingPackage.price.toString());
                    return;
                }

                // If no package match, calculate based on sale_price (price per mg)
                const pricePerMg = parseFloat(medications.sale_price) || 24; // Default R$24/mg
                const calculatedValue = doseMg * pricePerMg;
                setPaymentValue(calculatedValue.toFixed(2));

            } catch (err) {
                console.error('Error calculating suggested value:', err);
                setPaymentValue('60'); // Fallback value
            }
        };

        calculateSuggestedValue();
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

            if (updateError) throw updateError;

            // If confirmed payment, also create a financial record for tracking
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Use the ISO date format (YYYY-MM-DD) for consistency in description
                const recordDate = injection.applicationDate || new Date().toISOString().split('T')[0];
                const { error: finError } = await supabase
                    .from('financial_records')
                    .insert([{
                        patient_id: injection.patient_id,
                        description: `Pagamento - Dose ${injection.dosage} (${recordDate})`,
                        amount: parseFloat(paymentValue) || 0,
                        status: 'Pago',
                        due_date: recordDate,
                        user_id: user.id
                    }]);
                if (finError) {
                    console.error('Error creating financial record:', finError);
                    // Don't throw here to avoid blocking the main success flow if it's just a sync issue
                }
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
        setShowRemoveConfirm(false);
        setLoading(true);
        setError(null);
        try {
            if (!injection.id) throw new Error('ID da dose não encontrado');

            // Mark as unpaid in injections table - KEEP the dose_value as a debt (modo "só registrar")
            const { error: updateError } = await supabase
                .from('injections')
                .update({ is_paid: false })
                .eq('id', injection.id);

            if (updateError) {
                console.error('Error updating injection:', updateError);
                throw updateError;
            }

            // Success: close modal and refresh data
            onClose();
            requestAnimationFrame(() => {
                onSuccess();
            });
        } catch (err: any) {
            console.error('Error removing payment:', err);
            setError(err.message || 'Erro ao alterar status');
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterValueOnly = async () => {
        setLoading(true);
        setError(null);
        try {
            if (!injection.id) throw new Error('ID da dose não encontrado');

            const { error } = await supabase
                .from('injections')
                .update({
                    dose_value: parseFloat(paymentValue) || 0,
                    is_paid: false
                })
                .eq('id', injection.id);

            if (error) throw error;

            onClose();
            requestAnimationFrame(() => {
                onSuccess();
            });
        } catch (err: any) {
            console.error('Error registering value:', err);
            setError(err.message || 'Erro ao registrar valor');
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
                                onClick={() => setShowRemoveConfirm(true)}
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

                    <div className="pt-4 flex flex-col gap-4">
                        <div className="flex gap-3">
                            {!isPaid && (
                                <button
                                    type="button"
                                    onClick={handleRegisterValueOnly}
                                    disabled={loading}
                                    className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex flex-col items-center justify-center gap-1 text-[10px] uppercase tracking-wider"
                                >
                                    <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
                                    SÓ REGISTRAR
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={loading}
                                className={`flex-[1.5] px-4 py-3 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex flex-col items-center justify-center gap-1 text-[10px] uppercase tracking-wider ${isPaid ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
                            >
                                {loading ? (
                                    <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin my-1"></div>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-xl">{isPaid ? 'save' : 'payments'}</span>
                                        {isPaid ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR E PAGAR'}
                                    </>
                                )}
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full py-1 text-slate-400 hover:text-slate-600 text-xs font-medium transition-colors"
                        >
                            Voltar para o histórico
                        </button>
                    </div>
                </form>
            </div>

            {/* Custom Confirmation Modal for Removing Payment */}
            {showRemoveConfirm && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 10001,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem',
                        backgroundColor: 'rgba(15, 23, 42, 0.7)',
                        backdropFilter: 'blur(4px)'
                    }}
                    onClick={() => setShowRemoveConfirm(false)}
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
                        <div className="px-6 py-5 bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-100">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-2xl">info</span>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">Confirmar Alteração</h2>
                                    <p className="text-sm text-slate-600">Marcar dose como pendente</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="mb-6">
                                <p className="text-slate-700 leading-relaxed mb-3">
                                    Deseja marcar esta dose como <strong>pendente</strong>?
                                </p>
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <p className="text-sm font-semibold text-amber-900">
                                        {injection.dosage} - {patientName}
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
                                <div className="flex items-start gap-2">
                                    <span className="material-symbols-outlined text-blue-600 text-lg flex-shrink-0 mt-0.5">info</span>
                                    <p className="text-sm text-blue-800">
                                        <strong>Importante:</strong> O valor permanecerá registrado como débito. Apenas o status de pagamento será alterado.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowRemoveConfirm(false)}
                                    className="flex-1 px-4 py-3 border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRemovePayment}
                                    disabled={loading}
                                    className="flex-1 px-4 py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Processando...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-lg">check</span>
                                            Confirmar
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DosePaymentModal;
