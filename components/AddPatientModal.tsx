import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface AddPatientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    patientToEdit?: any; // Added for edit mode
}

const AddPatientModal: React.FC<AddPatientModalProps> = ({ isOpen, onClose, onSuccess, patientToEdit }) => {
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState<'Male' | 'Female'>('Female');
    const [weight, setWeight] = useState('');
    const [initialWeight, setInitialWeight] = useState('');
    const [targetWeight, setTargetWeight] = useState('');
    const [height, setHeight] = useState(''); // cm
    const [error, setError] = useState<string | null>(null);

    // Initial fill for edit mode
    React.useEffect(() => {
        if (patientToEdit) {
            setName(patientToEdit.name || '');
            setAge(patientToEdit.age?.toString() || '');
            setGender(patientToEdit.gender || 'Female');
            setWeight(patientToEdit.current_weight?.toString() || '');
            setInitialWeight(patientToEdit.initial_weight?.toString() || '');
            setTargetWeight(patientToEdit.target_weight?.toString() || '');
            // We don't have height in the DB yet, but we can assume or let user fill
            setHeight('170');
        } else {
            setName('');
            setAge('');
            setGender('Female');
            setWeight('');
            setInitialWeight('');
            setTargetWeight('');
            setHeight('');
        }
    }, [patientToEdit, isOpen]);

    if (!isOpen) return null;

    const calculateBMI = (w: number, h: number) => {
        const hInMeters = h / 100;
        return parseFloat((w / (hInMeters * hInMeters)).toFixed(1));
    };

    const getBMICategory = (bmi: number) => {
        if (bmi < 18.5) return 'Underweight';
        if (bmi < 25) return 'Normal';
        if (bmi < 30) return 'Overweight';
        return 'Obese';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            const weightNum = parseFloat(weight);
            const heightNum = parseFloat(height);
            const bmiValue = calculateBMI(weightNum, heightNum);
            const bmiCat = getBMICategory(bmiValue);
            const initialsStr = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

            const patientData = {
                name,
                age: parseInt(age),
                gender,
                current_weight: weightNum,
                initial_weight: parseFloat(initialWeight) || weightNum,
                target_weight: parseFloat(targetWeight),
                bmi: bmiValue,
                bmi_category: bmiCat,
                initials: initialsStr,
                user_id: user.id
            };

            if (patientToEdit?.id) {
                const { error: updateError } = await supabase
                    .from('patients')
                    .update(patientData)
                    .eq('id', patientToEdit.id);
                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('patients')
                    .insert([patientData]);
                if (insertError) throw insertError;
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar paciente');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <span className="material-symbols-outlined">{patientToEdit ? 'edit' : 'person_add'}</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{patientToEdit ? 'Editar Paciente' : 'Novo Paciente'}</h3>
                            <p className="text-xs text-slate-500">Mantenha os dados atualizados</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Nome Completo</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
                                placeholder="Ex: Ana Maria Silva"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Age */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Idade</label>
                                <input
                                    type="number"
                                    required
                                    value={age}
                                    onChange={(e) => setAge(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
                                    placeholder="anos"
                                />
                            </div>
                            {/* Gender */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Gênero</label>
                                <select
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value as 'Male' | 'Female')}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white appearance-none"
                                >
                                    <option value="Female">Feminino</option>
                                    <option value="Male">Masculino</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Weight */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Peso Atual (kg)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    required
                                    value={weight}
                                    onChange={(e) => {
                                        setWeight(e.target.value);
                                        if (!patientToEdit && !initialWeight) setInitialWeight(e.target.value);
                                    }}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
                                    placeholder="00.0"
                                />
                            </div>
                            {/* Target Weight */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Meta de Peso (kg)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    required
                                    value={targetWeight}
                                    onChange={(e) => setTargetWeight(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-blue-200 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-900/10 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
                                    placeholder="00.0"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Initial Weight */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Peso de Início (kg)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    required
                                    value={initialWeight}
                                    onChange={(e) => setInitialWeight(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
                                    placeholder="Peso no dia 1"
                                />
                            </div>
                            {/* Height */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Altura (cm)</label>
                                <input
                                    type="number"
                                    required
                                    value={height}
                                    onChange={(e) => setHeight(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
                                    placeholder="Ex: 170"
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm">
                            <span className="material-symbols-outlined">error</span>
                            {error}
                        </div>
                    )}

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-primary hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <>
                                    <span>Salvar Paciente</span>
                                    <span className="material-symbols-outlined">check</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddPatientModal;
