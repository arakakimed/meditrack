import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface DosePackage {
    dosage: number;
    price: number;
    enabled: boolean;
}

interface AddMedicationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    medicationToEdit?: any;
}

const DEFAULT_PACKAGES: DosePackage[] = [
    { dosage: 2.5, price: 0, enabled: false },
    { dosage: 5, price: 0, enabled: false },
    { dosage: 7.5, price: 0, enabled: false },
    { dosage: 10, price: 0, enabled: false },
    { dosage: 12.5, price: 0, enabled: false },
    { dosage: 15, price: 0, enabled: false },
];

const AddMedicationModal: React.FC<AddMedicationModalProps> = ({ isOpen, onClose, onSuccess, medicationToEdit }) => {
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [supplier, setSupplier] = useState('');
    const [stock, setStock] = useState('0');
    const [costPrice, setCostPrice] = useState('0');
    const [salePrice, setSalePrice] = useState('0');
    const [concentrationMgMl, setConcentrationMgMl] = useState('20');
    const [totalMgPerVial, setTotalMgPerVial] = useState('10');
    const [error, setError] = useState<string | null>(null);

    // Packages state
    const [packages, setPackages] = useState<DosePackage[]>(DEFAULT_PACKAGES);
    const [showPackages, setShowPackages] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (medicationToEdit) {
                setName(medicationToEdit.name || '');
                setSupplier(medicationToEdit.supplier || '');
                setStock(medicationToEdit.stock?.toString() || '0');
                setCostPrice(medicationToEdit.cost_price?.toString() || '0');
                setSalePrice(medicationToEdit.sale_price?.toString() || '0');
                setConcentrationMgMl(medicationToEdit.concentration_mg_ml?.toString() || '20');
                setTotalMgPerVial(medicationToEdit.total_mg_per_vial?.toString() || '10');

                // Load existing packages from localStorage (until migration is run)
                let savedPackages = null;

                // Try localStorage first
                if (medicationToEdit.id) {
                    const stored = localStorage.getItem(`med_packages_${medicationToEdit.id}`);
                    if (stored) {
                        try {
                            savedPackages = JSON.parse(stored);
                        } catch { /* ignore */ }
                    }
                }

                if (savedPackages && savedPackages.length > 0) {
                    // Merge with defaults
                    const merged = DEFAULT_PACKAGES.map(dp => {
                        const saved = savedPackages.find((sp: DosePackage) => sp.dosage === dp.dosage);
                        return saved || dp;
                    });
                    setPackages(merged);
                    setShowPackages(savedPackages.some((p: DosePackage) => p.enabled));
                } else {
                    setPackages(DEFAULT_PACKAGES);
                    setShowPackages(false);
                }
            } else {
                setName('');
                setSupplier('');
                setStock('0');
                setCostPrice('0');
                setSalePrice('0');
                setConcentrationMgMl('20');
                setTotalMgPerVial('10');
                setPackages(DEFAULT_PACKAGES);
                setShowPackages(false);
            }
            setError(null);
            setLoading(false);
        }
    }, [medicationToEdit, isOpen]);

    if (!isOpen) return null;

    const handlePackageToggle = (dosage: number) => {
        setPackages(prev => prev.map(p =>
            p.dosage === dosage ? { ...p, enabled: !p.enabled } : p
        ));
    };

    const handlePackagePriceChange = (dosage: number, price: string) => {
        setPackages(prev => prev.map(p =>
            p.dosage === dosage ? { ...p, price: parseFloat(price) || 0 } : p
        ));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            const conc = parseFloat(concentrationMgMl) || 1;
            const totalMg = parseFloat(totalMgPerVial) || 0;
            const volume = totalMg / conc;

            // Only save enabled packages (stored in localStorage until migration is run)
            const enabledPackages = packages.filter(p => p.enabled && p.price > 0);

            const medData: any = {
                name,
                supplier,
                stock: parseInt(stock) || 0,
                cost_price: parseFloat(costPrice) || 0,
                sale_price: parseFloat(salePrice) || 0,
                concentration_mg_ml: conc,
                total_mg_per_vial: totalMg,
                volume_ml_per_vial: isFinite(volume) ? volume : 0,
                user_id: user.id
            };

            let medId = medicationToEdit?.id;

            if (medicationToEdit?.id) {
                const { error: updateError } = await supabase
                    .from('medications')
                    .update(medData)
                    .eq('id', medicationToEdit.id);
                if (updateError) throw updateError;
            } else {
                const { data: insertData, error: insertError } = await supabase
                    .from('medications')
                    .insert([medData])
                    .select('id')
                    .single();
                if (insertError) throw insertError;
                medId = insertData?.id;
            }

            // Save packages to localStorage as fallback
            if (medId && enabledPackages.length > 0) {
                localStorage.setItem(`med_packages_${medId}`, JSON.stringify(enabledPackages));
            } else if (medId) {
                localStorage.removeItem(`med_packages_${medId}`);
            }

            // Close the modal first
            onClose();

            // Schedule the refresh for next frame to avoid reconciliation issues
            requestAnimationFrame(() => {
                onSuccess();
            });

        } catch (err: any) {
            console.error('Error saving medication:', err);
            setError(err.message || 'Erro ao salvar medicação');
            setLoading(false);
        }
    };

    const calculatedVolume = (() => {
        const c = parseFloat(concentrationMgMl) || 1;
        const t = parseFloat(totalMgPerVial) || 0;
        return (t / c).toFixed(2);
    })();

    const calculatedUI = (() => {
        const c = parseFloat(concentrationMgMl) || 1;
        const t = parseFloat(totalMgPerVial) || 0;
        return ((t / c) * 100).toFixed(0);
    })();

    const activePackagesCount = packages.filter(p => p.enabled && p.price > 0).length;

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
                    maxWidth: '32rem',
                    overflow: 'hidden',
                    maxHeight: '90vh',
                    overflowY: 'auto'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
                    <h2 className="text-xl font-bold text-slate-900">
                        {medicationToEdit ? 'Editar Medicação' : 'Nova Medicação'}
                    </h2>
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

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Nome da Medicação</label>
                            <input
                                required
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900"
                                placeholder="Ex: Tirzepatida 2.5mg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Fornecedor</label>
                            <input
                                type="text"
                                value={supplier}
                                onChange={(e) => setSupplier(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900"
                                placeholder="Ex: Farmácia X"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Concentração</label>
                                <div className="relative">
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        value={concentrationMgMl}
                                        onChange={(e) => setConcentrationMgMl(e.target.value)}
                                        className="w-full pl-4 pr-16 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 font-mono"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">mg/mL</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Conteúdo Total</label>
                                <div className="relative">
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        value={totalMgPerVial}
                                        onChange={(e) => setTotalMgPerVial(e.target.value)}
                                        className="w-full pl-4 pr-12 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 font-mono"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">mg</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-500">calculate</span>
                                <span className="text-xs font-medium text-slate-600">Volume Resultante:</span>
                            </div>
                            <div className="text-right">
                                <span className="text-sm font-bold text-blue-600">{calculatedVolume} mL</span>
                                <span className="text-[10px] block text-slate-500">(ou {calculatedUI} UI)</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Estoque Inicial</label>
                            <div className="relative">
                                <input
                                    required
                                    type="number"
                                    value={stock}
                                    onChange={(e) => setStock(e.target.value)}
                                    className="w-full pl-4 pr-16 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 font-mono"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">FRASCOS</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Custo (Frasco)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-mono">R$</span>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        value={costPrice}
                                        onChange={(e) => setCostPrice(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 font-mono"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Venda (por mg)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-mono">R$</span>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        value={salePrice}
                                        onChange={(e) => setSalePrice(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 font-mono"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Dose Packages Section */}
                        <div className="border border-emerald-200 rounded-xl overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setShowPackages(!showPackages)}
                                className="w-full px-4 py-3 bg-emerald-50 flex items-center justify-between hover:bg-emerald-100 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-emerald-600">inventory_2</span>
                                    <span className="text-sm font-bold text-emerald-800">Pacotes de Doses</span>
                                    {activePackagesCount > 0 && (
                                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-600 text-white rounded-full">
                                            {activePackagesCount} ativo{activePackagesCount > 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                                <span className={`material-symbols-outlined text-emerald-600 transition-transform ${showPackages ? 'rotate-180' : ''}`}>
                                    expand_more
                                </span>
                            </button>

                            {showPackages && (
                                <div className="p-4 bg-white space-y-3">
                                    <p className="text-xs text-slate-500 mb-3">
                                        Defina preços fixos para doses padronizadas. Esses valores serão usados automaticamente ao registrar aplicações.
                                    </p>

                                    <div className="grid grid-cols-2 gap-2">
                                        {packages.map((pkg) => (
                                            <div
                                                key={pkg.dosage}
                                                className={`p-3 rounded-lg border transition-all ${pkg.enabled
                                                    ? 'border-emerald-300 bg-emerald-50'
                                                    : 'border-slate-200 bg-slate-50'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className={`text-sm font-bold ${pkg.enabled ? 'text-emerald-700' : 'text-slate-500'}`}>
                                                        {pkg.dosage} mg
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handlePackageToggle(pkg.dosage)}
                                                        className={`w-8 h-5 rounded-full transition-all ${pkg.enabled
                                                            ? 'bg-emerald-500'
                                                            : 'bg-slate-300'
                                                            }`}
                                                    >
                                                        <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${pkg.enabled ? 'translate-x-3.5' : 'translate-x-0.5'
                                                            }`}></div>
                                                    </button>
                                                </div>
                                                {pkg.enabled && (
                                                    <div className="relative">
                                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={pkg.price || ''}
                                                            onChange={(e) => handlePackagePriceChange(pkg.dosage, e.target.value)}
                                                            placeholder="0,00"
                                                            className="w-full pl-7 pr-2 py-1.5 text-sm bg-white border border-emerald-200 rounded-lg outline-none text-slate-900 font-mono"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-3 p-2 bg-amber-50 rounded-lg border border-amber-200">
                                        <p className="text-[10px] text-amber-700 flex items-start gap-1">
                                            <span className="material-symbols-outlined text-xs mt-0.5">info</span>
                                            <span>Doses fora dos pacotes serão cobradas pelo valor por mg ({' '}
                                                <strong>R$ {parseFloat(salePrice).toFixed(2)}/mg</strong>).</span>
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
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
                            className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <span className="material-symbols-outlined text-base">save</span>
                            )}
                            {medicationToEdit ? 'Salvar Alterações' : 'Cadastrar Medicação'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddMedicationModal;
