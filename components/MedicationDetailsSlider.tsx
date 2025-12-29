import React from 'react';

interface Medication {
    id: string;
    name: string;
    supplier?: string;
    stock: number;
    concentration_mg_ml: number;
    total_mg_per_vial: number;
    cost_price: number;
    sale_price: number;
    doses_per_vial?: number;
}

interface MedicationDetailsSliderProps {
    isOpen: boolean;
    onClose: () => void;
    medication: Medication | null;
    onEdit: (med: Medication) => void;
    onAdjustStock: (med: Medication) => void;
    onDelete: (med: Medication) => void;
}

const formatCurrency = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return 'R$ 0,00';
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const MedicationDetailsSlider: React.FC<MedicationDetailsSliderProps> = ({
    isOpen,
    onClose,
    medication,
    onEdit,
    onAdjustStock,
    onDelete
}) => {
    if (!medication) return null;

    // Derived Calculations
    const conc = Number(medication.concentration_mg_ml) || 0;
    const totalMg = Number(medication.total_mg_per_vial) || 0;
    const volume = conc > 0 ? totalMg / conc : 0;
    const refDose = 2.5; // Default reference dose
    const dosesPerVial = totalMg > 0 ? totalMg / refDose : 0;

    // Financials
    const cost = Number(medication.cost_price) || 0;
    const sale = Number(medication.sale_price) || 0;
    const profitPerVial = (sale * dosesPerVial) - cost;
    const margin = cost > 0 ? (profitPerVial / cost) * 100 : 0;

    return (
        <div className={`fixed inset-0 z-[100] transition-visibility duration-300 ${isOpen ? 'visible' : 'invisible'}`}>
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            ></div>

            {/* Slider Panel */}
            <div className={`absolute top-0 right-0 h-full w-full sm:w-[500px] bg-white dark:bg-slate-900 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-start">
                    <div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Detalhes do Medicamento</span>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{medication.name}</h2>
                        {medication.supplier && (
                            <p className="text-slate-500 font-medium text-sm mt-1">{medication.supplier}</p>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <span className="material-symbols-outlined text-slate-500">close</span>
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* Stock Status Card */}
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <span className="material-symbols-outlined text-9xl">inventory_2</span>
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-blue-100 text-sm font-bold uppercase tracking-wider mb-2">Estoque Atual</h3>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-black tracking-tight">{medication.stock}</span>
                                <span className="text-xl font-medium text-blue-100">frascos</span>
                            </div>
                            <button
                                onClick={() => onAdjustStock(medication)}
                                className="mt-6 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
                            >
                                <span className="material-symbols-outlined text-lg">edit_square</span>
                                Ajustar Estoque
                            </button>
                        </div>
                    </div>

                    {/* Quick Specs Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                            <div className="text-slate-500 text-xs font-bold uppercase mb-1">Concentração</div>
                            <div className="text-slate-900 dark:text-white font-bold text-lg">{conc} mg/mL</div>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                            <div className="text-slate-500 text-xs font-bold uppercase mb-1">Volume Total</div>
                            <div className="text-slate-900 dark:text-white font-bold text-lg">{volume.toFixed(2)} mL</div>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                            <div className="text-slate-500 text-xs font-bold uppercase mb-1">Conteúdo Total</div>
                            <div className="text-slate-900 dark:text-white font-bold text-lg">{totalMg} mg</div>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                            <div className="text-slate-500 text-xs font-bold uppercase mb-1">Doses (2.5mg)</div>
                            <div className="text-slate-900 dark:text-white font-bold text-lg">~{dosesPerVial.toFixed(0)} doses</div>
                        </div>
                    </div>

                    {/* Financial Analysis */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-emerald-500">attach_money</span>
                            Análise Financeira (Por Frasco)
                        </h3>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                            <div className="p-4 flex justify-between items-center">
                                <span className="text-slate-500 text-sm font-medium">Preço de Custo</span>
                                <span className="text-slate-900 dark:text-white font-bold">{formatCurrency(cost)}</span>
                            </div>
                            <div className="p-4 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                                <span className="text-slate-500 text-sm font-medium">Preço de Venda (Est.)</span>
                                <div className="text-right">
                                    <span className="text-slate-900 dark:text-white font-bold block">{formatCurrency(sale * dosesPerVial)}</span>
                                    <span className="text-xs text-slate-400">({formatCurrency(sale)} / dose)</span>
                                </div>
                            </div>
                            <div className="p-4 flex justify-between items-center bg-emerald-50/50 dark:bg-emerald-900/10">
                                <span className="text-emerald-700 dark:text-emerald-400 text-sm font-bold">Lucro Estimado</span>
                                <div className="text-right">
                                    <span className="text-emerald-700 dark:text-emerald-400 font-black block text-lg">{formatCurrency(profitPerVial)}</span>
                                    <span className="text-xs text-emerald-600 dark:text-emerald-500 font-bold">{margin.toFixed(0)}% de margem</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex gap-4">
                    <button
                        onClick={() => onEdit(medication)}
                        className="flex-1 py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">edit</span>
                        Editar
                    </button>
                    <button
                        onClick={() => onDelete(medication)}
                        className="flex-1 py-3 px-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 rounded-xl font-bold hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">delete</span>
                        Excluir
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MedicationDetailsSlider;
