import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TAG_COLORS } from './TagManagerModal';

interface AddPatientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    patientToEdit?: any; // Added for edit mode
    onManageTags?: () => void;
}

const AddPatientModal: React.FC<AddPatientModalProps> = ({ isOpen, onClose, onSuccess, patientToEdit, onManageTags }) => {
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState<'Male' | 'Female' | ''>('');
    const [weight, setWeight] = useState('');
    const [initialWeight, setInitialWeight] = useState('');
    const [targetWeight, setTargetWeight] = useState('');
    const [height, setHeight] = useState(''); // cm
    const [dateOfBirth, setDateOfBirth] = useState('');


    // Medical data
    const [tags, setTags] = useState<any[]>([]); // Available tags
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [comorbidities, setComorbidities] = useState<string[]>([]);
    const [clinicalNotes, setClinicalNotes] = useState('');
    const [bmi, setBmi] = useState(0);
    const [bmiCategory, setBmiCategory] = useState('');

    // UI states
    const [showTags, setShowTags] = useState(false);
    const [showComorbidities, setShowComorbidities] = useState(false);
    const [showObservations, setShowObservations] = useState(false);

    const [error, setError] = useState<string | null>(null);

    // Initial fill for edit mode
    React.useEffect(() => {
        if (patientToEdit) {
            setName(patientToEdit.name || '');
            setDateOfBirth(patientToEdit.date_of_birth || '');
            setAge(patientToEdit.age?.toString() || '');
            setGender(patientToEdit.gender || '');
            setWeight(patientToEdit.current_weight?.toString() || '');
            setInitialWeight(patientToEdit.initial_weight?.toString() || '');
            setTargetWeight(patientToEdit.target_weight?.toString() || '');
            setHeight('170');
            setSelectedTags(patientToEdit.tags || []);
            setComorbidities(patientToEdit.comorbidities || []);
            setClinicalNotes(patientToEdit.clinical_notes || '');
        } else {
            setName('');
            setDateOfBirth('');
            setAge('');
            setGender('');
            setWeight('');
            setInitialWeight('');
            setTargetWeight('');
            setHeight('');
            setSelectedTags([]);
            setComorbidities([]);
            setClinicalNotes('');
        }
    }, [patientToEdit, isOpen]);

    // Calculate age from date of birth
    const calculateAge = (birthDate: string): number => {
        if (!birthDate) return 0;
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    // Auto-calculate age when date of birth changes
    React.useEffect(() => {
        if (dateOfBirth) {
            const calculatedAge = calculateAge(dateOfBirth);
            setAge(calculatedAge.toString());
        }
    }, [dateOfBirth]);

    // Auto-calculate BMI when weight or height changes
    React.useEffect(() => {
        const calculateBMI = (w: number, h: number) => {
            const hInMeters = h / 100;
            return parseFloat((w / (hInMeters * hInMeters)).toFixed(1));
        };

        if (initialWeight && height) {
            const w = parseFloat(initialWeight);
            const h = parseFloat(height);
            if (w > 0 && h > 0) {
                const calculatedBMI = calculateBMI(w, h);
                setBmi(calculatedBMI);
            } else {
                setBmi(0);
            }
        } else {
            setBmi(0);
        }
    }, [initialWeight, height]);

    // Fetch available tags
    useEffect(() => {
        if (isOpen) {
            const fetchTags = async () => {
                const { data } = await supabase.from('clinic_tags').select('*').order('name');
                if (data) setTags(data);
            };
            fetchTags();
        }
    }, [isOpen]);

    // Comorbidities list
    const COMORBIDITIES = [
        'Diabetes Tipo 2',
        'Hipertensão Arterial',
        'Dislipidemia',
        'Apneia do Sono',
        'Doença Cardiovascular',
        'Esteatose Hepática',
        'Síndrome do Ovário Policístico',
        'Artrose',
        'Refluxo Gastroesofágico',
        'Depressão/Ansiedade'
    ];

    if (!isOpen) return null;

    const calculateBMI = (w: number, h: number) => {
        const hInMeters = h / 100;
        return parseFloat((w / (hInMeters * hInMeters)).toFixed(1));
    };

    const getBMICategory = (bmi: number) => {
        if (bmi < 18.5) return { label: 'Baixo Peso', color: 'yellow', icon: '⚠️', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' };
        if (bmi < 25) return { label: 'Peso Normal', color: 'green', icon: '✅', textColor: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
        if (bmi < 30) return { label: 'Sobrepeso', color: 'orange', icon: '⚡', textColor: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' };
        if (bmi < 35) return { label: 'Obesidade Grau I', color: 'red', icon: '🔴', textColor: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
        if (bmi < 40) return { label: 'Obesidade Grau II', color: 'red', icon: '🔴🔴', textColor: 'text-red-800', bgColor: 'bg-red-100', borderColor: 'border-red-300' };
        return { label: 'Obesidade Grau III', color: 'darkred', icon: '🔴🔴🔴', textColor: 'text-red-900', bgColor: 'bg-red-200', borderColor: 'border-red-400' };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            // For new patients, current weight is the same as initial weight
            // For existing patients, current weight comes from the specific input
            const initialWeightNum = parseFloat(initialWeight);
            const currentWeightNum = patientToEdit ? parseFloat(weight) : initialWeightNum;

            // Should verify if weights are valid numbers
            if (isNaN(initialWeightNum) || (patientToEdit && isNaN(currentWeightNum))) {
                throw new Error('Por favor, informe um peso válido');
            }

            const heightNum = parseFloat(height);
            // Calculate BMI based on current logic (initial weight for new, current for edit?? actually BMI is usually current, but let's stick to what we have or fix it)
            // The BMI display in the form uses initialWeight. Let's consistency use the weight we just determined.
            // Actually, usually BMI is calculated on current status.

            const bmiWeight = patientToEdit ? currentWeightNum : initialWeightNum;
            const bmiValue = calculateBMI(bmiWeight, heightNum);

            const bmiCat = getBMICategory(bmiValue);
            const initialsStr = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

            const patientData = {
                name,
                age: parseInt(age),
                date_of_birth: dateOfBirth,
                gender,
                current_weight: currentWeightNum,
                initial_weight: initialWeightNum,
                target_weight: parseFloat(targetWeight),
                bmi: bmiValue,
                bmi_category: bmiCat.label,
                tags: selectedTags,
                comorbidities: comorbidities,
                clinical_notes: clinicalNotes,
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

                <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                    <div className="grid grid-cols-1 gap-6">
                        {/* Name */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                <span className="material-symbols-outlined text-blue-600 text-lg">person</span>
                                Nome Completo
                            </label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value.toUpperCase())}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
                                placeholder="Ex: Ana Maria Silva"
                            />
                        </div>

                        {/* Date of Birth & Age */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    <span className="material-symbols-outlined text-pink-600 text-lg">cake</span>
                                    Data de Nascimento
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={dateOfBirth}
                                    onChange={(e) => setDateOfBirth(e.target.value)}
                                    max={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    <span className="material-symbols-outlined text-purple-600 text-lg">today</span>
                                    Idade
                                    <span className="text-xs font-normal text-slate-500">(calculada)</span>
                                </label>
                                <div className="h-[50px] flex items-center px-1">
                                    {age ? (
                                        <span className="text-2xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent animate-in fade-in zoom-in-50 duration-500">
                                            {age} anos
                                        </span>
                                    ) : (
                                        <span className="text-sm text-slate-400 italic">
                                            Aguardando data...
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Gender */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                                <span className="material-symbols-outlined text-indigo-600 text-lg">wc</span>
                                Gênero
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setGender('Female')}
                                    className={`flex items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 font-bold transition-all ${gender === 'Female'
                                        ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300'
                                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-pink-300 hover:bg-pink-50/50'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-2xl">female</span>
                                    <span>Feminino</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setGender('Male')}
                                    className={`flex items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 font-bold transition-all ${gender === 'Male'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-300 hover:bg-blue-50/50'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-2xl">male</span>
                                    <span>Masculino</span>
                                </button>
                            </div>
                        </div>

                        {/* Peso Inicial, Meta e Altura - For both new and existing patients now */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 h-8">
                                    <span className="material-symbols-outlined text-emerald-600 text-lg">scale</span>
                                    <span>Peso Inicial</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    required
                                    value={initialWeight}
                                    onChange={(e) => setInitialWeight(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
                                    placeholder="kg"
                                />
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 h-8">
                                    <span className="material-symbols-outlined text-blue-600 text-lg">flag</span>
                                    <span>Meta de Peso</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    required
                                    value={targetWeight}
                                    onChange={(e) => setTargetWeight(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-blue-200 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-900/10 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
                                    placeholder="kg"
                                />
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 h-8">
                                    <span className="material-symbols-outlined text-purple-600 text-lg">height</span>
                                    <span>Altura</span>
                                </label>
                                <input
                                    type="number"
                                    required
                                    value={height}
                                    onChange={(e) => setHeight(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
                                    placeholder="cm"
                                />
                            </div>
                        </div>

                        {/* BMI Display */}
                        {bmi > 0 && (
                            <div className={`p-4 rounded-xl border-2 ${getBMICategory(bmi).borderColor} ${getBMICategory(bmi).bgColor}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl">{getBMICategory(bmi).icon}</span>
                                        <div>
                                            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">IMC Calculado</div>
                                            <div className={`text-2xl font-black ${getBMICategory(bmi).textColor}`}>
                                                {bmi.toFixed(1)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`px-4 py-2 rounded-lg font-bold text-sm ${getBMICategory(bmi).textColor} bg-white/50`}>
                                        {getBMICategory(bmi).label}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tags - Collapsible */}
                        <div className="border-2 border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setShowTags(!showTags)}
                                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-blue-600 text-xl">label</span>
                                    <span className="font-bold text-slate-800 dark:text-white">Etiquetas</span>
                                    {selectedTags.length > 0 && (
                                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold">
                                            {selectedTags.length}
                                        </span>
                                    )}
                                </div>
                                <span className={`material-symbols-outlined text-slate-600 transition-transform ${showTags ? 'rotate-180' : ''}`}>
                                    expand_more
                                </span>
                            </button>

                            {showTags && (
                                <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                                    {tags.length === 0 ? (
                                        <div className="text-center text-slate-400 text-sm py-4">
                                            <p className="mb-2">Nenhuma etiqueta cadastrada.</p>
                                            {onManageTags && (
                                                <button
                                                    type="button"
                                                    onClick={onManageTags}
                                                    className="text-primary font-bold hover:underline"
                                                >
                                                    Criar Etiquetas
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {tags.map((tag) => {
                                                    const isSelected = selectedTags.includes(tag.id);
                                                    const color = TAG_COLORS.find(c => c.name === tag.color) || TAG_COLORS[0];

                                                    return (
                                                        <button
                                                            key={tag.id}
                                                            type="button"
                                                            onClick={() => {
                                                                if (isSelected) {
                                                                    setSelectedTags(selectedTags.filter(id => id !== tag.id));
                                                                } else {
                                                                    setSelectedTags([...selectedTags, tag.id]);
                                                                }
                                                            }}
                                                            className={`px-3 py-1.5 rounded-lg text-sm font-bold border-2 transition-all flex items-center gap-2 ${isSelected
                                                                ? `${color.bg} ${color.text} ${color.border} ring-2 ring-primary/20`
                                                                : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                                                }`}
                                                        >
                                                            {tag.name}
                                                            {isSelected && <span className="material-symbols-outlined text-sm">check</span>}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {onManageTags && (
                                                <div className="flex justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={onManageTags}
                                                        className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">settings</span>
                                                        Gerenciar Etiquetas
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Comorbidities - Collapsible */}
                        <div className="border-2 border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setShowComorbidities(!showComorbidities)}
                                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 hover:from-red-100 hover:to-pink-100 dark:hover:from-red-900/30 dark:hover:to-pink-900/30 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-red-600 text-xl">health_and_safety</span>
                                    <span className="font-bold text-slate-800 dark:text-white">Comorbidades</span>
                                    {comorbidities.length > 0 && (
                                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full text-xs font-bold">
                                            {comorbidities.length}
                                        </span>
                                    )}
                                </div>
                                <span className={`material-symbols-outlined text-slate-600 transition-transform ${showComorbidities ? 'rotate-180' : ''}`}>
                                    expand_more
                                </span>
                            </button>

                            {showComorbidities && (
                                <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {COMORBIDITIES.map((comorbidity) => (
                                            <label
                                                key={comorbidity}
                                                className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-all"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={comorbidities.includes(comorbidity)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setComorbidities([...comorbidities, comorbidity]);
                                                        } else {
                                                            setComorbidities(comorbidities.filter(c => c !== comorbidity));
                                                        }
                                                    }}
                                                    className="w-5 h-5 rounded border-2 border-slate-300 text-red-600 focus:ring-2 focus:ring-red-500/20"
                                                />
                                                <span className="text-sm text-slate-700 dark:text-slate-300">{comorbidity}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Clinical Observations - Collapsible */}
                        <div className="border-2 border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setShowObservations(!showObservations)}
                                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-900/30 dark:hover:to-orange-900/30 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-amber-600 text-xl">clinical_notes</span>
                                    <span className="font-bold text-slate-800 dark:text-white">Observações Clínicas</span>
                                    {clinicalNotes && (
                                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full text-xs font-bold">
                                            {clinicalNotes.length}
                                        </span>
                                    )}
                                </div>
                                <span className={`material-symbols-outlined text-slate-600 transition-transform ${showObservations ? 'rotate-180' : ''}`}>
                                    expand_more
                                </span>
                            </button>

                            {showObservations && (
                                <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                                    <textarea
                                        value={clinicalNotes}
                                        onChange={(e) => setClinicalNotes(e.target.value.slice(0, 500))}
                                        rows={4}
                                        maxLength={500}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all text-slate-900 dark:text-white resize-none"
                                        placeholder="Ex: Histórico familiar de diabetes, uso de medicamentos contínuos, alergias, etc."
                                    />
                                    <div className="text-xs text-slate-500 text-right mt-1">
                                        {clinicalNotes.length}/500 caracteres
                                    </div>
                                </div>
                            )}
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
