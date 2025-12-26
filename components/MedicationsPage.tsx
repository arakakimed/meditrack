import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import AddMedicationModal from './AddMedicationModal';
import AdjustStockModal from './AdjustStockModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';

const formatCurrency = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return 'R$ 0,00';
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const StatCard: React.FC<{ title: string; value: string; icon: string; iconColor: string; }> = ({ title, value, icon, iconColor }) => (
    <div className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-start justify-between">
        <div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</h3>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${iconColor}`}>
            <span className="material-symbols-outlined text-white">{icon}</span>
        </div>
    </div>
);

const MedicationsPage: React.FC = () => {
    const [medications, setMedications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedMedication, setSelectedMedication] = useState<any>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const fetchMedications = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('medications')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setMedications(data || []);
        } catch (err) {
            console.error('Error fetching medications:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Handler for when stock is adjusted - updates local state directly
    const handleStockUpdate = useCallback((medicationId: string, newStock: number) => {
        setMedications(prev => prev.map(med =>
            med.id === medicationId ? { ...med, stock: newStock } : med
        ));
    }, []);

    // Handler for when a medication is added or edited - refetches the list
    const handleMedicationChange = useCallback(() => {
        fetchMedications();
    }, [fetchMedications]);

    // Open delete confirmation modal
    const handleDeleteClick = (med: any) => {
        setSelectedMedication(med);
        setIsDeleteModalOpen(true);
    };

    // Close delete modal
    const handleCloseDeleteModal = useCallback(() => {
        setIsDeleteModalOpen(false);
        setSelectedMedication(null);
        setDeleteLoading(false);
    }, []);

    // Confirm delete
    const handleConfirmDelete = async () => {
        if (!selectedMedication?.id) return;

        setDeleteLoading(true);
        try {
            const { error } = await supabase
                .from('medications')
                .delete()
                .eq('id', selectedMedication.id);

            if (error) throw error;

            const deletedId = selectedMedication.id;

            // Close modal first
            setIsDeleteModalOpen(false);
            setSelectedMedication(null);
            setDeleteLoading(false);

            // Update local state in next frame
            requestAnimationFrame(() => {
                setMedications(prev => prev.filter(med => med.id !== deletedId));
            });

        } catch (err) {
            console.error('Error deleting medication:', err);
            setDeleteLoading(false);
            alert('Erro ao excluir medicação. Tente novamente.');
        }
    };

    const handleEdit = (med: any) => {
        setSelectedMedication(med);
        setIsAddModalOpen(true);
    };

    const handleAdjust = (med?: any) => {
        setSelectedMedication(med || null);
        setIsAdjustModalOpen(true);
    };

    const handleCloseAddModal = useCallback(() => {
        setIsAddModalOpen(false);
        setSelectedMedication(null);
    }, []);

    const handleCloseAdjustModal = useCallback(() => {
        setIsAdjustModalOpen(false);
        setSelectedMedication(null);
    }, []);

    useEffect(() => {
        fetchMedications();
    }, [fetchMedications]);

    const inventoryValue = useMemo(() => {
        if (!Array.isArray(medications)) return 0;
        return medications.reduce((sum, med) => {
            if (!med) return sum;
            return sum + (Number(med.cost_price || 0) * (Number(med.stock) || 0));
        }, 0);
    }, [medications]);

    const potentialRevenue = useMemo(() => {
        if (!Array.isArray(medications)) return 0;
        return medications.reduce((sum, med) => {
            if (!med) return sum;
            const totalMg = Number(med.total_mg_per_vial) || 0;
            const refDose = 2.5;
            const dosesPerVial = totalMg > 0 ? totalMg / refDose : 1;
            const salePrice = Number(med.sale_price) || 0;
            const stock = Number(med.stock) || 0;
            return sum + (salePrice * dosesPerVial * stock);
        }, 0);
    }, [medications]);

    const averageProfitMargin = useMemo(() => {
        const totalProfit = potentialRevenue - inventoryValue;
        if (inventoryValue <= 0 || isNaN(totalProfit) || !isFinite(totalProfit)) return 0;
        return (totalProfit / inventoryValue) * 100;
    }, [inventoryValue, potentialRevenue]);

    // Memoize the table rows to prevent unnecessary re-renders
    const tableRows = useMemo(() => {
        if (medications.length === 0) {
            return (
                <tr key="empty-row">
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin"></div>
                                Carregando estoque...
                            </div>
                        ) : 'Nenhum medicamento em estoque.'}
                    </td>
                </tr>
            );
        }

        return medications.map(med => {
            if (!med || !med.id) return null;

            const totalMg = Number(med.total_mg_per_vial) || 0;
            const conc = Number(med.concentration_mg_ml) || 1;
            const volume = conc > 0 ? totalMg / conc : 0;
            const ui = volume * 100;
            const refDose = 2.5;
            const dosesPerVial = totalMg > 0 ? totalMg / refDose : 1;
            const salePrice = Number(med.sale_price) || 0;
            const costPrice = Number(med.cost_price) || 0;
            const profitPerVial = (salePrice * dosesPerVial) - costPrice;
            const stock = Number(med.stock) || 0;
            const stockStatusColor = stock < 5 ? 'text-red-500' : 'text-slate-900 dark:text-white';

            return (
                <tr key={med.id} className="bg-surface-light dark:bg-surface-dark hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4">
                        <div className="font-medium text-slate-900 dark:text-white text-sm">{med.name || 'Sem nome'}</div>
                        <div className="text-xs text-slate-500">{med.supplier || 'N/A'}</div>
                    </td>
                    <td className={`px-6 py-4 font-semibold text-sm ${stockStatusColor}`}>
                        {stock} frascos
                    </td>
                    <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{conc} mg/mL</div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{totalMg} mg</div>
                        <div className="text-[10px] text-slate-500">{volume.toFixed(2)} mL ({ui.toFixed(0)} UI)</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-500 dark:text-slate-400">{formatCurrency(costPrice)}</td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-500 dark:text-slate-400">{formatCurrency(salePrice)}</td>
                    <td className={`px-6 py-4 text-sm font-mono font-semibold ${profitPerVial > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(profitPerVial)}
                    </td>
                    <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => handleAdjust(med)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                title="Ajustar Estoque"
                            >
                                <span className="material-symbols-outlined text-xl">inventory_2</span>
                            </button>
                            <button
                                onClick={() => handleEdit(med)}
                                className="p-1.5 text-slate-400 hover:text-primary dark:hover:text-primary rounded-lg transition-colors"
                                title="Editar"
                            >
                                <span className="material-symbols-outlined text-xl">edit</span>
                            </button>
                            <button
                                onClick={() => handleDeleteClick(med)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-600 rounded-lg transition-colors"
                                title="Remover"
                            >
                                <span className="material-symbols-outlined text-xl">delete</span>
                            </button>
                        </div>
                    </td>
                </tr>
            );
        }).filter(Boolean);
    }, [medications, loading]);

    return (
        <div className="flex-1 max-w-[1440px] mx-auto w-full">
            <div className="flex flex-col md:flex-row flex-wrap justify-between gap-4 mb-8">
                <div className="flex min-w-72 flex-col gap-2">
                    <h1 className="text-slate-900 dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">Gestão de Estoque</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-base font-normal leading-normal">Controle de inventário e custos de medicamentos</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => handleAdjust()}
                        className="flex min-w-[84px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                    >
                        <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                        <span className="truncate">Ajustar Estoque</span>
                    </button>
                    <button
                        onClick={() => {
                            setSelectedMedication(null);
                            setIsAddModalOpen(true);
                        }}
                        className="flex min-w-[84px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30"
                    >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        <span className="truncate">Nova Medicação</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard title="Valor do Inventário" value={formatCurrency(inventoryValue)} icon="inventory" iconColor="bg-blue-500" />
                <StatCard title="Receita Potencial" value={formatCurrency(potentialRevenue)} icon="trending_up" iconColor="bg-green-500" />
                <StatCard title="Margem de Lucro Média" value={`${averageProfitMargin.toFixed(1)}%`} icon="percent" iconColor="bg-yellow-500" />
            </div>

            {/* Legenda de Ações */}
            <div className="flex flex-wrap items-center gap-6 mb-6 px-4 py-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Legenda de Ações:</span>
                <div className="flex flex-wrap items-center gap-4 ml-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <span className="material-symbols-outlined text-sm leading-none">inventory_2</span>
                        </div>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Ajustar Balanço</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-lg">
                            <span className="material-symbols-outlined text-sm leading-none">edit</span>
                        </div>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Editar Cadastro</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 text-slate-400 bg-red-100/50 dark:bg-slate-700 rounded-lg">
                            <span className="material-symbols-outlined text-sm leading-none text-rose-500">delete</span>
                        </div>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Remover Permanente</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-surface-light dark:bg-surface-dark shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 text-left text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Medicamento</th>
                                <th className="px-6 py-4 text-left text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Estoque</th>
                                <th className="px-6 py-4 text-left text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Unidade Clínica</th>
                                <th className="px-6 py-4 text-left text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Conteúdo/Frasco</th>
                                <th className="px-6 py-4 text-left text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Preço Custo (Frasco)</th>
                                <th className="px-6 py-4 text-left text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Venda (Ref. 2.5mg)</th>
                                <th className="px-6 py-4 text-left text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Lucro Est. (Frasco)</th>
                                <th className="px-6 py-4 text-right text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {tableRows}
                        </tbody>
                    </table>
                </div>
            </div>

            {isAddModalOpen && (
                <AddMedicationModal
                    isOpen={isAddModalOpen}
                    onClose={handleCloseAddModal}
                    onSuccess={handleMedicationChange}
                    medicationToEdit={selectedMedication}
                />
            )}

            {isAdjustModalOpen && (
                <AdjustStockModal
                    isOpen={isAdjustModalOpen}
                    onClose={handleCloseAdjustModal}
                    onStockUpdate={handleStockUpdate}
                    initialMedication={selectedMedication}
                    allMedications={medications}
                />
            )}

            {isDeleteModalOpen && selectedMedication && (
                <ConfirmDeleteModal
                    isOpen={isDeleteModalOpen}
                    onClose={handleCloseDeleteModal}
                    onConfirm={handleConfirmDelete}
                    medicationName={selectedMedication.name || 'Medicação'}
                    loading={deleteLoading}
                />
            )}
        </div>
    );
};

export default MedicationsPage;
