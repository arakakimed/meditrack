import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import TagManagerModal, { TAG_COLORS } from './TagManagerModal';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    patientName: string;
    isDeleting: boolean;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ isOpen, onClose, onConfirm, patientName, isDeleting }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8 text-center">
                    <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mb-6">
                        <span className="material-symbols-outlined text-3xl">delete_forever</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Excluir Paciente?</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">
                        Tem certeza que deseja remover <strong>{patientName}</strong>? Todos os agendamentos, histórico de aplicações e registros financeiros vinculados serão deletados permanentemente.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={isDeleting}
                            className="flex-1 px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isDeleting}
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-500/20 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {isDeleting ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <span>Excluir</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface PatientsPageProps {
    onViewPatient: (patient: any) => void;
    onEditPatient: (patient: any) => void;
    onAddPatient: () => void;
    onManageTags: () => void;
}

const PatientsPage: React.FC<PatientsPageProps> = ({ onViewPatient, onEditPatient, onAddPatient, onManageTags }) => {
    const [patients, setPatients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string, name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Tag System State
    const [tags, setTags] = useState<any[]>([]);
    const [selectedTagFilter, setSelectedTagFilter] = useState<string>('');

    // State for expanded card
    const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);

    const fetchPatients = async () => {
        setLoading(true);
        try {
            // 1. Fetch Patients
            const { data: patientsData, error: patientsError } = await supabase
                .from('patients')
                .select('*')
                .order('name', { ascending: true });

            if (patientsError) throw patientsError;

            // 2. Fetch Injections (to get Real Current Weight)
            const { data: injectionsData, error: injectionsError } = await supabase
                .from('injections')
                .select('patient_id, patient_weight_at_injection, applied_at')
                .order('applied_at', { ascending: false });

            if (injectionsError) throw injectionsError;

            // 3. Map patients with dynamic weight
            const enhancedPatients = (patientsData || []).map(patient => {
                // Find latest injection for this patient with valid weight
                const patientInjections = (injectionsData || []).filter(inj => inj.patient_id === patient.id && inj.patient_weight_at_injection);
                const latestInj = patientInjections.length > 0 ? patientInjections[0] : null;

                // Priority: Latest Injection > DB Initial (Ignore stale DB current)
                const dynamicCurrentWeight = latestInj
                    ? latestInj.patient_weight_at_injection
                    : patient.initial_weight;

                const initial = patient.initial_weight || 0;
                const current = dynamicCurrentWeight || 0;
                const change = current - initial;

                return {
                    ...patient,
                    current_weight: current,
                    weight_change: parseFloat(change.toFixed(1))
                };
            });

            setPatients(enhancedPatients);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchTags = async () => {
        const { data } = await supabase.from('clinic_tags').select('*');
        if (data) setTags(data);
    };

    useEffect(() => {
        fetchPatients();
        fetchTags();
    }, []);

    const handleDelete = async () => {
        if (!confirmDelete) return;

        setIsDeleting(true);
        try {
            // 1. Manually clean up dependencies (as fallback for DB cascade)
            await supabase.from('upcoming_doses').delete().eq('patient_id', confirmDelete.id);
            await supabase.from('financial_records').delete().eq('patient_id', confirmDelete.id);
            await supabase.from('injections').delete().eq('patient_id', confirmDelete.id);

            // 2. Delete the patient
            const { error } = await supabase
                .from('patients')
                .delete()
                .eq('id', confirmDelete.id);

            if (error) throw error;

            setPatients(prev => prev.filter(p => p.id !== confirmDelete.id));
            setConfirmDelete(null);
        } catch (err: any) {
            console.error('Delete error:', err);
            alert('Erro ao excluir: ' + (err.message || 'Erro desconhecido'));
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredPatients = patients.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTag = selectedTagFilter
            ? p.tags && p.tags.includes(selectedTagFilter)
            : true;
        return matchesSearch && matchesTag;
    });

    const getBMICategoryStyle = (category: string) => {
        switch (category) {
            case 'Normal': return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
            case 'Overweight': case 'Sobrepeso': return 'bg-amber-50 text-amber-700 ring-amber-600/20';
            case 'Obese': case 'Obesidade': return 'bg-rose-50 text-rose-700 ring-rose-600/20';
            default: return 'bg-slate-50 text-slate-700 ring-slate-600/20';
        }
    };

    return (
        <div className="flex flex-col gap-6 pb-20 md:pb-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Gestão de Pacientes</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {patients.length} {patients.length === 1 ? 'paciente cadastrado' : 'pacientes cadastrados'}
                    </p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-3">
                    {/* Tag Filter */}
                    <div className="relative w-full md:w-auto md:min-w-[160px]">
                        <select
                            value={selectedTagFilter}
                            onChange={(e) => setSelectedTagFilter(e.target.value)}
                            className="w-full pl-3 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700 dark:text-slate-300 appearance-none cursor-pointer"
                        >
                            <option value="">Todas as Etiquetas</option>
                            {tags.map(tag => (
                                <option key={tag.id} value={tag.id}>{tag.name}</option>
                            ))}
                        </select>
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <span className="material-symbols-outlined text-lg">filter_list</span>
                        </span>
                    </div>

                    <div className="relative w-full md:flex-1 md:min-w-[240px]">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                            <span className="material-symbols-outlined text-[20px]">search</span>
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar por nome..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-900 dark:text-white"
                        />
                    </div>
                    <button
                        onClick={onAddPatient}
                        className="inline-flex items-center gap-2 bg-primary hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95 whitespace-nowrap"
                    >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        Novo Paciente
                    </button>
                    <button
                        onClick={onManageTags}
                        className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                        title="Gerenciar Etiquetas"
                    >
                        <span className="material-symbols-outlined">label_important</span>
                    </button>
                </div>
            </div>

            {/* Mobile-First Card List */}
            <div className="flex flex-col gap-3">
                {loading ? (
                    <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                            <span className="text-sm font-medium">Carregando pacientes...</span>
                        </div>
                    </div>
                ) : filteredPatients.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <div className="flex flex-col items-center gap-2">
                            <span className="material-symbols-outlined text-4xl">person_search</span>
                            <span className="text-sm font-medium">Nenhum paciente encontrado.</span>
                        </div>
                    </div>
                ) : (
                    filteredPatients.map((patient) => {
                        const isExpanded = expandedPatientId === patient.id;

                        // Tag Logic
                        const patientTags = patient.tags || [];
                        const hasTags = patientTags.length > 0;
                        let validTags: any[] = [];
                        let avatarStyle = {};
                        let textClass = 'text-primary';
                        let containerClass = 'bg-primary/10';

                        if (hasTags) {
                            validTags = patientTags
                                .map((tId: string) => tags.find(t => t.id === tId))
                                .filter(Boolean);

                            if (validTags.length === 1) {
                                const color = TAG_COLORS.find(c => c.name === validTags[0].color);
                                if (color) {
                                    containerClass = `border-2 ${color.bg} ${color.border}`;
                                    textClass = color.text;
                                }
                            } else if (validTags.length > 1) {
                                const gradientStops = validTags.map((tag: any, index: number) => {
                                    const color = TAG_COLORS.find(c => c.name === tag.color);
                                    return `${color?.hex || '#e2e8f0'} ${index * (100 / validTags.length)}% ${(index + 1) * (100 / validTags.length)}%`;
                                }).join(', ');

                                avatarStyle = { background: `conic-gradient(${gradientStops})` };
                                containerClass = '';
                                textClass = 'text-slate-700 dark:text-white mix-blend-hard-light drop-shadow-sm';
                            }
                        }

                        return (
                            <div
                                key={patient.id}
                                id={`patient-card-${patient.id}`}
                                className={`bg-white dark:bg-slate-800 rounded-2xl border transition-all duration-300 overflow-hidden ${isExpanded
                                    ? 'border-primary/50 shadow-lg shadow-primary/5 ring-1 ring-primary/10'
                                    : 'border-slate-200 dark:border-slate-700 shadow-sm hover:border-slate-300 dark:hover:border-slate-600'
                                    }`}
                            >
                                {/* Header - Always Visible */}
                                <div
                                    onClick={() => {
                                        const newExpanded = isExpanded ? null : patient.id;
                                        setExpandedPatientId(newExpanded);
                                        // Scroll into view after expansion
                                        if (newExpanded) {
                                            setTimeout(() => {
                                                const element = document.getElementById(`patient-card-${patient.id}`);
                                                if (element) {
                                                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                }
                                            }, 50);
                                        }
                                    }}
                                    className="p-4 flex items-center justify-between cursor-pointer active:bg-slate-50 dark:active:bg-slate-700/50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Avatar */}
                                        <div
                                            className={`h-12 w-12 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden border border-white dark:border-slate-700 shadow-sm ${containerClass}`}
                                            style={avatarStyle}
                                        >
                                            {patient.avatar_url ? (
                                                <img src={patient.avatar_url} alt="" className="h-full w-full object-cover" />
                                            ) : (
                                                <div className={`h-full w-full flex items-center justify-center ${validTags?.length > 1 ? 'bg-white/40 backdrop-blur-[1px]' : ''}`}>
                                                    <span className={textClass}>{patient.initials}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Basic Info */}
                                        <div className="flex flex-col">
                                            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                                                {patient.name}
                                            </h3>

                                            {/* Tag Badges (Collapsed) */}
                                            {hasTags && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {validTags.map((tag) => {
                                                        const color = TAG_COLORS.find(c => c.name === tag.color) || TAG_COLORS[0];
                                                        return (
                                                            <span key={tag.id} className={`w-2 h-2 rounded-full ${color.bg} ${color.border} border`}></span>
                                                        );
                                                    })}
                                                    <span className="text-xs text-slate-400 ml-1">
                                                        {validTags.map(t => t.name).join(', ')}
                                                    </span>
                                                </div>
                                            )}
                                            {!hasTags && (
                                                <span className="text-xs text-slate-400 mt-1">
                                                    ID: {patient.id.substring(0, 8)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Current Weight - Prominent */}
                                    <div className="flex flex-col items-end">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                                                {patient.current_weight}
                                            </span>
                                            <span className="text-xs font-medium text-slate-400 lowercase">kg</span>
                                        </div>
                                        <span className={`flex items-center gap-0.5 text-[10px] font-bold ${(patient.initial_weight - patient.current_weight) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {(patient.initial_weight - patient.current_weight) >= 0 ? (
                                                <span className="material-symbols-outlined text-[12px]">trending_down</span>
                                            ) : (
                                                <span className="material-symbols-outlined text-[12px]">trending_up</span>
                                            )}
                                            {Math.abs(patient.initial_weight - patient.current_weight).toFixed(1)}kg
                                        </span>
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30">
                                        <div className="p-5 flex flex-col gap-5">

                                            {/* Key Stats Row */}
                                            <div className="flex items-start justify-between">
                                                {/* Age & Gender - Simplified & Prominent */}
                                                <div className="flex flex-col gap-1">
                                                    <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Idade</div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                                            {patient.age}
                                                            <span className="text-sm font-bold text-slate-400 ml-1">anos</span>
                                                        </span>
                                                        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${patient.gender === 'Female'
                                                            ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                                                            : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                                            }`}>
                                                            <span className="material-symbols-outlined text-xl">
                                                                {patient.gender === 'Female' ? 'female' : 'male'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Prominent BMI Display */}
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">IMC Atual</div>
                                                    <div className="flex flex-col items-end">
                                                        <span className={`text-4xl font-black leading-none ${patient.bmi_category === 'Normal' ? 'text-emerald-500' :
                                                            patient.bmi_category === 'Overweight' ? 'text-amber-500' :
                                                                'text-rose-500'
                                                            }`}>
                                                            {patient.bmi}
                                                        </span>
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider mt-1 px-2 py-0.5 rounded-full ${getBMICategoryStyle(patient.bmi_category)}`}>
                                                            {patient.bmi_category === 'Overweight' ? 'Sobrepeso' :
                                                                patient.bmi_category === 'Obese' ? 'Obesidade' :
                                                                    patient.bmi_category === 'Underweight' ? 'Abaixo do Peso' :
                                                                        patient.bmi_category}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Goal Progress Bar - Refined */}
                                            <div className="space-y-2 bg-white dark:bg-slate-700/30 p-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                                <div className="flex justify-between items-end">
                                                    <div className="flex items-center gap-1.5 text-slate-500">
                                                        <span className="material-symbols-outlined text-sm">flag</span>
                                                        <span className="text-[10px] uppercase tracking-wider font-bold">Progresso da Meta</span>
                                                    </div>
                                                    <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                                        {patient.target_weight}kg
                                                    </div>
                                                </div>
                                                <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-600">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 shadow-sm relative"
                                                        style={{ width: `${Math.min(100, Math.max(0, ((patient.initial_weight - patient.current_weight) / (patient.initial_weight - patient.target_weight)) * 100))}%` }}
                                                    >
                                                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
                                                    <span>Faltam {Math.max(0, (patient.current_weight - patient.target_weight)).toFixed(1)}kg</span>
                                                    <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                                        <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                                                        {Math.floor((new Date().getTime() - new Date(patient.created_at).getTime()) / (1000 * 60 * 60 * 24))} dias
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Vibrant Action Buttons */}
                                            <div className="grid grid-cols-3 gap-3 pt-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onViewPatient(patient); }}
                                                    className="col-span-1 flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-500/20 active:scale-95 transition-all hover:bg-violet-700"
                                                >
                                                    <span className="material-symbols-outlined text-2xl">visibility</span>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">Ver</span>
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onEditPatient(patient); }}
                                                    className="col-span-1 flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 active:scale-95 transition-all hover:bg-blue-700"
                                                >
                                                    <span className="material-symbols-outlined text-2xl">edit</span>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">Editar</span>
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setConfirmDelete({ id: patient.id, name: patient.name }); }}
                                                    className="col-span-1 flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-rose-500 text-white shadow-lg shadow-rose-500/20 active:scale-95 transition-all hover:bg-rose-600"
                                                >
                                                    <span className="material-symbols-outlined text-2xl">delete</span>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">Excluir</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            <DeleteConfirmationModal
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={handleDelete}
                patientName={confirmDelete?.name || ''}
                isDeleting={isDeleting}
            />
        </div>
    );
};

export default PatientsPage;
