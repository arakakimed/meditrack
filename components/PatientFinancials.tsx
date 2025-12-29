import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Patient, Injection } from '../types';

interface FinancialRecord {
    id: string;
    patient_id: string;
    amount: number;
    description: string;
    due_date: string;
    status: 'Pendente' | 'Pago' | 'Atrasado' | 'Em Processamento';
    injection_id?: string;
    created_at: string;
}

interface PatientFinancialsProps {
    patient: Patient;
    injections: Injection[];
    onUpdate: () => void;
}

const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    // Handle YYYY-MM-DD or ISO
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
};

import { PaymentModal } from './PaymentModal';

export const PatientFinancials: React.FC<PatientFinancialsProps> = ({ patient, injections, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    // Filter pending injections (doses that are NOT paid)
    const pendingInjections = injections.filter(inj => !inj.isPaid && (inj.doseValue || 0) > 0);

    const fetchFinancialRecords = async () => {
        // ... (existing fetch logic)
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('financial_records')
                .select('*')
                .eq('patient_id', patient.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setFinancialRecords(data || []);
        } catch (error) {
            console.error('Error fetching financial records:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFinancialRecords();
    }, [patient.id]);

    const handlePayInjection = async (injection: Injection) => {
        // ... (existing logic)
        if (!injection.id) return;
        setProcessingId(injection.id);
        try {
            const { error: finError } = await supabase.from('financial_records').insert({
                patient_id: patient.id,
                amount: injection.doseValue || 0,
                description: `Pagamento - Dose ${injection.dosage} (${formatDate(injection.applicationDate)})`,
                due_date: new Date().toISOString().split('T')[0],
                status: 'Pago',
                injection_id: injection.id
            });
            if (finError) throw finError;
            const { error: injError } = await supabase.from('injections').update({ is_paid: true }).eq('id', injection.id);
            if (injError) throw injError;
            onUpdate();
            fetchFinancialRecords();
        } catch (error) { console.error(error); alert('Erro ao processar pagamento.'); }
        finally { setProcessingId(null); }
    };

    const handleDeletePayment = async (record: FinancialRecord) => {
        // ... (existing logic)
        if (!confirm('Tem certeza que deseja excluir este pagamento? A dose voltará para "Pendente".')) return;
        setProcessingId(record.id);
        try {
            const { error: finError } = await supabase.from('financial_records').delete().eq('id', record.id);
            if (finError) throw finError;
            if (record.injection_id) {
                const { error: injError } = await supabase.from('injections').update({ is_paid: false }).eq('id', record.injection_id);
                if (injError) throw injError;
            }
            onUpdate();
            fetchFinancialRecords();
        } catch (error) { console.error(error); alert('Erro ao excluir pagamento.'); }
        finally { setProcessingId(null); }
    };

    // Calculate totals
    // Calculate totals
    const totalRealized = injections.reduce((sum, inj) => sum + (inj.doseValue || 0), 0);
    const totalPaid = financialRecords.filter(r => r.status === 'Pago').reduce((sum, r) => sum + Number(r.amount), 0);
    const saldo = totalPaid - totalRealized;

    // Collapsible state
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden transition-all duration-300">
            {/* Header / Summary */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800 transition-colors"
            >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <button className="text-slate-400 hover:text-slate-600 transition-colors">
                            <span className={`material-symbols-outlined transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                        </button>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-emerald-500">attach_money</span>
                                Financeiro
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie pagamentos e pendências</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="bg-white dark:bg-slate-700 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                            <p className="text-xs font-semibold text-slate-500 uppercase">Realizado</p>
                            <p className="text-lg font-bold text-orange-500">{formatCurrency(totalRealized)}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-700 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                            <p className="text-xs font-semibold text-slate-500 uppercase">Total Pago</p>
                            <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-700 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                            <p className="text-xs font-semibold text-slate-500 uppercase">Saldo</p>
                            <p className={`text-lg font-bold ${saldo >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {formatCurrency(saldo)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Collapsible Content */}
            {isExpanded && (
                <div className="animate-slide-down">
                    {/* Tabs */}
                    <div className="flex border-b border-slate-100 dark:border-slate-700">
                        <button onClick={() => setActiveTab('pending')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pending' ? 'border-orange-500 text-orange-600 bg-orange-50/10' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Realizado ({pendingInjections.length})</button>
                        <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history' ? 'border-emerald-500 text-emerald-600 bg-emerald-50/10' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Histórico ({financialRecords.length})</button>
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-1 overflow-auto min-h-[300px] max-h-[500px]">
                        {activeTab === 'pending' ? (
                            <div className="space-y-3">
                                {pendingInjections.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400">
                                        <span className="material-symbols-outlined text-4xl mb-2">check_circle</span>
                                        <p>Nenhuma pendência financeira.</p>
                                    </div>
                                ) : (
                                    pendingInjections.map(inj => {
                                        const processingRecord = financialRecords.find(r => r.injection_id === inj.id && r.status === 'Em Processamento');
                                        const isProcessing = !!processingRecord;

                                        return (
                                            <div key={inj.id} className="flex items-center justify-between p-3 bg-surface-light dark:bg-surface-dark border border-slate-100 dark:border-slate-700 rounded-lg hover:border-orange-200 transition-colors group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                                                        <span className="material-symbols-outlined">vaccines</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-900 dark:text-white">Dose {inj.dosage}</p>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-xs text-slate-500">{formatDate(inj.applicationDate)}</p>
                                                            {isProcessing && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1 rounded uppercase">Processando</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(inj.doseValue || 0)}</span>
                                                    <button
                                                        onClick={() => handlePayInjection(inj)}
                                                        disabled={!!processingId || isProcessing}
                                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1 ${isProcessing
                                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500'
                                                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                            }`}
                                                    >
                                                        {processingId === inj.id ? '...' : (isProcessing ? 'Análise' : 'Pagar')}
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {loading ? <div className="text-center py-10 text-slate-400">Carregando...</div> : financialRecords.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400">
                                        <span className="material-symbols-outlined text-4xl mb-2">receipt_long</span>
                                        <p>Nenhum histórico de pagamento.</p>
                                    </div>
                                ) : (
                                    financialRecords.map(record => (
                                        <div key={record.id} className="flex items-center justify-between p-3 bg-surface-light dark:bg-surface-dark border border-slate-100 dark:border-slate-700 rounded-lg group">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${record.status === 'Pago' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 text-slate-400'}`}>
                                                    <span className="material-symbols-outlined">payments</span>
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900 dark:text-white">{record.description}</p>
                                                    <p className="text-xs text-slate-500">{formatDate(record.created_at)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(Number(record.amount))}</p>
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold uppercase">{record.status}</span>
                                                </div>
                                                <button onClick={() => handleDeletePayment(record)} disabled={!!processingId} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Excluir Pagamento">
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer Action */}
                    <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-center">
                        <button
                            onClick={() => setIsPaymentModalOpen(true)}
                            className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1 mx-auto hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg">add_circle</span>
                            Adicionar Pagamento Avulso
                        </button>
                    </div>
                </div>
            )}

            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                patientId={patient.id}
                pendingInjections={pendingInjections}
                onSuccess={() => { onUpdate(); fetchFinancialRecords(); }}
            />
        </div>
    );
};
