import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FinancialLineChart, FinancialDonutChart } from './FinancialCharts';
import ConfirmDeleteModal from './ConfirmDeleteModal';

const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const parseCurrency = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const cleaned = value.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
        return parseFloat(cleaned) || 0;
    }
    return 0;
};

// TIMEZONE-SAFE: Parse date string manually to avoid UTC conversion issues
const parseSafeDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const [year, month, day] = cleanDate.split('-').map(Number);
    if (!year || !month || !day) return new Date(dateStr);
    return new Date(year, month - 1, day);
};

const formatSafeDate = (dateStr: string, options?: Intl.DateTimeFormatOptions) => {
    const d = parseSafeDate(dateStr);
    return d.toLocaleDateString('pt-BR', options || {});
};

// --- Sub Component: Medication Profitability ---
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

    if (loading) return (
        <div className="mt-12 p-8 text-center text-slate-500">
            <span className="material-symbols-outlined animate-spin text-3xl">refresh</span>
            <p>Carregando estoque...</p>
        </div>
    );

    return (
        <div className="mt-12 mb-20 animate-fade-in">
            <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-primary text-2xl">inventory_2</span>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Inteligência de Estoque & Lucro</h2>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {medications.map(med => {
                    const costPrice = parseCurrency(med.cost_price);
                    const totalMg = Number(med.total_mg_per_vial) || Number(med.doses_per_vial) || 0;
                    const costPerMg = totalMg > 0 ? costPrice / totalMg : 0;

                    // Break-even Analysis
                    // How many 5mg doses to pay for the vial?
                    const cost5mg = costPerMg * 5;
                    const marketPrice5mg = 250; // Estimated market average or user setting
                    const breakEvenDoses = cost5mg > 0 ? Math.ceil(costPrice / marketPrice5mg) : 0;

                    return (
                        <div key={med.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                        {med.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white text-lg">{med.name}</h3>
                                        <p className="text-xs text-slate-500">Fornecedor: {med.supplier || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Custo Frasco</p>
                                        <p className="font-mono font-bold text-slate-700 dark:text-slate-300">{formatCurrency(costPrice)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Estoque</p>
                                        <p className={`font-mono font-bold ${med.stock > 0 ? 'text-blue-600' : 'text-red-600'}`}>{med.stock} un</p>
                                    </div>
                                </div>
                            </div>

                            {/* Analysis Grid */}
                            <div className="p-4 bg-white dark:bg-slate-800 grid grid-cols-1 md:grid-cols-2 gap-8">

                                {/* Generic Profitability Table */}
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Simulação de Lucro (Doses Padrão)</h4>
                                    <div className="overflow-hidden rounded-lg border border-slate-100 dark:border-slate-700">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 dark:bg-slate-900/50">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Dose</th>
                                                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Custo Real</th>
                                                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Sug. Venda*</th>
                                                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Margem</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                {[2.5, 5, 7.5, 10, 15].map(dose => {
                                                    if (dose > totalMg) return null;
                                                    const realCost = costPerMg * dose;
                                                    const estimatedSale = realCost * 2.5; // Target 60% margin approx
                                                    const margin = estimatedSale - realCost;
                                                    const marginPercent = estimatedSale > 0 ? (margin / estimatedSale) * 100 : 0;

                                                    return (
                                                        <tr key={dose} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                            <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-300">{dose} mg</td>
                                                            <td className="px-3 py-2 text-right font-mono text-red-600/80 text-xs">{formatCurrency(realCost)}</td>
                                                            <td className="px-3 py-2 text-right font-mono text-slate-600 dark:text-slate-400 text-xs">{formatCurrency(estimatedSale)}</td>
                                                            <td className="px-3 py-2 text-right">
                                                                <span className="inline-flex items-center gap-1 font-bold text-green-600 text-xs">
                                                                    {formatCurrency(margin)}
                                                                    <span className="opacity-50 text-[10px]">({Math.round(marginPercent)}%)</span>
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2">* Sugestão baseada em markup de 2.5x sobre o custo.</p>
                                </div>

                                {/* Metrics & ROI */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Indicadores de Performance</h4>

                                    {/* ROI Card */}
                                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">ROI Potencial (Frasco)</span>
                                            <span className="material-symbols-outlined text-emerald-500 text-sm">trending_up</span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">~ 150%</span>
                                            <span className="text-xs text-emerald-700/70">margem média</span>
                                        </div>
                                        <div className="w-full bg-emerald-200/50 h-1.5 rounded-full mt-2 overflow-hidden">
                                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: '75%' }}></div>
                                        </div>
                                    </div>

                                    {/* Cost/Mg visual */}
                                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Custo por MG</span>
                                            <span className="text-xs font-mono font-bold text-slate-800 dark:text-white">{formatCurrency(costPerMg)} / mg</span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 leading-tight">
                                            Base para cálculo de lucro em doses fracionadas.
                                        </div>
                                    </div>

                                    {/* Break Even */}
                                    {totalMg > 0 && (
                                        <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600">
                                            <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                                <span className="material-symbols-outlined text-sm">anchor</span>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Ponto de Equilíbrio</p>
                                                <p className="text-[10px] text-slate-400">Venda aprox. <strong className="text-slate-700 dark:text-slate-200">{breakEvenDoses} doses</strong> de 5mg para cobrir o custo do frasco.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- Main Page ---
const FinancialsPage: React.FC = () => {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [processing, setProcessing] = useState(false);

    // Accordion State: Set of "Month-Year" strings that are expanded
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // Modal & Delete State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [allInjections, setAllInjections] = useState<any[]>([]);

    // 2. Calculate Global Pending & Estimated Profit (Accrual Basis)
    // Global Pending = Sum of (Realized - Paid) for each patient
    // Estimated Profit = Sum of (Realized Value - Realized Cost)

    const patientBalances: { [key: string]: { realized: number, paid: number } } = {};
    let totalRealizedValue = 0;
    let totalRealizedCost = 0;

    // Iterate ALL Injections for Realized Value & Cost
    // Note: We need medication details for cost. fetching '*' from injections might not have it unless we join.
    // The previous fetch was: supabase.from('injections').select('*')
    // We need: supabase.from('injections').select('*, medications(*)') to get cost info.
    // I need to update the fetch query too. Assuming I will update it in a separate block or relying on what's available?
    // Let's update the fetch query in the same file update if possible.
    // Wait, the ReplacementChunck cannot start before the fetch logic.
    // I will assume for now I will edit the fetch logic in a subsequent or previous step?
    // No, I can do it here if I include the fetch logic in the view?
    // The fetch logic is above line 192.
    // I will calculate profit using 'allInjections'. I'll need to update the fetch to include medications.
    // Since I can't update two places far apart with one block, I'll update the logic assuming the data is there, 
    // AND then update the fetch in a separate tool call? 
    // Or better, I will assume the user wants me to fix the logic. The fetch needs to change first.

    // Actually, looking at the previous file content I viewed (Step 3379), 'fetchRecords' is lines 192-221.
    // 'metrics' calculation is line 228-285.
    // I need to change them both.
    // I will use `multi_replace_file_content` or just do the calculation assuming `allInjections` has medications (I'll fix the fetch in next step if needed, or now).
    // Since I am already here, I'll update the calculation.
    // BUT, I can't calculate cost without medication data.
    // I will first update the FETCH to include medications, then the calculation?
    // Actually, `supabase.from('injections').select('*, medications(*)')` is what I need.
    // The current code has `supabase.from('injections').select('*')`.

    // Let's look at the fetch I just wrote in Step 3394.
    // It was `supabase.from('injections').select('*')`.
    // I need to change that to `select('*, medications(*)')`.

    // Strategy:
    // 1. Update the fetch to include medications.
    // 2. Update the logic to use `allInjections` for profit.

    // Can I do this with `replace_file_content`? 
    // The fetch is at lines 201-204 (in the promise ALL).
    // The logic is at lines 270+.
    // They are close enough? 200 to 280 is ~80 lines.
    // I can replace the whole block from fetch to useMemo return.

    // Let's try to do it in one go.

    // ... (Code continues)

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const [{ data: recordsData, error: recordsError }, { data: injectionsData, error: injectionsError }] = await Promise.all([
                supabase
                    .from('financial_records')
                    .select(`
                    *,
                    patients(*),
                    injections (
                        *,
                        medications (*)
                    )
                `)
                    .order('due_date', { ascending: false }),
                supabase.from('injections').select('*, medications(*)')
            ]);

            if (recordsError) throw recordsError;
            if (injectionsError) throw injectionsError;

            setRecords(recordsData || []);
            setAllInjections(injectionsData || []);

            // Default expand the first group (current month/latest)
            if (recordsData && recordsData.length > 0) {
                const firstDate = new Date(recordsData[0].due_date);
                const key = `${firstDate.getMonth()}-${firstDate.getFullYear()}`;
                setExpandedGroups(new Set([key]));
            }
        } catch (err) {
            console.error('Error fetching financial records:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, []);

    // --- Metrics & Chart Data ---
    const metrics = useMemo(() => {
        let revenue = 0;
        let overdue = 0;
        const monthMap = new Map<string, number>();
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = d.toLocaleString('pt-BR', { month: 'short' });
            monthMap.set(key, 0);
        }

        let countPaid = 0;
        let countPending = 0;
        let countOverdue = 0;

        // 1. Process Records for Revenue (Cash Basis) and Overdue
        records.forEach(r => {
            const val = Number(r.amount);
            const status = r.status || 'Pendente';
            const date = new Date(r.due_date);
            const isOver = status === 'Pendente' && date < today;

            if (status === 'Pago') {
                revenue += val;
                countPaid++;
                const monthKey = date.toLocaleString('pt-BR', { month: 'short' });
                if (monthMap.has(monthKey)) monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + val);
            } else {
                if (isOver) { overdue += val; countOverdue++; }
                if (status === 'Pendente') countPending++;
            }
        });

        // 2. Process Injections for Realized Value, Cost, and Profit (Accrual Basis)
        let totalRealizedValue = 0;
        let totalRealizedCost = 0;
        const patientBalances: { [key: string]: { realized: number, paid: number } } = {};

        allInjections.forEach(inj => {
            const val = Number(inj.dose_value || inj.doseValue || 0);
            totalRealizedValue += val;

            // Cost Calculation
            let cost = 0;
            if (inj.medications) {
                const med = inj.medications;
                // Handle text currency fields if necessary (assuming parseCurrency handles DB format)
                // Note: 'medications' from join might be an array or object depending on relation. Usually an object if FK is 1:1 or N:1.
                // In Supabase js client, it returns an object if singular relation.
                // let's assume it's an object or check if array.
                const medData = Array.isArray(med) ? med[0] : med;

                if (medData) {
                    const costPrice = typeof medData.cost_price === 'number' ? medData.cost_price : parseCurrency(medData.cost_price);

                    const dosageStr = inj.dosage || '0';
                    const dosageMg = parseFloat(dosageStr.replace('mg', '').replace(',', '.').trim()) || 0;

                    const totalMg = Number(medData.total_mg_per_vial) || Number(medData.doses_per_vial) || 0;

                    if (totalMg > 0 && costPrice > 0 && dosageMg > 0) {
                        const costPerMg = costPrice / totalMg;
                        cost = costPerMg * dosageMg;
                    } else cost = val * 0.5; // Fallback
                } else cost = val * 0.5;
            } else cost = val * 0.5;

            totalRealizedCost += cost;

            // Pending Logic
            if (inj.patient_id) {
                if (!patientBalances[inj.patient_id]) patientBalances[inj.patient_id] = { realized: 0, paid: 0 };
                patientBalances[inj.patient_id].realized += val;
            }
        });

        const estimatedProfit = totalRealizedValue - totalRealizedCost;

        // 3. Pending Logic (Debt)
        records.forEach(r => {
            if (!r.patient_id || r.status !== 'Pago') return;
            const pid = typeof r.patient_id === 'object' ? (r.patient_id as any).id : r.patient_id;
            if (pid && patientBalances[pid]) {
                patientBalances[pid].paid += Number(r.amount);
            }
        });

        let totalGlobalPending = 0;
        Object.values(patientBalances).forEach(balance => {
            const debt = balance.realized - balance.paid;
            if (debt > 0) totalGlobalPending += debt;
        });

        const lineData = Array.from(monthMap.entries()).map(([label, value]) => ({ label, value }));
        const donutData = [
            { label: 'Pago', value: revenue, color: '#10B981' },
            { label: 'Pendente', value: totalGlobalPending, color: '#F59E0B' },
            { label: 'Atrasado', value: overdue, color: '#EF4444' }
        ].filter(d => d.value > 0);

        return { revenue, pending: totalGlobalPending, overdue, profit: estimatedProfit, lineData, donutData };
    }, [records, allInjections]);





    // --- Grouping Logic ---
    const groupedRecords = useMemo(() => {
        const groups: { [key: string]: { title: string, date: Date, records: any[], revenue: number, pending: number } } = {};

        records.forEach(record => {
            const date = new Date(record.due_date);
            const key = `${date.getMonth()}-${date.getFullYear()}`;
            const title = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

            if (!groups[key]) {
                groups[key] = { title: title.charAt(0).toUpperCase() + title.slice(1), date, records: [], revenue: 0, pending: 0 };
            }
            groups[key].records.push(record);

            if (record.status === 'Pago') groups[key].revenue += Number(record.amount);
            else groups[key].pending += Number(record.amount);
        });

        return Object.entries(groups)
            .sort(([, a], [, b]) => b.date.getTime() - a.date.getTime()) // Sort by date desc
            .map(([key, group]) => ({ ...group, id: key }));
    }, [records]);

    const toggleGroup = (id: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };


    // --- Selection Logic ---
    const handleSelectRow = (id: string) => {
        setSelectedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };
    const handleSelectAllGroup = (groupId: string, groupRecords: any[], checked: boolean) => {
        setSelectedRows(prev => {
            const newSet = new Set(prev);
            groupRecords.forEach(r => {
                if (checked) newSet.add(r.id);
                else newSet.delete(r.id);
            });
            return newSet;
        });
    };

    const handleMarkAsPaid = async () => {
        if (selectedRows.size === 0) return;
        setProcessing(true);
        try {
            const selectedIds = Array.from(selectedRows);
            const injectionIds = records.filter(r => selectedIds.includes(r.id) && r.injection_id).map(r => r.injection_id);
            if (injectionIds.length > 0) await supabase.from('injections').update({ is_paid: true }).in('id', injectionIds);
            await supabase.from('financial_records').update({ status: 'Pago' }).in('id', selectedIds);
            setRecords(prev => prev.map(r => selectedRows.has(r.id) ? { ...r, status: 'Pago' } : r));
            setSelectedRows(new Set());
        } catch (err) { console.error(err); alert('Erro ao atualizar faturas.'); }
        finally { setProcessing(false); }
    };
    const handleDelete = async () => {
        if (selectedRows.size === 0) return;
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteAction = async () => {
        setDeleteLoading(true);
        try {
            const selectedIds = Array.from(selectedRows);
            console.log('Selected IDs for deletion:', selectedIds);

            // 1. Identify related Injections to mark as unpaid
            // Ensure we handle both string IDs and object relations if any
            const injectionIds = records
                .filter(r => selectedIds.includes(r.id))
                .map(r => {
                    // Check if injection_id is directly available or nested
                    if (r.injection_id) return r.injection_id;
                    if (r.injections && r.injections.id) return r.injections.id;
                    return null;
                })
                .filter(id => id !== null);

            console.log('Related Injection IDs:', injectionIds);

            // 2. Update Injections first (if any)
            if (injectionIds.length > 0) {
                const { error: updateError } = await supabase
                    .from('injections')
                    .update({ is_paid: false })
                    .in('id', injectionIds);
                if (updateError) {
                    console.error('Error updating injections:', updateError);
                    throw updateError;
                }
            }

            // 3. Delete Financial Records
            const { error: deleteError } = await supabase
                .from('financial_records')
                .delete()
                .in('id', selectedIds);

            if (deleteError) {
                console.error('Error deleting records:', deleteError);
                throw deleteError;
            }

            // 4. Update UI
            setRecords(prev => prev.filter(r => !selectedRows.has(r.id)));
            setSelectedRows(new Set());
            setIsDeleteModalOpen(false); // Close modal on success

        } catch (err) {
            console.error('Full delete error:', err);
            alert('Erro ao excluir as transações. Verifique o console para mais detalhes.');
        } finally {
            setDeleteLoading(false);
        }
    };
    const totalSelected = useMemo(() => records.filter(row => selectedRows.has(row.id)).reduce((sum, row) => sum + Number(row.amount), 0), [selectedRows, records]);
    const getStatusBadge = (status: string) => {
        const baseClasses = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";
        switch (status) {
            case 'Pago': return <span className={`${baseClasses} bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300`}>Pago</span>;
            case 'Pendente': return <span className={`${baseClasses} bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300`}>Pendente</span>;
            case 'Atrasado': return <span className={`${baseClasses} bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300`}>Atrasado</span>;
            case 'Em Processamento': return <span className={`${baseClasses} bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 flex items-center gap-1`}><span className="material-symbols-outlined text-[10px]">hourglass_top</span>Análise</span>;
            default: return null;
        }
    };

    const hasProcessing = useMemo(() => {
        return Array.from(selectedRows).some(id => records.find(r => r.id === id)?.status === 'Em Processamento');
    }, [selectedRows, records]);

    return (
        <div className="flex-1 max-w-[1440px] mx-auto w-full pb-28 px-4 md:px-6">
            <div className="flex flex-col md:flex-row flex-wrap justify-between gap-4 mb-8 mt-4 md:mt-0">
                <div className="flex min-w-72 flex-col gap-2">
                    <h1 className="text-slate-900 dark:text-white text-2xl md:text-4xl font-black leading-tight tracking-[-0.033em]">Dashboard Financeiro</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base font-normal leading-normal">Visão geral de receitas e performance</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button className="flex-1 md:flex-none cursor-pointer flex items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold shadow-sm">
                        <span className="material-symbols-outlined text-[20px]">print</span>
                        <span className="truncate hidden md:inline">Imprimir</span>
                    </button>
                    <button className="flex-1 md:flex-none cursor-pointer flex items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold shadow-sm">
                        <span className="material-symbols-outlined text-[20px]">download</span>
                        <span className="truncate hidden md:inline">Exportar</span>
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-slate-500">Carregando financeiro...</p>
                </div>
            ) : (
                <>
                    {/* --- KPI Grid --- */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <div className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Receita Total</h3>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white">{formatCurrency(metrics.revenue)}</span>
                            </div>
                        </div>
                        <div className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Pendente</h3>
                            <div className="mt-2 text-2xl lg:text-3xl font-black text-yellow-600 dark:text-yellow-400">{formatCurrency(metrics.pending)}</div>
                        </div>
                        <div className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Em Atraso</h3>
                            <div className="mt-2 text-2xl lg:text-3xl font-black text-red-600 dark:text-red-400">{formatCurrency(metrics.overdue)}</div>
                        </div>
                        <div className="p-5 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/30 shadow-sm flex flex-col justify-between">
                            <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide">Lucro Estimado</h3>
                            <div className="mt-2 text-2xl lg:text-3xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(metrics.profit)}</div>
                        </div>
                    </div>

                    {/* --- Charts Section --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Tendência de Receita</h3>
                            <div className="h-[250px] w-full">
                                <FinancialLineChart data={metrics.lineData} color="#3B82F6" />
                            </div>
                        </div>
                        <div className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 text-center">Status de Pagamentos</h3>
                            <div className="w-full h-auto min-h-[300px] flex items-center justify-center">
                                <FinancialDonutChart data={metrics.donutData} totalLabel="Volume Total" valueFormatter={formatCurrency} />
                            </div>
                        </div>
                    </div>

                    {/* --- Grouped Transaction List --- */}
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">Todas as Transações</h2>

                    <div className="space-y-4">
                        {groupedRecords.map(group => {
                            const isExpanded = expandedGroups.has(group.id);
                            return (
                                <div key={group.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                                    {/* Group Header */}
                                    <div
                                        onClick={() => toggleGroup(group.id)}
                                        className="p-4 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200 text-lg">{group.title}</span>
                                            <span className="text-xs font-bold text-slate-400 bg-slate-200 dark:bg-slate-700 rounded-full px-2 py-0.5">{group.records.length}</span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-6 text-xs sm:text-sm">
                                            <div className="flex gap-1.5">
                                                <span className="text-slate-500">Receita:</span>
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(group.revenue)}</span>
                                            </div>
                                            {group.pending > 0 && (
                                                <div className="flex gap-1.5">
                                                    <span className="text-slate-500">Pendente:</span>
                                                    <span className="font-bold text-amber-600 dark:text-amber-400">{formatCurrency(group.pending)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded Content */}
                                    {isExpanded && (
                                        <div className="animate-fade-in border-t border-slate-100 dark:border-slate-700">
                                            {/* Desktop Table View inside Group */}
                                            <div className="hidden md:block overflow-x-auto">
                                                <table className="w-full min-w-[800px] border-collapse">
                                                    <thead className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                                                        <tr>
                                                            <th className="px-6 py-3 w-14">
                                                                <input
                                                                    type="checkbox"
                                                                    className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                                                                    checked={group.records.every(r => selectedRows.has(r.id))}
                                                                    ref={input => {
                                                                        if (input) {
                                                                            input.indeterminate = group.records.some(r => selectedRows.has(r.id)) && !group.records.every(r => selectedRows.has(r.id));
                                                                        }
                                                                    }}
                                                                    onChange={(e) => handleSelectAllGroup(group.id, group.records, e.target.checked)}
                                                                />
                                                            </th>
                                                            <th className="px-6 py-3 text-left text-[10px] font-bold uppercase text-slate-400 tracking-wider">Paciente</th>
                                                            <th className="px-6 py-3 text-left text-[10px] font-bold uppercase text-slate-400 tracking-wider">Dia</th>
                                                            <th className="px-6 py-3 text-left text-[10px] font-bold uppercase text-slate-400 tracking-wider">Descrição</th>
                                                            <th className="px-6 py-3 text-left text-[10px] font-bold uppercase text-slate-400 tracking-wider">Medicamento</th>
                                                            <th className="px-6 py-3 text-left text-[10px] font-bold uppercase text-slate-400 tracking-wider">Valor</th>
                                                            <th className="px-6 py-3 text-left text-[10px] font-bold uppercase text-slate-400 tracking-wider">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                        {group.records.map(record => (
                                                            <tr key={record.id} className={`${selectedRows.has(record.id) ? 'bg-primary/5' : ''} hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors`}>
                                                                <td className="px-6 py-4"><input type="checkbox" onChange={() => handleSelectRow(record.id)} checked={selectedRows.has(record.id)} className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4" /></td>
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center gap-3">
                                                                        {record.patients?.avatar_url ? <div className="bg-center bg-cover rounded-full size-8" style={{ backgroundImage: `url("${record.patients.avatar_url}")` }}></div> : <div className="size-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">{record.patients?.initials || '?'}</div>}
                                                                        <span className="text-sm font-medium text-slate-900 dark:text-white">{record.patients?.name}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-sm text-slate-500 font-mono">{parseSafeDate(record.due_date).getDate()}</td>
                                                                <td className="px-6 py-4 text-sm text-slate-500 max-w-[200px] truncate" title={record.description}>{record.description}</td>
                                                                <td className="px-6 py-4 text-sm text-slate-500">
                                                                    {record.injections?.medications?.name ? <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-medium">{record.injections.medications.name}</span> : '-'}
                                                                </td>
                                                                <td className="px-6 py-4 text-sm font-mono font-medium text-slate-900 dark:text-white">{formatCurrency(Number(record.amount))}</td>
                                                                <td className="px-6 py-4">{getStatusBadge(record.status)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Mobile Card View inside Group */}
                                            <div className="md:hidden flex flex-col gap-2 p-2">
                                                {group.records.map(record => (
                                                    <div key={record.id} className={`p-3 rounded-lg border shadow-sm transition-all ${selectedRows.has(record.id) ? 'bg-primary/5 border-primary/30' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`} onClick={() => handleSelectRow(record.id)}>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex items-center gap-2">
                                                                {record.patients?.avatar_url ? <div className="bg-center bg-cover rounded-full size-8" style={{ backgroundImage: `url("${record.patients.avatar_url}")` }}></div> : <div className="size-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">{record.patients?.initials || '?'}</div>}
                                                                <div>
                                                                    <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">{record.patients?.name}</h3>
                                                                    <p className="text-[10px] text-slate-500">{formatSafeDate(record.due_date)}</p>
                                                                </div>
                                                            </div>
                                                            <div onClick={(e) => e.stopPropagation()}>
                                                                <input type="checkbox" onChange={() => handleSelectRow(record.id)} checked={selectedRows.has(record.id)} className="rounded-full border-slate-300 text-primary focus:ring-primary h-4 w-4" />
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between mt-2">
                                                            {getStatusBadge(record.status)}
                                                            <span className="text-base font-bold text-slate-900 dark:text-white font-mono">{formatCurrency(Number(record.amount))}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {selectedRows.size > 0 && (
                <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
                    <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] px-4 py-4 safe-area-bottom">
                        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                                <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
                                    <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                                    <span className="text-sm font-bold text-primary">{selectedRows.size} <span className="hidden sm:inline">selecionados</span></span>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">Total: <span className="text-slate-900 dark:text-white font-bold font-mono text-base ml-1">{formatCurrency(totalSelected)}</span></p>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <button onClick={() => setSelectedRows(new Set())} className="flex-1 sm:flex-none h-12 sm:h-10 px-6 rounded-xl sm:rounded-lg border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
                                <button onClick={handleDelete} disabled={processing} className="flex-1 sm:flex-none h-12 sm:h-10 px-6 rounded-xl sm:rounded-lg bg-red-50 text-red-600 border border-red-200 font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                                    {processing ? <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span> : <span className="material-symbols-outlined text-[20px]">delete</span>}
                                    <span className="hidden sm:inline">Excluir</span>
                                </button>
                                <button onClick={handleMarkAsPaid} disabled={processing} className={`flex-1 sm:flex-none h-12 sm:h-10 px-6 rounded-xl sm:rounded-lg font-bold shadow-lg flex items-center justify-center gap-2 text-white transition-all ${hasProcessing ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'}`}>
                                    {processing ? <span className="material-symbols-outlined animate-spin">refresh</span> : <span className="material-symbols-outlined">{hasProcessing ? 'check' : 'payments'}</span>}
                                    {processing ? '...' : (hasProcessing ? 'Confirmar' : 'Pagar')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <MedicationProfitability />

            <ConfirmDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteAction}
                itemName={`${selectedRows.size} transação(ões)`}
                loading={deleteLoading}
            />
        </div>
    );
};

export default FinancialsPage;
