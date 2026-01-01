import React, { useState, useEffect, useCallback, useMemo } from 'react';
import WeightEvolutionChart, { WeightDataPoint } from './WeightEvolutionChart';
import { Patient, MedicationStep, Injection } from '../types';
import { supabase } from '../lib/supabase';
import EditMedicationStepModal from './EditMedicationStepModal';
import AddPatientModal from './AddPatientModal';
import GlobalRegisterDoseModal from './GlobalRegisterDoseModal';
import PaymentModal from './PaymentModal';
import DosePaymentModal from './DosePaymentModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import AddWeightModal from './AddWeightModal';
import { PatientFinancials } from './PatientFinancials';

// TIMEZONE-SAFE: Parse date string manually to avoid UTC conversion issues
const parseSafeDate = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const [year, month, day] = cleanDate.split('-').map(Number);
    if (!year || !month || !day) return new Date(dateStr);
    return new Date(year, month - 1, day);
};

// --- JORNADA DO PACIENTE ---
const MedicationPath: React.FC<{
    steps: MedicationStep[],
    onEditStep: (step: MedicationStep) => void,
    onAddStep: () => void,
    onPaymentClick: (step: MedicationStep) => void,
    onDeleteStep: (step: MedicationStep) => void,
    paidStepIds: Set<string>,
    patient: Patient,
    readonly?: boolean
}> = ({ steps, onEditStep, onAddStep, onDeleteStep, patient, readonly }) => {

    const getWeightInfo = (step: MedicationStep, index: number) => {
        if (!patient || !patient.initialWeight) return null;
        if (index === 0) return { text: `Peso inicial ${patient.initialWeight}kg`, type: 'initial' };
        if (step.recordedWeight) {
            const diff = step.recordedWeight - patient.initialWeight;
            if (diff === 0) return { text: '-', type: 'maintenance', current: `${step.recordedWeight}kg` };
            return {
                text: `${Math.abs(diff).toFixed(1)}kg`,
                type: diff < 0 ? 'loss' : 'gain',
                current: `${step.recordedWeight}kg`
            };
        }
        return null;
    };

    return (
        <div className="relative pl-24 pt-2">
            <div className="absolute top-4 left-[113px] bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700 -z-0"></div>
            {steps.map((step, index) => {
                const weightInfo = getWeightInfo(step, index);
                const doseNumber = index + 1;
                const isCompleted = step.status === 'Concluído';
                const isCurrent = step.status === 'Atual';
                let dateDisplay = { day: '', month: '', weekday: '' };

                if (step.date) {
                    try {
                        const dateStr = String(step.date);
                        if (dateStr.includes('-')) {
                            const parts = dateStr.split('-');
                            if (parts.length === 3) {
                                const dObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                                dateDisplay.day = String(dObj.getDate()).padStart(2, '0');
                                dateDisplay.month = dObj.toLocaleString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();
                                dateDisplay.weekday = dObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();
                            }
                        } else {
                            const parts = dateStr.split(/[\s/]+/);
                            if (parts.length >= 1) dateDisplay.day = parts[0];
                            if (parts.length >= 2) dateDisplay.month = parts[1].substring(0, 3).toUpperCase();
                        }
                    } catch (e) { }
                }

                return (
                    <div key={index} className={`relative z-10 flex gap-4 mb-10 group ${step.status === 'Bloqueado' ? 'opacity-50 grayscale' : ''}`}>
                        <div className="absolute -left-20 top-1 w-16 text-right pr-2">
                            {(step.status === 'Concluído' || step.status === 'Atual' || step.status === 'Pulada') && step.date && (
                                <div className="flex flex-col items-end">
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-none">{dateDisplay.day}</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mt-0.5">{dateDisplay.month}</span>
                                    <span className="text-[9px] font-medium text-slate-300 dark:text-slate-600 uppercase tracking-wider leading-none mt-0.5">{dateDisplay.weekday}</span>
                                </div>
                            )}
                        </div>
                        <div
                            className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center border-[3px] shadow-sm transition-all duration-300
                                ${isCompleted ? 'bg-emerald-100 border-emerald-500 text-emerald-600' : isCurrent ? 'bg-blue-600 border-blue-200 text-white shadow-blue-500/30 scale-110' : 'bg-slate-50 border-slate-200 text-slate-300'}
                                ${!readonly ? 'cursor-pointer group-hover:scale-110' : 'cursor-default'} bg-white dark:bg-slate-800
                            `}
                            onClick={() => !readonly && onEditStep(step)}
                        >
                            {isCompleted ? <span className="material-symbols-outlined text-lg font-bold">check</span> : isCurrent ? <span className="material-symbols-outlined text-lg animate-pulse">pill</span> : <span className="text-xs font-bold">{doseNumber}</span>}
                        </div>
                        <div className="flex-1 flex flex-col pt-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <h4 className={`text-base font-bold flex items-center gap-2 ${isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                    {doseNumber}ª dose <span className="text-slate-300">•</span> {step.dosage}
                                </h4>
                                {!readonly && (
                                    <div className="flex items-center gap-2">
                                        <button onClick={(e) => { e.stopPropagation(); onDeleteStep(step); }} className="w-8 h-8 rounded-full flex items-center justify-center transition-all bg-slate-50 text-slate-300 hover:bg-rose-100 hover:text-rose-500">
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {weightInfo && (
                                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold ${weightInfo.type === 'loss' ? 'bg-emerald-100 text-emerald-700' :
                                        weightInfo.type === 'gain' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                        {weightInfo.type === 'loss' && <span className="material-symbols-outlined text-[12px]">arrow_downward</span>}
                                        {weightInfo.type === 'gain' && <span className="material-symbols-outlined text-[12px]">arrow_upward</span>}
                                        {weightInfo.current && <span>{weightInfo.current}</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
            {!readonly && (
                <button onClick={onAddStep} className="group flex items-center gap-3 relative z-10 ml-0.5 mt-2 transition-all hover:translate-x-1">
                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400 group-hover:border-blue-400 group-hover:text-blue-500 transition-colors">
                        <span className="material-symbols-outlined text-lg">add</span>
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-blue-500 transition-colors">Adicionar Etapa</span>
                </button>
            )}
        </div>
    );
};

// --- HISTÓRICO ---
const InjectionHistoryTable: React.FC<{
    injections: Injection[],
    onDelete: (id: string, injection: Injection) => void,
    onEdit: (injection: Injection) => void,
    onAddHistorical: () => void,
    onTogglePayment: (injection: Injection) => void,
    highlightedDate?: string | null,
    readonly?: boolean
}> = ({ injections, onDelete, onEdit, onAddHistorical, onTogglePayment, highlightedDate, readonly }) => {
    const [expandedRow, setExpandedRow] = useState<number | null>(null);
    const [isCollapsed, setIsCollapsed] = useState(true);
    const formatCurrency = (value: number) => value ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-';
    // TIMEZONE-SAFE: Parse date string manually to avoid UTC conversion issues
    const formatAestheticDate = (dateStr: string) => {
        try {
            if (!dateStr) return '';

            // Se vier DateTime ISO (2025-12-31T...), pega só a parte da data
            const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;

            // Divide manualmente para evitar conversão de timezone do navegador
            const [year, month, day] = cleanDate.split('-').map(Number);

            if (!year || !month || !day) return dateStr;

            // Cria a data localmente (Mês no JS começa em 0)
            const d = new Date(year, month - 1, day);

            const monthName = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
            return `${day} ${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
        } catch { return dateStr; }
    };

    return (
        <div className="lg:col-span-2 bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
            {/* Header Clicável */}
            <div
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-700 flex flex-wrap justify-between items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors select-none"
            >
                <div className="flex items-center gap-3">
                    <span
                        className="material-symbols-outlined text-slate-400 transition-transform duration-300"
                        style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                    >
                        expand_more
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Histórico de Aplicações</h3>
                    <span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
                        {injections.length}
                    </span>
                </div>
                {!readonly && (
                    <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                        <button onClick={onAddHistorical} className="px-4 py-2 text-xs font-bold text-amber-800 bg-gradient-to-r from-amber-100 to-orange-100 rounded-xl hover:from-amber-200 hover:to-orange-200 border border-amber-200/50 shadow-sm transition-all flex items-center gap-1.5 hover:scale-105 active:scale-95">
                            <span className="material-symbols-outlined text-sm">history</span><span>Adicionar Dose Histórica</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Conteúdo Colapsável com Animação */}
            <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'}`}
            >
                <div className="flex-1 overflow-x-auto">
                    {injections.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">Nenhuma aplicação registrada</div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {injections.map((injection, index) => (
                                <div key={index} className="transition-colors">
                                    <div onClick={() => setExpandedRow(expandedRow === index ? null : index)} className={`px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-all ${highlightedDate === injection.applicationDate ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}>
                                        <div className="grid grid-cols-[1fr,auto,auto,auto] md:grid-cols-[1.5fr,1fr,auto,auto] gap-3 items-center">
                                            <div className="flex items-center gap-2 min-w-0">
                                                {injection.isHistorical && <span className="material-symbols-outlined text-amber-500 text-sm flex-shrink-0" title="Dose histórica">history</span>}
                                                <div className="min-w-0"><div className="text-sm font-medium text-slate-900 dark:text-white truncate">{formatAestheticDate(injection.date)}</div></div>
                                                <button className="ml-auto text-slate-400 transition-transform" style={{ transform: expandedRow === index ? 'rotate(180deg)' : 'rotate(0deg)' }}><span className="material-symbols-outlined text-lg">expand_more</span></button>
                                            </div>
                                            <div className="text-sm font-semibold text-slate-900 dark:text-white text-center">{injection.dosage}</div>
                                            <button onClick={(e) => { if (readonly) return; e.stopPropagation(); onTogglePayment(injection); }} className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ring-1 ring-inset transition-all ${injection.isPaid ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-slate-100 text-slate-500 ring-slate-300'} ${!readonly ? 'hover:bg-opacity-80' : 'cursor-default opacity-80'}`}>
                                                <span className="material-symbols-outlined text-xs">{injection.isPaid ? 'check_circle' : 'radio_button_unchecked'}</span><span className="hidden sm:inline">{injection.isPaid ? 'Pago' : 'Pendente'}</span>
                                            </button>
                                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-bold ring-1 ring-inset ${injection.status === 'Aplicada' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-slate-50 text-slate-700 ring-slate-600/20'}`}>{injection.status}</span>
                                        </div>
                                    </div>
                                    {expandedRow === index && (
                                        <div className="px-4 py-4 bg-gradient-to-br from-slate-50/80 to-slate-100/50 dark:from-slate-800/20 dark:to-slate-900/20 border-t border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2">
                                            <div className="space-y-3">
                                                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                                    <div className="flex items-center gap-2"><span className="material-symbols-outlined text-lg text-slate-500">payments</span><span className="text-xs font-semibold text-slate-600 uppercase">Valor</span></div>
                                                    <span className="text-lg font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(injection.doseValue || 0)}</span>
                                                </div>
                                                {injection.notes && <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200"><p className="text-sm text-slate-700">{injection.notes}</p></div>}
                                                {!readonly && (
                                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                                        <button onClick={(e) => { e.stopPropagation(); onEdit(injection); }} className="px-3 py-2 bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2"><span className="material-symbols-outlined text-sm">edit</span> Editar</button>
                                                        <button onClick={(e) => { e.stopPropagation(); injection.id && onDelete(injection.id, injection); }} className="px-3 py-2 bg-red-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2"><span className="material-symbols-outlined text-sm">delete</span> Excluir</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---
const PatientProfilePage: React.FC<{ patient: Patient, onBack: () => void, onGoHome: () => void, readonly?: boolean, isAdmin?: boolean }> = ({ patient, onBack, onGoHome, readonly = false, isAdmin = false }) => {
    const [realPatient, setRealPatient] = useState<Patient>(patient);
    const [medicationSteps, setMedicationSteps] = useState<MedicationStep[]>([]);
    const [injections, setInjections] = useState<Injection[]>([]);
    const [loading, setLoading] = useState(true);
    const [paidStepIds, setPaidStepIds] = useState<Set<string>>(new Set());
    const [manualWeights, setManualWeights] = useState<any[]>([]);

    // Modais
    const [isAddWeightModalOpen, setIsAddWeightModalOpen] = useState(false);
    const [weightToDelete, setWeightToDelete] = useState<{ id: string, weight: number, date: Date } | null>(null);
    const [isEditStepModalOpen, setIsEditStepModalOpen] = useState(false);
    const [selectedStep, setSelectedStep] = useState<MedicationStep | null>(null);
    const [isEditPatientModalOpen, setIsEditPatientModalOpen] = useState(false);
    const [isHistoricalDoseModalOpen, setIsHistoricalDoseModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedStepForPayment, setSelectedStepForPayment] = useState<MedicationStep | null>(null);
    const [isEditDoseModalOpen, setIsEditDoseModalOpen] = useState(false);
    const [selectedInjectionForEdit, setSelectedInjectionForEdit] = useState<Injection | null>(null);
    const [isDosePaymentModalOpen, setIsDosePaymentModalOpen] = useState(false);
    const [selectedInjectionForPayment, setSelectedInjectionForPayment] = useState<Injection | null>(null);
    const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
    const [injectionToDelete, setInjectionToDelete] = useState<{ id: string; name: string } | null>(null);
    const [stepToDelete, setStepToDelete] = useState<MedicationStep | null>(null);
    const [isJourneyCollapsed, setIsJourneyCollapsed] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [highlightedDate, setHighlightedDate] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: patientData } = await supabase.from('patients').select('*').eq('id', patient.id).single();
            if (patientData) {
                setRealPatient({
                    id: patientData.id,
                    name: patientData.name,
                    initials: patientData.initials,
                    age: patientData.age,
                    gender: patientData.gender,
                    avatarUrl: patientData.avatar_url,
                    currentWeight: patientData.current_weight,
                    initialWeight: patientData.initial_weight,
                    weightChange: patientData.weight_change,
                    bmi: patientData.bmi,
                    bmiCategory: patientData.bmi_category,
                    targetWeight: patientData.target_weight,
                    height: patientData.height,
                    // Additional fields for edit modal
                    dateOfBirth: patientData.date_of_birth,
                    tags: patientData.tags,
                    comorbidities: patientData.comorbidities,
                    clinicalNotes: patientData.clinical_notes
                } as any);
            }
            const { data: stepsData } = await supabase.from('medication_steps').select('*').eq('patient_id', patient.id).order('order_index', { ascending: true });
            setMedicationSteps(stepsData || []);
            const { data: injectionsData } = await supabase.from('injections').select('*').eq('patient_id', patient.id).order('created_at', { ascending: false });
            const formattedInjections = (injectionsData || []).map(inj => {
                const dateStr = (typeof inj.applied_at === 'string' ? inj.applied_at.split('T')[0] : '') || '';
                // Extract day number from date string (YYYY-MM-DD)
                const dayNumber = dateStr ? dateStr.split('-')[2] : '';
                return {
                    id: inj.id,
                    date: dateStr,
                    day: dayNumber, // Added missing 'day' property
                    dosage: inj.dosage,
                    notes: inj.notes,
                    status: inj.status === 'Applied' ? 'Aplicada' : 'Pulada',
                    doseValue: inj.dose_value || 0,
                    applicationDate: dateStr,
                    isPaid: inj.is_paid || false,
                    patient_id: inj.patient_id,
                    patientWeightAtInjection: inj.patient_weight_at_injection,
                    medicationId: inj.medication_id,
                    isHistorical: inj.is_historical
                } as Injection;
            });
            setInjections(formattedInjections);
            const { data: weightData } = await supabase.from('weight_measurements').select('*').eq('patient_id', patient.id).order('date', { ascending: true });
            setManualWeights(weightData || []);
            const newPaidIds = new Set<string>();
            formattedInjections.forEach(inj => { if (inj.isPaid && inj.id) newPaidIds.add(inj.id); });
            setPaidStepIds(newPaidIds);
            setLoading(false);
        } catch (err) { setLoading(false); }
    }, [patient.id]);

    useEffect(() => { fetchData(); const h = () => fetchData(); window.addEventListener('global-dose-added', h); return () => window.removeEventListener('global-dose-added', h); }, [fetchData]);

    const weightHistory: WeightDataPoint[] = useMemo(() => {
        const rawPoints: WeightDataPoint[] = [];
        injections.forEach(inj => { if (inj.patientWeightAtInjection) rawPoints.push({ date: parseSafeDate(inj.applicationDate), weight: inj.patientWeightAtInjection, source: 'injection', label: inj.date }); });
        manualWeights.forEach(mw => { rawPoints.push({ id: mw.id, date: parseSafeDate(mw.date), weight: mw.weight, source: 'manual', label: mw.date }); });
        return rawPoints.sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [injections, manualWeights]);

    const journeySteps: MedicationStep[] = useMemo(() => {
        const past = injections.map(inj => ({ id: inj.id, dosage: inj.dosage, status: 'Concluído' as const, date: inj.date, recordedWeight: inj.patientWeightAtInjection, _sortDate: inj.applicationDate }));
        const future = medicationSteps.filter(s => s.status !== 'Concluído').map(s => ({ ...s, _sortDate: s.date || '9999-12-31' }));
        return [...past, ...future].sort((a, b) => (a._sortDate || '').localeCompare(b._sortDate || '')).map(({ _sortDate, ...step }) => step as MedicationStep);
    }, [injections, medicationSteps]);

    const isSuperResponder = useMemo(() => {
        if (!weightHistory.length) return false;
        const latest = weightHistory[weightHistory.length - 1];
        const initial = realPatient.initialWeight || latest.weight;
        const days = (latest.date.getTime() - weightHistory[0].date.getTime()) / (1000 * 60 * 60 * 24);
        return (days / 7 >= 4) && (latest.weight < initial * 0.90);
    }, [weightHistory, realPatient]);

    // Handlers
    const handleEditStep = (step: MedicationStep) => { if (readonly) return; setSelectedStep(step); setIsEditStepModalOpen(true); };
    const handleDeleteStep = (step: MedicationStep) => { if (readonly) return; setStepToDelete(step); setIsConfirmDeleteModalOpen(true); };
    const handleAddStep = () => { setSelectedStep(null); setIsEditStepModalOpen(true); };
    const handleEditInjection = (injection: Injection) => { setSelectedInjectionForEdit(injection); setIsEditDoseModalOpen(true); };
    const handlePaymentClick = (step: MedicationStep) => { if (step.status === 'Concluído' && step.id && injections.some(i => i.id === step.id)) return; setSelectedStepForPayment(step); setIsPaymentModalOpen(true); };
    const confirmDeleteStep = async () => { if (!stepToDelete || !stepToDelete.id) return; if (stepToDelete.status === 'Concluído') await supabase.from('injections').delete().eq('id', stepToDelete.id); else await supabase.from('medication_steps').delete().eq('id', stepToDelete.id); setIsConfirmDeleteModalOpen(false); fetchData(); setStepToDelete(null); };
    const confirmDelete = async () => { if (!injectionToDelete) return; await supabase.from('injections').delete().eq('id', injectionToDelete.id); setIsConfirmDeleteModalOpen(false); setInjectionToDelete(null); fetchData(); };

    // --- FUNÇÃO SEGURA DE CALLBACK (Resolve Tela Branca) ---
    const handleWeightSuccess = () => {
        setIsAddWeightModalOpen(false); // Fecha primeiro
        setTimeout(() => {
            fetchData(); // Atualiza depois
        }, 50);
    };

    if (loading && medicationSteps.length === 0) return <div className="p-20 text-center text-slate-500">Carregando perfil...</div>;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20 md:pb-0 relative">
            {!readonly && (
                <div className="max-w-6xl mx-auto flex items-center gap-2 text-sm text-slate-500 pt-8 px-4">
                    <a href="#" onClick={(e) => { e.preventDefault(); onGoHome(); }} className="hover:underline opacity-60">Home</a>
                    <span className="material-symbols-outlined text-base opacity-60">chevron_right</span>
                    <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }} className="hover:underline">Pacientes</a>
                    <span className="material-symbols-outlined text-base">chevron_right</span>
                    <span className="font-medium text-slate-900 dark:text-white">{realPatient.name}</span>
                </div>
            )}

            <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
                {/* Banner */}
                <section className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 rounded-xl shadow-sm border border-blue-100 dark:border-slate-700 p-4 md:p-6 mb-4 md:mb-6">
                    {/* Top row: Avatar + Name + Actions */}
                    <div className="flex items-start gap-3 md:gap-4">
                        {/* Avatar */}
                        <div className="relative w-14 h-14 md:w-20 md:h-20 flex-shrink-0">
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xl md:text-2xl font-bold shadow-lg">
                                {realPatient.name.charAt(0)}
                            </div>
                        </div>

                        {/* Name + Info */}
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white truncate pr-2">
                                {realPatient.name}
                            </h2>
                            <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm text-slate-600 dark:text-slate-300 mt-1">
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-base">cake</span>
                                    {realPatient.age} anos
                                </span>
                                <span className="hidden sm:inline">•</span>
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-base">
                                        {realPatient.gender === 'Female' ? 'female' : 'male'}
                                    </span>
                                    {realPatient.gender === 'Female' ? 'Feminino' : 'Masculino'}
                                </span>
                            </div>

                            {/* Badges - Below name on mobile, inline on desktop */}
                            <div className="flex flex-wrap items-center gap-2 mt-3 md:mt-2">
                                {isSuperResponder && (
                                    <div className="bg-gradient-to-r from-amber-300 to-orange-400 text-amber-900 border border-amber-200 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-1.5 animate-in fade-in zoom-in duration-500">
                                        <span className="material-symbols-outlined text-sm font-bold">bolt</span>
                                        <span>Super Responder</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Edit Button - Always visible on the right */}
                        {isAdmin && !readonly && (
                            <button
                                onClick={() => setIsEditPatientModalOpen(true)}
                                className="flex-shrink-0 p-2 md:p-2.5 rounded-full bg-white/80 dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 dark:hover:bg-blue-900/30 transition-all shadow-sm"
                                title="Editar paciente"
                            >
                                <span className="material-symbols-outlined text-lg md:text-xl">edit</span>
                            </button>
                        )}
                    </div>
                </section>

                {/* Cards de Métricas */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
                    <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-3xl shadow-lg shadow-blue-500/20 group transition-all hover:scale-[1.02]">
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <span className="text-blue-100 text-xs font-extrabold uppercase tracking-widest mb-1">Peso Atual</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl md:text-5xl font-black text-white tracking-tighter filter drop-shadow-sm">{realPatient.currentWeight}</span>
                                <span className="text-sm md:text-base font-bold text-blue-100/80">kg</span>
                            </div>
                        </div>
                        <div className="absolute -right-6 -bottom-6 text-white/10 group-hover:text-white/20 transition-all group-hover:scale-110 group-hover:rotate-6">
                            <span className="material-symbols-outlined text-[100px] leading-none">monitor_weight</span>
                        </div>
                    </div>
                    <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 p-5 rounded-3xl shadow-lg shadow-purple-500/20 group transition-all hover:scale-[1.02]">
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <span className="text-indigo-100 text-xs font-extrabold uppercase tracking-widest mb-1">Meta</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl md:text-5xl font-black text-white tracking-tighter filter drop-shadow-sm">{realPatient.targetWeight || '--'}</span>
                                {realPatient.targetWeight && <span className="text-sm md:text-base font-bold text-indigo-100/80">kg</span>}
                            </div>
                        </div>
                        <div className="absolute -right-6 -bottom-6 text-white/10 group-hover:text-white/20 transition-all group-hover:scale-110 group-hover:rotate-6">
                            <span className="material-symbols-outlined text-[100px] leading-none">flag</span>
                        </div>
                    </div>
                    <div className="relative overflow-hidden bg-gradient-to-br from-teal-500 to-emerald-600 p-5 rounded-3xl shadow-lg shadow-teal-500/20 group transition-all hover:scale-[1.02]">
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="flex justify-between items-start">
                                <span className="text-teal-100 text-xs font-extrabold uppercase tracking-widest mb-1">IMC</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${(() => {
                                    const h = realPatient.height ? (realPatient.height > 3 ? realPatient.height / 100 : realPatient.height) : 0;
                                    const w = realPatient.currentWeight || 0;
                                    if (!h || !w) return 'bg-white/20 text-white';
                                    const bmi = w / (h * h);
                                    if (bmi < 25) return 'bg-white text-emerald-600';
                                    if (bmi < 30) return 'bg-white text-amber-600';
                                    return 'bg-white text-rose-600';
                                })()
                                    }`}>
                                    {(() => {
                                        const h = realPatient.height ? (realPatient.height > 3 ? realPatient.height / 100 : realPatient.height) : 0;
                                        const w = realPatient.currentWeight || 0;
                                        if (!h || !w) return 'N/A';
                                        const bmi = w / (h * h);
                                        if (bmi < 18.5) return 'Abaixo';
                                        if (bmi < 24.9) return 'Normal';
                                        if (bmi < 29.9) return 'Sobrepeso';
                                        if (bmi < 34.9) return 'Obesidade I';
                                        return 'Obesidade II+';
                                    })()}
                                </span>
                            </div>
                            <div className="flex items-baseline gap-1 mt-1">
                                <span className="text-3xl md:text-5xl font-black text-white tracking-tighter filter drop-shadow-sm">
                                    {(realPatient.currentWeight && realPatient.height)
                                        ? (realPatient.currentWeight / Math.pow((realPatient.height > 3 ? realPatient.height / 100 : realPatient.height), 2)).toFixed(1)
                                        : '--'}
                                </span>
                            </div>
                        </div>
                        <div className="absolute -right-6 -bottom-6 text-white/10 group-hover:text-white/20 transition-all group-hover:scale-110 group-hover:rotate-6">
                            <span className="material-symbols-outlined text-[100px] leading-none">health_and_safety</span>
                        </div>
                    </div>
                    <div className={`relative overflow-hidden p-5 rounded-3xl shadow-lg transition-all hover:scale-[1.02] group ${(realPatient.currentWeight - (realPatient.initialWeight || realPatient.currentWeight)) <= 0 ? 'bg-gradient-to-br from-gray-800 to-gray-900 shadow-gray-500/20' : 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/20'}`}>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="flex flex-col">
                                <span className="text-white/70 text-xs font-extrabold uppercase tracking-widest mb-1">Perda Total</span>
                                <div className="flex items-baseline gap-1">
                                    <span className={`text-3xl md:text-5xl font-black tracking-tighter filter drop-shadow-sm ${(realPatient.currentWeight - (realPatient.initialWeight || realPatient.currentWeight)) <= 0 ? 'text-emerald-400' : 'text-white'}`}>
                                        {(realPatient.currentWeight - (realPatient.initialWeight || realPatient.currentWeight)).toFixed(1)}
                                    </span>
                                    <span className="text-sm md:text-base font-bold text-white/60">kg</span>
                                </div>
                            </div>
                        </div>
                        <div className="absolute -right-6 -bottom-6 text-white/10 group-hover:text-white/15 transition-all group-hover:scale-110 group-hover:rotate-6">
                            <span className="material-symbols-outlined text-[100px] leading-none">trending_down</span>
                        </div>
                    </div>
                </div>

                <div className="mb-8 group relative">
                    <WeightEvolutionChart
                        patient={realPatient}
                        weightHistory={weightHistory}
                        onDeleteWeight={(point) => {
                            if (point.id) {
                                setWeightToDelete({ id: point.id, weight: point.weight, date: point.date });
                            }
                        }}
                        action={
                            <div className="flex items-center gap-2">
                                {!readonly && (
                                    <button onClick={() => setIsHistoricalDoseModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 shadow-sm rounded-xl text-xs md:text-sm font-extrabold hover:border-blue-300 hover:text-blue-600 hover:shadow-md transition-all hover:scale-105 active:scale-95">
                                        <span className="material-symbols-outlined text-lg">vaccines</span>
                                        Registrar Dose
                                    </button>
                                )}
                                <button onClick={() => setIsAddWeightModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30 border-none rounded-xl text-xs md:text-sm font-extrabold text-white hover:from-blue-700 hover:to-indigo-700 transition-all hover:scale-105 active:scale-95 hover:shadow-xl">
                                    <span className="material-symbols-outlined text-lg">add_circle</span>
                                    Registrar Peso
                                </button>
                            </div>
                        }
                    />
                </div>

                <PatientFinancials patient={realPatient} injections={injections} onUpdate={fetchData} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Jornada do Paciente - Collapsible */}
                    <div className="lg:col-span-1 bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                        {/* Header Clicável */}
                        <div
                            onClick={() => setIsJourneyCollapsed(!isJourneyCollapsed)}
                            className="p-6 flex justify-between items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors select-none border-b border-slate-100 dark:border-slate-700"
                        >
                            <div className="flex items-center gap-3">
                                <span
                                    className="material-symbols-outlined text-slate-400 transition-transform duration-300"
                                    style={{ transform: isJourneyCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                                >
                                    expand_more
                                </span>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Jornada do Paciente</h3>
                                <span className="text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                                    {journeySteps.length}
                                </span>
                            </div>
                        </div>

                        {/* Conteúdo Colapsável */}
                        <div
                            className={`transition-all duration-300 ease-in-out overflow-hidden ${isJourneyCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'}`}
                        >
                            <div className="p-6 pt-4 overflow-y-auto flex-1">
                                <MedicationPath steps={journeySteps} onEditStep={handleEditStep} onAddStep={handleAddStep} onPaymentClick={handlePaymentClick} onDeleteStep={handleDeleteStep} paidStepIds={paidStepIds} patient={realPatient} readonly={readonly} />
                            </div>
                        </div>
                    </div>
                    <InjectionHistoryTable injections={injections} onDelete={(id, inj) => { setInjectionToDelete({ id, name: `${inj.dosage} - ${inj.date}` }); setIsConfirmDeleteModalOpen(true); }} onEdit={handleEditInjection} onAddHistorical={() => setIsHistoricalDoseModalOpen(true)} onTogglePayment={async (inj) => { if (inj.id) { await supabase.from('injections').update({ is_paid: !inj.isPaid }).eq('id', inj.id); fetchData(); } }} highlightedDate={highlightedDate} readonly={readonly} />
                </div>
            </main>

            {/* MODAIS GLOBAIS - AQUI ESTÁ A CORREÇÃO DE CONEXÃO DO SUCCESS */}
            {isAddWeightModalOpen && (
                <AddWeightModal
                    isOpen={isAddWeightModalOpen}
                    onClose={() => setIsAddWeightModalOpen(false)}
                    onSuccess={handleWeightSuccess} // Conectado corretamente
                    patientId={patient.id}
                    currentWeight={realPatient.currentWeight}
                />
            )}

            {!readonly && (
                <>
                    {isEditStepModalOpen && <EditMedicationStepModal isOpen={isEditStepModalOpen} onClose={() => setIsEditStepModalOpen(false)} onSuccess={fetchData} patientId={patient.id} stepToEdit={selectedStep} nextOrderIndex={medicationSteps.length} />}
                    {isHistoricalDoseModalOpen && <GlobalRegisterDoseModal isOpen={isHistoricalDoseModalOpen} onClose={() => setIsHistoricalDoseModalOpen(false)} onSuccess={() => fetchData()} initialPatient={realPatient} />}
                    {isPaymentModalOpen && selectedStepForPayment && <PaymentModal isOpen={isPaymentModalOpen} onClose={() => { setIsPaymentModalOpen(false); setSelectedStepForPayment(null); }} onSuccess={fetchData} step={selectedStepForPayment} patientId={patient.id} patientName={realPatient.name} />}
                    {isEditDoseModalOpen && selectedInjectionForEdit && <GlobalRegisterDoseModal isOpen={isEditDoseModalOpen} onClose={() => { setIsEditDoseModalOpen(false); setSelectedInjectionForEdit(null); }} onSuccess={fetchData} editMode={true} editingInjection={selectedInjectionForEdit} />}
                    {isDosePaymentModalOpen && selectedInjectionForPayment && <DosePaymentModal isOpen={isDosePaymentModalOpen} onClose={() => { setIsDosePaymentModalOpen(false); setSelectedInjectionForPayment(null); }} onSuccess={fetchData} injection={selectedInjectionForPayment} patientName={realPatient.name} />}
                    {isEditPatientModalOpen && <AddPatientModal
                        isOpen={isEditPatientModalOpen}
                        onClose={() => setIsEditPatientModalOpen(false)}
                        onSuccess={fetchData}
                        patientToEdit={{
                            id: realPatient.id,
                            name: realPatient.name,
                            age: realPatient.age,
                            gender: realPatient.gender,
                            date_of_birth: (realPatient as any).dateOfBirth || (realPatient as any).date_of_birth,
                            current_weight: realPatient.currentWeight,
                            initial_weight: realPatient.initialWeight,
                            target_weight: realPatient.targetWeight,
                            height: realPatient.height,
                            tags: (realPatient as any).tags,
                            comorbidities: (realPatient as any).comorbidities,
                            clinical_notes: (realPatient as any).clinicalNotes || (realPatient as any).clinical_notes
                        }}
                    />}

                    <ConfirmDeleteModal isOpen={isConfirmDeleteModalOpen} onClose={() => { setIsConfirmDeleteModalOpen(false); setInjectionToDelete(null); setStepToDelete(null); }} onConfirm={stepToDelete ? confirmDeleteStep : confirmDelete} itemName={stepToDelete ? `Dose ${stepToDelete.dosage}` : (injectionToDelete?.name || '')} loading={isDeleting} />
                </>
            )}

            {/* Modal de Exclusão de Peso MOVIDO PARA A RAIZ PARA GARANTIR QUE ABRA */}
            {weightToDelete && (
                <ConfirmDeleteModal
                    isOpen={!!weightToDelete}
                    onClose={() => setWeightToDelete(null)}
                    title="Excluir Peso"
                    message={`Tem certeza que deseja excluir o registro de ${weightToDelete.weight}kg de ${weightToDelete.date.toLocaleDateString('pt-BR')}?`}
                    itemName={`${weightToDelete.weight}kg`}
                    onConfirm={async () => {
                        if (!weightToDelete) return;
                        try {
                            const { error } = await supabase.from('weight_measurements').delete().eq('id', weightToDelete.id);
                            if (error) throw error;
                            await supabase.from('patients').update({ current_weight: (realPatient.initialWeight || 0) }).eq('id', patient.id);
                            fetchData();
                            setWeightToDelete(null);
                        } catch (e: any) {
                            console.error(e);
                            alert("Erro ao excluir: " + (e.message || "Verifique permissões."));
                        }
                    }}
                />
            )}
        </div>
    );
};

export default PatientProfilePage;