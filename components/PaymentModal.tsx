import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Injection } from '../types';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    patientId: string;
    pendingInjections: Injection[];
    onSuccess: () => void;
}

const PIX_KEY = "61 98404-8711";
const PIX_NAME = "Renan Arakaki de Oliveira";

const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, patientId, pendingInjections, onSuccess }) => {
    const [mode, setMode] = useState<'menu' | 'credit' | 'debt' | 'pix' | 'success'>('menu');
    const [packages, setPackages] = useState<any[]>([]);
    const [selectedPackage, setSelectedPackage] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [paymentValue, setPaymentValue] = useState(0);

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setMode('menu');
            setSelectedPackage(null);
            setProcessing(false);
            fetchPackages();
        }
    }, [isOpen]);

    const fetchPackages = async () => {
        try {
            // Find Tirzepatida medication
            const { data: meds } = await supabase.from('medications').select('*').ilike('name', '%tirzepatida%').limit(1);
            if (meds && meds.length > 0) {
                const med = meds[0];
                // Try to get from localStorage (User preference)
                const localPackages = localStorage.getItem(`med_packages_${med.id}`);
                if (localPackages) {
                    setPackages(JSON.parse(localPackages));
                } else {
                    // Fallback to defaults
                    setPackages([
                        { dosage: 2.5, price: 250, enabled: true },
                        { dosage: 5, price: 400, enabled: true },
                        { dosage: 7.5, price: 550, enabled: true },
                        { dosage: 10, price: 700, enabled: true },
                        { dosage: 12.5, price: 850, enabled: true },
                        { dosage: 15, price: 1000, enabled: true },
                    ]);
                }
            } else {
                // Absolute fallback if no medication found
                setPackages([
                    { dosage: 2.5, price: 250, enabled: true },
                    { dosage: 5, price: 400, enabled: true },
                    { dosage: 7.5, price: 550, enabled: true },
                    { dosage: 10, price: 700, enabled: true },
                    { dosage: 12.5, price: 850, enabled: true },
                    { dosage: 15, price: 1000, enabled: true },
                ]);
            }
        } catch (err) {
            console.error('Error fetching packages', err);
        }
    };

    const handleSelectOption = (option: 'credit' | 'debt') => {
        if (option === 'credit') {
            setMode('credit');
        } else {
            const total = pendingInjections.reduce((sum, inj) => sum + (inj.doseValue || 0), 0);
            setPaymentValue(total);
            setMode('debt');
        }
    };

    const handleSelectPackage = (pkg: any) => {
        setSelectedPackage(pkg);
        setPaymentValue(pkg.price);
        setMode('pix');
    };

    const handleConfirmPayment = async () => {
        setProcessing(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            if (selectedPackage) {
                // CREDIT MODE: Add Record
                const { error } = await supabase.from('financial_records').insert({
                    patient_id: patientId,
                    user_id: user.id,
                    amount: paymentValue,
                    description: `Crédito - Pacote ${selectedPackage.dosage}mg`,
                    due_date: today,
                    status: 'Em Processamento'
                });
                if (error) throw error;
            } else {
                // DEBT MODE: Add Records (Processing)
                // Wait for admin approval to mark as paid

                // Create records
                const records = pendingInjections.map(inj => ({
                    patient_id: patientId,
                    user_id: user.id,
                    amount: inj.doseValue || 0,
                    description: `Pagamento - Dose ${inj.dosage} (Aguardando Confirmação)`,
                    due_date: today,
                    status: 'Em Processamento',
                    injection_id: inj.id
                }));

                if (records.length > 0) {
                    const { error } = await supabase.from('financial_records').insert(records);
                    if (error) throw error;
                }
            }

            setMode('success');
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 2000);

        } catch (err) {
            console.error(err);
            alert('Erro ao processar pagamento.');
            setProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg">Pagamento</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">

                    {mode === 'menu' && (
                        <div key="menu" className="space-y-4">
                            <button onClick={() => handleSelectOption('credit')} className="w-full p-6 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary hover:bg-primary/5 transition-all text-left group">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="size-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                        <span className="material-symbols-outlined text-2xl">add_card</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white text-lg group-hover:text-primary">Adicionar Crédito</h4>
                                        <p className="text-sm text-slate-500">Pagar adiantado (Pacotes)</p>
                                    </div>
                                </div>
                            </button>

                            <button onClick={() => handleSelectOption('debt')} className="w-full p-6 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all text-left group">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="size-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                                        <span className="material-symbols-outlined text-2xl">payments</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white text-lg group-hover:text-emerald-600">Quitar Débitos</h4>
                                        <p className="text-sm text-slate-500">Pagar pendências atuais</p>
                                    </div>
                                </div>
                                <div className="mt-2 pl-16">
                                    <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Total Pendente</span>
                                    <p className="text-2xl font-black text-slate-800 dark:text-white">
                                        {formatCurrency(pendingInjections.reduce((sum, i) => sum + (i.doseValue || 0), 0))}
                                    </p>
                                </div>
                            </button>
                        </div>
                    )}

                    {mode === 'credit' && (
                        <div key="credit" className="animate-slide-up">
                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Escolha um Pacote (Tirzepatida)</h4>
                            <div className="grid grid-cols-2 gap-3">
                                {packages.map((pkg, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSelectPackage(pkg)}
                                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary hover:bg-primary/5 transition-all text-center"
                                    >
                                        <div className="text-lg font-black text-slate-900 dark:text-white">{pkg.dosage} mg</div>
                                        <div className="text-sm font-bold text-emerald-600">{formatCurrency(pkg.price)}</div>
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setMode('menu')} className="mt-6 w-full py-3 text-slate-500 font-bold hover:text-slate-700">Voltar</button>
                        </div>
                    )}

                    {(mode === 'pix' || mode === 'debt') && (
                        <div key="payment" className="animate-slide-up text-center">
                            <div className="mb-6">
                                <p className="text-sm text-slate-500 mb-1">Valor a pagar</p>
                                <h2 className="text-4xl font-black text-slate-900 dark:text-white">{formatCurrency(paymentValue)}</h2>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-700 mb-6">
                                <p className="text-sm font-bold text-slate-500 mb-4">Chave PIX (Celular)</p>
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <code className="text-xl font-mono font-bold text-primary bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-dashed border-primary">
                                        {PIX_KEY}
                                    </code>
                                    <button onClick={() => navigator.clipboard.writeText(PIX_KEY.replace(/\D/g, ''))} className="p-2 text-slate-400 hover:text-primary">
                                        <span className="material-symbols-outlined">content_copy</span>
                                    </button>
                                </div>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{PIX_NAME}</p>
                            </div>

                            <button
                                onClick={handleConfirmPayment}
                                disabled={processing}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-70 flex items-center justify-center gap-2"
                            >
                                {processing ? <span className="material-symbols-outlined animate-spin">refresh</span> : <span className="material-symbols-outlined">check_circle</span>}
                                Confirmar Pagamento
                            </button>
                            <button onClick={() => setMode('menu')} className="mt-4 w-full py-2 text-slate-500 font-bold hover:text-slate-700">Voltar</button>
                        </div>
                    )}

                    {mode === 'success' && (
                        <div key="success" className="text-center py-10 animate-scale-in">
                            <div className="size-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-4xl">hourglass_top</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Pagamento em Análise</h3>
                            <p className="text-slate-500">Aguardando confirmação do administrador.</p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
