import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Patient, Injection } from '../types';
import { PaymentModal } from './PaymentModal';

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
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    } catch (e) {
        return dateString;
    }
};

export const PatientFinancials: React.FC<PatientFinancialsProps> = ({ patient, injections, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    // Filter pending injections (doses that are NOT paid)
    const pendingInjections = useMemo(() =>
        injections.filter(inj => !inj.isPaid && (inj.doseValue || 0) > 0),
        [injections]);

    const fetchFinancialRecords = async () => {
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

            const { error: injError } = await supabase.from('injections')
                .update({ is_paid: true })
                .eq('id', injection.id);

            if (injError) throw injError;

            onUpdate();
            fetchFinancialRecords();
        } catch (error) {
            console.error(error);
            alert('Erro ao processar pagamento.');
        } finally {
            setProcessingId(null);
        }
    };

    const handleDeletePayment = async (record: FinancialRecord) => {
        if (!confirm('Tem certeza que deseja excluir este pagamento? A dose voltará para "Pendente".')) return;
        setProcessingId(record.id);
        try {
            const { error: finError } = await supabase.from('financial_records').delete().eq('id', record.id);
            if (finError) throw finError;

            if (record.injection_id) {
                const { error: injError } = await supabase.from('injections')
                    .update({ is_paid: false })
                    .eq('id', record.injection_id);
                if (injError) throw injError;
            }

            onUpdate();
            fetchFinancialRecords();
        } catch (error) {
            console.error(error);
            alert('Erro ao excluir pagamento.');
        } finally {
            setProcessingId(null);
        }
    };

    // --- CÁLCULOS TOTAIS GERAIS ---
    const totalRealized = useMemo(() =>
        injections.reduce((sum, inj) => sum + (inj.doseValue || 0), 0),
        [injections]);

    const totalPaid = useMemo(() =>
        financialRecords.filter(r => r.status === 'Pago').reduce((sum, r) => sum + Number(r.amount), 0),
        [financialRecords]);

    const saldo = totalPaid - totalRealized;

    // --- LÓGICA SMART CHOICE (EFICIÊNCIA FINANCEIRA) ---
    const smartChoiceData = useMemo(() => {
        // 1. Filtragem e Ordenação: Achar primeira dose Mounjaro (>= 2.5)
        const sorted = [...injections].sort((a, b) =>
            new Date(a.applicationDate || a.date).getTime() - new Date(b.applicationDate || b.date).getTime()
        );

        const startIndex = sorted.findIndex(inj => {
            // Limpeza agressiva da string para pegar o número (ex: "2,5 mg" -> 2.5)
            const cleanString = String(inj.dosage).replace(',', '.').replace(/[^0-9.]/g, '');
            const dosageNum = parseFloat(cleanString);
            return dosageNum >= 2.5;
        });

        // Se não achou nenhuma dose >= 2.5, retorna null (não exibe o card)
        if (startIndex === -1) return null;

        const mounjaroPhase = sorted.slice(startIndex);
        if (mounjaroPhase.length === 0) return null;

        const firstDate = new Date(mounjaroPhase[0].applicationDate || mounjaroPhase[0].date);

        // 2. Benchmarks de Mercado
        const CONSULT_PRICE = 800; // Preço médio consulta particular

        // 3. Cálculo
        let marketDrugCost = 0;
        let realInvestmentFiltered = 0;

        mounjaroPhase.forEach(inj => {
            const cleanString = String(inj.dosage).replace(',', '.').replace(/[^0-9.]/g, '');
            const doseNum = parseFloat(cleanString);

            // Custo Real (Soma apenas desta fase)
            realInvestmentFiltered += (inj.doseValue || 0);

            // Custo Estimado Mercado (Preço Caixa / 4 doses)
            let boxPrice = 0;
            if (doseNum <= 2.5) boxPrice = 1500;
            else if (doseNum <= 5.0) boxPrice = 1860;
            else if (doseNum <= 7.5) boxPrice = 2600;
            else boxPrice = 3000; // 10mg+

            marketDrugCost += (boxPrice / 4);
        });

        // Cálculo de Consultas (Meses decorridos)
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - firstDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        // Mínimo 1 mês
        const monthsInTreatment = Math.max(1, Math.ceil(diffDays / 30));

        const marketConsultsCost = monthsInTreatment * CONSULT_PRICE;
        const totalMarket = marketDrugCost + marketConsultsCost;

        // Economia só faz sentido se for positiva
        const savings = totalMarket - realInvestmentFiltered;

        return {
            startDate: firstDate.toLocaleDateString('pt-BR'),
            marketTotal: totalMarket,
            realTotal: realInvestmentFiltered,
            savings: savings,
            marketBreakdown: { drug: marketDrugCost, consults: marketConsultsCost }
        };

    }, [injections]);


    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden transition-all duration-300">

            {/* Header Area (Always Visible) */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">

                {/* Top Row: Title + Totals */}
                <div
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer"
                >
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

                    <div className="flex gap-2 md:gap-4 overflow-x-auto w-full md:w-auto">
                        <div className="bg-white dark:bg-slate-700 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm min-w-[100px]">
                            <p className="text-[10px] md:text-xs font-semibold text-slate-500 uppercase">Realizado</p>
                            <p className="text-base md:text-lg font-bold text-orange-500">{formatCurrency(totalRealized)}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-700 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm min-w-[100px]">
                            <p className="text-[10px] md:text-xs font-semibold text-slate-500 uppercase">Total Pago</p>
                            <p className="text-base md:text-lg font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-700 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm min-w-[100px]">
                            <p className="text-[10px] md:text-xs font-semibold text-slate-500 uppercase">Saldo</p>
                            <p className={`text-base md:text-lg font-bold ${saldo >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {formatCurrency(saldo)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* --- AQUI ESTÁ O CARD QUE DEVE APARECER --- */}
                {/* SMART CHOICE (Relatório de Eficiência Financeira) */}
                {smartChoiceData && smartChoiceData.savings > 0 && (
                    <div className="mt-6 p-1 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 shadow-lg animate-in fade-in slide-in-from-top-2 duration-500">
                        <div className="bg-slate-900/90 rounded-xl p-4 md:p-5 backdrop-blur-sm relative overflow-hidden group">
                            {/* Decorative Icon Background */}
                            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none transition-opacity group-hover:opacity-20">
                                <span className="material-symbols-outlined text-8xl text-emerald-400">savings</span>
                            </div>

                            <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                                {/* Title Section */}
                                <div className="flex items-start gap-3 w-full md:w-auto">
                                    <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400">
                                        <span className="material-symbols-outlined">diamond</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-base md:text-lg leading-tight">Smart Choice</h4>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Eficiência vs. Mercado (Ref. Mounjaro®)
                                        </p>
                                        <p className="text-[10px] text-slate-500">Desde: {smartChoiceData.startDate}</p>
                                    </div>
                                </div>

                                {/* Metrics Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full md:w-auto">
                                    {/* Market Value */}
                                    <div className="text-center sm:text-left">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Valor de Mercado</p>
                                        <p className="text-xl font-bold text-slate-400 line-through decoration-slate-600 decoration-2">
                                            {formatCurrency(smartChoiceData.marketTotal)}
                                        </p>
                                        <p className="text-[9px] text-slate-600">
                                            Medicamento + Consultas
                                        </p>
                                    </div>

                                    {/* Real Investment */}
                                    <div className="text-center sm:text-left">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Seu Investimento</p>
                                        <p className="text-2xl font-bold text-white">
                                            {formatCurrency(smartChoiceData.realTotal)}
                                        </p>
                                    </div>

                                    {/* Savings Highlight */}
                                    <div className="bg-emerald-500/10 px-5 py-2 rounded-xl border border-emerald-500/20 text-center sm:text-right shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-0.5 flex items-center justify-center sm:justify-end gap-1">
                                            <span className="material-symbols-outlined text-sm">trending_down</span>
                                            Economia
                                        </p>
                                        <p className="text-2xl font-black text-emerald-400">
                                            {formatCurrency(smartChoiceData.savings)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Collapsible Content (Tabs) */}
            {isExpanded && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                    {/* Tabs Navigation */}
                    <div className="flex border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pending'
                                    ? 'border-orange-500 text-orange-600 bg-orange-50/10'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                }`}
                        >
                            Realizado ({pendingInjections.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history'
                                    ? 'border-emerald-500 text-emerald-600 bg-emerald-50/10'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                }`}
                        >
                            Histórico ({financialRecords.length})
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="p-4 bg-white dark:bg-slate-800 flex-1 overflow-auto min-h-[200px] max-h-[500px]">
                        {activeTab === 'pending' ? (
                            <div className="space-y-3">
                                {pendingInjections.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400 flex flex-col items-center">
                                        <span className="material-symbols-outlined text-4xl mb-2 opacity-50">check_circle</span>
                                        <p>Nenhuma pendência financeira.</p>
                                    </div>
                                ) : (
                                    pendingInjections.map(inj => {
                                        const processingRecord = financialRecords.find(r => r.injection_id === inj.id && r.status === 'Em Processamento');
                                        const isProcessing = !!processingRecord;

                                        return (
                                            <div key={inj.id} className="flex flex-col sm:flex-row items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-lg hover:border-orange-200 transition-colors gap-3">
                                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                                    <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 flex-shrink-0">
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
                                                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                                    <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(inj.doseValue || 0)}</span>
                                                    <button
                                                        onClick={() => handlePayInjection(inj)}
                                                        disabled={!!processingId || isProcessing}
                                                        className={`px-4 py-2 text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1 ${isProcessing
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
                                {loading ? (
                                    <div className="text-center py-10 text-slate-400">Carregando...</div>
                                ) : financialRecords.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400 flex flex-col items-center">
                                        <span className="material-symbols-outlined text-4xl mb-2 opacity-50">receipt_long</span>
                                        <p>Nenhum histórico de pagamento.</p>
                                    </div>
                                ) : (
                                    financialRecords.map(record => (
                                        <div key={record.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg group">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${record.status === 'Pago' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 text-slate-400'}`}>
                                                    <span className="material-symbols-outlined">payments</span>
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-1">{record.description}</p>
                                                    <p className="text-xs text-slate-500">{formatDate(record.created_at)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(Number(record.amount))}</p>
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold uppercase">{record.status}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleDeletePayment(record)}
                                                    disabled={!!processingId}
                                                    className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                    title="Excluir Pagamento"
                                                >
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