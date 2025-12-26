import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const formatCurrency = (value: number) => `R$ ${value.toFixed(2)}`;

const MedicationProfitability: React.FC = () => {
    const [medications, setMedications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMedications = async () => {
            try {
                const { data, error } = await supabase.from('medications').select('*');
                if (error) throw error;
                setMedications(data || []);
            } catch (err) {
                console.error('Error fetching medications:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchMedications();
    }, []);

    const totals = useMemo(() => {
        const cost = medications.reduce((sum, med) => sum + (Number(med.cost_price) * med.stock), 0);
        // Note: For simplicity in the dashboard, we assume doses rendered is what's in stock for now or just calculated based on simple sales
        const revenue = medications.reduce((sum, med) => sum + (med.stock * Number(med.sale_price)), 0);
        return { cost, revenue };
    }, [medications]);

    const getProfitabilityStatus = (med: any) => {
        const profitPerVial = (Number(med.sale_price) * med.doses_per_vial) - Number(med.cost_price);
        if (profitPerVial > Number(med.cost_price) * 0.5) return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
        if (profitPerVial > 0) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
    };

    if (loading) return null;

    return (
        <div className="mt-12">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">Análise de Lucratividade</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Investimento em Estoque</h3>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{formatCurrency(totals.cost)}</p>
                </div>
                <div className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Potencial de Lucro</h3>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{formatCurrency(totals.revenue - totals.cost)}</p>
                </div>
            </div>

            <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-surface-light dark:bg-surface-dark shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 text-left text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Medicamento</th>
                                <th className="px-6 py-4 text-left text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Custo p/ Frasco</th>
                                <th className="px-6 py-4 text-left text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Lucro p/ Frasco</th>
                                <th className="px-6 py-4 text-left text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {medications.map(med => {
                                const profitPerVial = (Number(med.sale_price) * med.doses_per_vial) - Number(med.cost_price);
                                return (
                                    <tr key={med.id} className="bg-surface-light dark:bg-surface-dark hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{med.name}</td>
                                        <td className="px-6 py-4 text-sm font-mono text-slate-500 dark:text-slate-400">{formatCurrency(Number(med.cost_price))}</td>
                                        <td className={`px-6 py-4 text-sm font-mono font-semibold ${profitPerVial > 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(profitPerVial)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getProfitabilityStatus(med)}`}>
                                                {profitPerVial > 0 ? 'Lucrativo' : 'Prejuízo'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const FinancialsPage: React.FC = () => {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [processing, setProcessing] = useState(false);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('financial_records')
                .select('*, patients(*)')
                .order('due_date', { ascending: false });

            if (error) throw error;
            setRecords(data || []);
        } catch (err) {
            console.error('Error fetching financial records:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, []);

    const handleSelectRow = (id: string) => {
        setSelectedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedRows(new Set(records.map(r => r.id)));
        } else {
            setSelectedRows(new Set());
        }
    };

    const handleMarkAsPaid = async () => {
        if (selectedRows.size === 0) return;
        setProcessing(true);
        try {
            const { error } = await supabase
                .from('financial_records')
                .update({ status: 'Pago' })
                .in('id', Array.from(selectedRows));

            if (error) throw error;

            setRecords(prev => prev.map(r =>
                selectedRows.has(r.id) ? { ...r, status: 'Pago' } : r
            ));
            setSelectedRows(new Set());
        } catch (err) {
            console.error('Error updating records:', err);
            alert('Erro ao atualizar faturas.');
        } finally {
            setProcessing(false);
        }
    };

    const totalSelected = useMemo(() => {
        return records
            .filter(row => selectedRows.has(row.id))
            .reduce((sum, row) => sum + Number(row.amount), 0);
    }, [selectedRows, records]);

    const getStatusBadge = (status: string) => {
        const baseClasses = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";
        switch (status) {
            case 'Pago':
                return <span className={`${baseClasses} bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300`}>Pago</span>;
            case 'Pendente':
                return <span className={`${baseClasses} bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300`}>Pendente</span>;
            case 'Atrasado':
                return <span className={`${baseClasses} bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300`}>Atrasado</span>;
            default: return null;
        }
    };

    return (
        <div className="flex-1 max-w-[1440px] mx-auto w-full pb-28">
            <div className="flex flex-col md:flex-row flex-wrap justify-between gap-4 mb-8">
                <div className="flex min-w-72 flex-col gap-2">
                    <h1 className="text-slate-900 dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">Lista Financeira</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-base font-normal leading-normal">Gerencie faturas de pacientes e receitas da clínica</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex min-w-[84px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
                        <span className="material-symbols-outlined text-[20px]">print</span>
                        <span className="truncate">Imprimir</span>
                    </button>
                    <button className="flex min-w-[84px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
                        <span className="material-symbols-outlined text-[20px]">download</span>
                        <span className="truncate">Exportar Relatório</span>
                    </button>
                </div>
            </div>

            <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-surface-light dark:bg-surface-dark shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px] border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 w-14 text-left">
                                    <input type="checkbox" onChange={handleSelectAll} checked={selectedRows.size === records.length && records.length > 0} className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4" />
                                </th>
                                <th className="px-6 py-4 text-left text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Paciente</th>
                                <th className="px-6 py-4 text-left text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Vencimento</th>
                                <th className="px-6 py-4 text-left text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Descrição</th>
                                <th className="px-6 py-4 text-left text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Valor</th>
                                <th className="px-6 py-4 text-left text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        Carregando registros...
                                    </td>
                                </tr>
                            ) : records.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        Nenhum registro financeiro encontrado.
                                    </td>
                                </tr>
                            ) : (
                                records.map(record => (
                                    <tr key={record.id} className={`${selectedRows.has(record.id) ? 'bg-primary/5 dark:bg-primary/10' : 'bg-surface-light dark:bg-surface-dark'} hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group`}>
                                        <td className="px-6 py-4"><input type="checkbox" onChange={() => handleSelectRow(record.id)} checked={selectedRows.has(record.id)} className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4" /></td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {record.patients?.avatar_url ?
                                                    <div className="bg-center bg-no-repeat bg-cover rounded-full size-8" style={{ backgroundImage: `url("${record.patients.avatar_url}")` }}></div> :
                                                    <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">{record.patients?.initials || '?'}</div>
                                                }
                                                <span className="text-slate-900 dark:text-white text-sm font-medium">{record.patients?.name || 'Paciente Excluído'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">{new Date(record.due_date).toLocaleDateString('pt-BR')}</td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">{record.description}</td>
                                        <td className="px-6 py-4 text-slate-900 dark:text-white text-sm font-mono font-medium">R$ {Number(record.amount).toFixed(2)}</td>
                                        <td className="px-6 py-4">{getStatusBadge(record.status)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedRows.size > 0 && (
                <div className="fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-300 translate-y-0">
                    <div className="bg-surface-light dark:bg-surface-dark border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] px-6 py-4">
                        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
                                    <span className="material-symbols-outlined text-primary text-[20px] fill-1">check_circle</span>
                                    <span className="text-sm font-bold text-primary">{selectedRows.size} selecionados</span>
                                </div>
                                <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
                                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                                    Total selecionado: <span className="text-slate-900 dark:text-white font-bold font-mono text-base ml-1">R$ {totalSelected.toFixed(2)}</span>
                                </p>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <button onClick={() => setSelectedRows(new Set())} className="flex-1 sm:flex-none cursor-pointer items-center justify-center rounded-lg h-10 px-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
                                <button
                                    onClick={handleMarkAsPaid}
                                    disabled={processing}
                                    className="flex-1 sm:flex-none cursor-pointer flex items-center justify-center gap-2 rounded-lg h-10 px-6 bg-primary text-white text-sm font-bold shadow-lg shadow-primary/30 hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined text-[20px]">{processing ? 'sync' : 'payments'}</span>
                                    {processing ? 'Processando...' : 'Marcar como Pago'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <MedicationProfitability />
        </div>
    );
};

export default FinancialsPage;
