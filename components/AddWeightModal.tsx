import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface AddWeightModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    patientId: string;
    currentWeight: number; // For placeholder/default
}

const AddWeightModal: React.FC<AddWeightModalProps> = ({ isOpen, onClose, onSuccess, patientId, currentWeight }) => {
    const [weight, setWeight] = useState(currentWeight?.toString() || '');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const numWeight = parseFloat(weight);
            if (isNaN(numWeight) || numWeight <= 0) {
                throw new Error('Por favor, insira um peso válido.');
            }

            const { error: insertError } = await supabase
                .from('weight_measurements')
                .insert([{
                    patient_id: patientId,
                    weight: numWeight,
                    date: date
                }]);

            if (insertError) throw insertError;

            // Also update the patient's current_weight and calc BMI in the patients table
            // This ensures the "Current Weight" card stays fresh
            // Fetch height first to calc BMI
            const { data: patient } = await supabase.from('patients').select('height').eq('id', patientId).single();
            const h = patient?.height;
            let bmiUpdate = {};

            if (h) {
                const bmi = numWeight / ((h / 100) * (h / 100));
                let cat = 'Normal';
                if (bmi < 18.5) cat = 'Baixo Peso';
                else if (bmi >= 25 && bmi < 30) cat = 'Sobrepeso';
                else if (bmi >= 30) cat = 'Obesidade';

                bmiUpdate = {
                    bmi: bmi,
                    bmi_category: cat
                };
            }

            await supabase
                .from('patients')
                .update({
                    current_weight: numWeight,
                    ...bmiUpdate
                })
                .eq('id', patientId);


            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error adding weight:', err);
            setError(err.message || 'Erro ao salvar peso.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">monitor_weight</span>
                        Registrar Peso
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">error</span>
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Peso (kg)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.1"
                                required
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                                className="w-full pl-4 pr-10 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-slate-900 dark:text-white font-medium text-lg"
                                placeholder="0.0"
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <span className="text-slate-400 font-medium">kg</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Data da Pesagem
                        </label>
                        <input
                            type="date"
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-slate-900 dark:text-white"
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">save</span>
                                    Salvar Peso
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddWeightModal;
