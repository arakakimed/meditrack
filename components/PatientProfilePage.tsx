import React, { useState, useEffect, useCallback, useMemo } from 'react';
import WeightEvolutionChart from './WeightEvolutionChart';
import { Patient, MedicationStep, Injection } from '../types';
import { supabase } from '../lib/supabase';
import EditMedicationStepModal from './EditMedicationStepModal';
import AddPatientModal from './AddPatientModal';
import AddHistoricalDoseModal from './AddHistoricalDoseModal';
import PaymentModal from './PaymentModal';
import EditDoseModal from './EditDoseModal';
import GlobalRegisterDoseModal from './GlobalRegisterDoseModal';
import DosePaymentModal from './DosePaymentModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import MiniCalendar from './MiniCalendar';
import { PatientFinancials } from './PatientFinancials';




const MedicationPath: React.FC<{
    steps: MedicationStep[],
    onEditStep: (step: MedicationStep) => void,
    onAddStep: () => void,
    onPaymentClick: (step: MedicationStep) => void,
    onDeleteStep: (step: MedicationStep) => void,
    paidStepIds: Set<string>,
    patient: Patient
}> = ({ steps, onEditStep, onAddStep, onPaymentClick, onDeleteStep, paidStepIds, patient }) => {

    // Helper to calculate weight change text
    const getWeightInfo = (step: MedicationStep, index: number) => {
        // Validation
        if (!patient.initialWeight) return null;

        // 1st Dose: "Peso inicial X kg"
        if (index === 0) {
            return {
                text: `Peso inicial ${patient.initialWeight}kg`,
                type: 'initial'
            };
        }

        // Use recorded weight if available (Historical Data)
        if (step.recordedWeight) {
            const diff = step.recordedWeight - patient.initialWeight;
            if (diff === 0) return { text: '-', type: 'maintenance', current: `${step.recordedWeight}kg` };

            return {
                text: `${Math.abs(diff).toFixed(1)}kg`,
                type: diff < 0 ? 'loss' : 'gain',
                current: `${step.recordedWeight}kg`
            };
        }

        // For steps without recorded weight (e.g. old data), but are marked as Done
        if (step.status === 'Concluído' && !step.recordedWeight) {
            return null; // Don't show misleading info, or show "Peso ñ reg."
            // return { text: 'Não reg.', type: 'maintenance', current: '--' }; 
        }

        return null;

        return null;
    };


    return (
        <div className="relative pl-24 pt-2">
            {/* Continuous Line - Adjusted for new padding */}
            {/* pl-24 is 96px. Circle is 36px wide (w-9). Center is 18px. line should be at 96 + 18 - 1 (width/2) = 113px? */}
            {/* Let's try 96px + 18px = 114px left? */}
            {/* Actually, visually tuning: left-[113px] */}
            <div className="absolute top-4 left-[113px] bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700 -z-0"></div>

            {steps.map((step, index) => {
                const isPaid = step.id ? paidStepIds.has(step.id) : false;
                const weightInfo = getWeightInfo(step, index);
                const doseNumber = index + 1;

                // Status Colors
                const isCompleted = step.status === 'Concluído';
                const isCurrent = step.status === 'Atual';

                // Date Formatting
                let dateDay = '';
                let dateMonth = '';
                let dateWeekday = '';

                if (step.date) {
                    const parts = step.date.split(' de '); // "26 de dez."
                    if (parts.length >= 2) {
                        dateDay = parts[0];
                        dateMonth = parts[1].replace('.', '').toUpperCase();

                        // Parse date for weekday
                        // Needs year. Assume current year or infer?
                        // If date is "26 de dez.", let's assume current year or nearby.
                        // Journey steps usually are recent.
                        const currentYear = new Date().getFullYear();
                        const monthMap: { [key: string]: number } = {
                            'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3, 'mai': 4, 'jun': 5,
                            'jul': 6, 'ago': 7, 'set': 8, 'out': 9, 'nov': 10, 'dez': 11
                        };
                        const monthIndex = monthMap[dateMonth.toLowerCase()];
                        if (monthIndex !== undefined) {
                            const d = new Date(currentYear, monthIndex, parseInt(dateDay));
                            dateWeekday = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();
                        }

                    } else if (step.date.includes('/')) {
                        const d = step.date.split('/');
                        const dateObj = new Date(parseInt(d[2]), parseInt(d[1]) - 1, parseInt(d[0]));
                        dateDay = d[0];
                        dateMonth = dateObj.toLocaleString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();
                        dateWeekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();
                    }
                }

                return (
                    <div key={index} className={`relative z-10 flex gap-4 mb-10 group ${step.status === 'Bloqueado' ? 'opacity-50 grayscale' : ''}`}>

                        {/* Date Label (Left Side) */}
                        <div className="absolute -left-20 top-1 w-16 text-right pr-2">
                            {step.date && isCompleted && (
                                <div className="flex flex-col items-end">
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-none">{dateDay}</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mt-0.5">{dateMonth}</span>
                                    <span className="text-[9px] font-medium text-slate-300 dark:text-slate-600 uppercase tracking-wider leading-none mt-0.5">{dateWeekday}</span>
                                </div>
                            )}
                        </div>

                        {/* Status Circle */}
                        <div
                            className={`
                                flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center border-[3px] shadow-sm transition-all duration-300
                                ${isCompleted
                                    ? 'bg-emerald-100 border-emerald-500 text-emerald-600'
                                    : isCurrent
                                        ? 'bg-blue-600 border-blue-200 text-white shadow-blue-500/30 scale-110'
                                        : 'bg-slate-50 border-slate-200 text-slate-300'
                                }
                                group-hover:scale-110 cursor-pointer bg-white dark:bg-slate-800
                            `}
                            onClick={() => onEditStep(step)}
                        >
                            {isCompleted ? (
                                <span className="material-symbols-outlined text-lg font-bold">check</span>
                            ) : isCurrent ? (
                                <span className="material-symbols-outlined text-lg animate-pulse">pill</span>
                            ) : (
                                <span className="text-xs font-bold">{doseNumber}</span>
                            )}
                        </div>

                        {/* Content Card */}
                        <div className="flex-1 flex flex-col pt-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <h4 className={`text-base font-bold flex items-center gap-2 ${isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                    {doseNumber}ª dose <span className="text-slate-300">•</span> {step.dosage}
                                </h4>

                                <div className="flex items-center gap-2">


                                    {/* Delete Icon */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDeleteStep(step); }}
                                        className="w-8 h-8 rounded-full flex items-center justify-center transition-all bg-slate-50 text-slate-300 hover:bg-rose-100 hover:text-rose-500"
                                        title="Excluir Etapa"
                                    >
                                        <span className="material-symbols-outlined text-lg">delete</span>
                                    </button>
                                </div>
                            </div>

                            {/* Weight Info Row */}
                            <div className="flex items-center gap-2">
                                {weightInfo && (
                                    <>
                                        {weightInfo.type === 'initial' && (
                                            <div className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                                                {weightInfo.text}
                                            </div>
                                        )}
                                        {weightInfo.type === 'loss' && (
                                            <div className="flex items-center gap-1.5 animate-in slide-in-from-left-2 duration-300">
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{weightInfo.current}</span>
                                                <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded text-[10px] font-bold">
                                                    <span className="material-symbols-outlined text-[10px]">arrow_downward</span>
                                                    {weightInfo.text}
                                                </div>
                                            </div>
                                        )}
                                        {weightInfo.type === 'gain' && (
                                            <div className="flex items-center gap-1.5 animate-in slide-in-from-left-2 duration-300">
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{weightInfo.current}</span>
                                                <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded text-[10px] font-bold">
                                                    <span className="material-symbols-outlined text-[10px]">arrow_upward</span>
                                                    {weightInfo.text}
                                                </div>
                                            </div>
                                        )}
                                        {weightInfo.type === 'maintenance' && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{weightInfo.current}</span>
                                                <div className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-[10px] font-bold">
                                                    -
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Current Progress Bar */}
                            {isCurrent && step.progress && (
                                <div className="mt-3">
                                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                            style={{ width: `${step.progress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* Add Step Button */}
            <button
                onClick={onAddStep}
                className="group flex items-center gap-3 relative z-10 ml-0.5 mt-2 transition-all hover:translate-x-1"
            >
                <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400 group-hover:border-blue-400 group-hover:text-blue-500 transition-colors">
                    <span className="material-symbols-outlined text-lg">add</span>
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-blue-500 transition-colors">
                    Adicionar Etapa
                </span>
            </button>
        </div>
    );
};

const InjectionHistoryTable: React.FC<{
    injections: Injection[],
    onDelete: (id: string, injection: Injection) => void,
    onEdit: (injection: Injection) => void,
    onAddHistorical: () => void,
    onTogglePayment: (injection: Injection) => void,
    highlightedDate?: string | null
}> = ({ injections, onDelete, onEdit, onAddHistorical, onTogglePayment, highlightedDate }) => {
    const [expandedRow, setExpandedRow] = React.useState<number | null>(null);

    const formatCurrency = (value: number) => {
        if (!value) return '-';
        return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatAestheticDate = (dateStr: string) => {
        // Convert "12 Fev, 2024" to "12 Fev 2024" - Clean and aesthetic
        const months: any = {
            'jan': 'Jan', 'fev': 'Fev', 'mar': 'Mar', 'abr': 'Abr',
            'mai': 'Mai', 'jun': 'Jun', 'jul': 'Jul', 'ago': 'Ago',
            'set': 'Set', 'out': 'Out', 'nov': 'Nov', 'dez': 'Dez'
        };

        const parts = dateStr.split(' ');
        if (parts.length >= 3) {
            const day = parts[0];
            const monthKey = parts[1].toLowerCase().replace(',', '');
            const month = months[monthKey] || parts[1];
            const year = parts[2];

            return `${day} ${month} ${year}`;
        }
        return dateStr;
    };

    const toggleRow = (index: number) => {
        setExpandedRow(expandedRow === index ? null : index);
    };

    return (
        <div className="lg:col-span-2 bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
            <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Histórico de Aplicações</h3>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button
                        onClick={onAddHistorical}
                        className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 border border-amber-200 transition-colors flex items-center justify-center gap-1"
                    >
                        <span className="material-symbols-outlined text-sm">history</span>
                        <span className="hidden sm:inline">Adicionar Dose Histórica</span>
                        <span className="sm:hidden">Nova Dose</span>
                    </button>
                    <button className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors hidden sm:flex items-center gap-1">
                        Exportar CSV
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto">
                {injections.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        Nenhuma aplicação registrada
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {injections.map((injection, index) => (
                            <div key={index} className="transition-colors">
                                {/* Compact Row - Always Visible */}
                                <div
                                    onClick={() => toggleRow(index)}
                                    className={`px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-all ${highlightedDate === injection.applicationDate
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                                        : ''
                                        }`}
                                >
                                    <div className="grid grid-cols-[1fr,auto,auto,auto] md:grid-cols-[1.5fr,1fr,auto,auto] gap-3 items-center">
                                        {/* Date */}
                                        <div className="flex items-center gap-2 min-w-0">
                                            {injection.isHistorical && (
                                                <span className="material-symbols-outlined text-amber-500 text-sm flex-shrink-0" title="Dose histórica">history</span>
                                            )}
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                                    {formatAestheticDate(injection.date)}
                                                </div>
                                            </div>
                                            <button
                                                className="ml-auto text-slate-400 transition-transform"
                                                style={{ transform: expandedRow === index ? 'rotate(180deg)' : 'rotate(0deg)' }}
                                            >
                                                <span className="material-symbols-outlined text-lg">expand_more</span>
                                            </button>
                                        </div>

                                        {/* Dosagem */}
                                        <div className="text-sm font-semibold text-slate-900 dark:text-white text-center">
                                            {injection.dosage}
                                        </div>

                                        {/* Payment Badge */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onTogglePayment(injection);
                                            }}
                                            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ring-1 ring-inset transition-all ${injection.isPaid
                                                ? 'bg-green-50 text-green-700 ring-green-600/20 hover:bg-green-100'
                                                : 'bg-slate-100 text-slate-500 ring-slate-300 hover:bg-slate-200'
                                                }`}
                                        >
                                            <span className="material-symbols-outlined text-xs">
                                                {injection.isPaid ? 'check_circle' : 'radio_button_unchecked'}
                                            </span>
                                            <span className="hidden sm:inline">{injection.isPaid ? 'Pago' : 'Pendente'}</span>
                                        </button>

                                        {/* Status Badge */}
                                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-bold ring-1 ring-inset ${injection.status === 'Aplicada' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-slate-50 text-slate-700 ring-slate-600/20'}`}>
                                            {injection.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedRow === index && (
                                    <div className="px-4 py-4 bg-gradient-to-br from-slate-50/80 to-slate-100/50 dark:from-slate-800/20 dark:to-slate-900/20 border-t border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2 duration-200">
                                        <div className="space-y-3">
                                            {/* Dosage Card */}
                                            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-blue-500 text-lg">medication</span>
                                                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Dosagem</span>
                                                    </div>
                                                    <span className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-lg font-bold text-blue-600 dark:text-blue-400">
                                                        {injection.dosage}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Financial Card */}
                                            <div className={`p-3 rounded-lg border ${injection.isPaid ? 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/10 border-emerald-200 dark:border-emerald-700' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`material-symbols-outlined text-lg ${injection.isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                                                            {injection.isPaid ? 'check_circle' : 'payments'}
                                                        </span>
                                                        <div>
                                                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide block">Valor</span>
                                                            {injection.isPaid && (
                                                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Pagamento confirmado</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className={`text-lg font-mono font-bold ${injection.isPaid ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-900 dark:text-white'}`}>
                                                        {formatCurrency(injection.doseValue || 0)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Notes Card */}
                                            {injection.notes && (
                                                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                                    <div className="flex items-start gap-2 mb-2">
                                                        <span className="material-symbols-outlined text-amber-500 text-sm mt-0.5">sticky_note_2</span>
                                                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Observações</span>
                                                    </div>
                                                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed pl-6">
                                                        {injection.notes}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Action Buttons */}
                                            <div className="grid grid-cols-2 gap-2 pt-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onEdit(injection);
                                                    }}
                                                    className="px-3 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all flex items-center justify-center gap-2 font-semibold text-sm shadow-sm hover:shadow active:scale-95"
                                                >
                                                    <span className="material-symbols-outlined text-base">edit</span>
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        injection.id && onDelete(injection.id, injection);
                                                    }}
                                                    className="px-3 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all flex items-center justify-center gap-2 font-semibold text-sm shadow-sm hover:shadow active:scale-95"
                                                >
                                                    <span className="material-symbols-outlined text-base">delete</span>
                                                    Excluir
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};



interface PatientProfilePageProps {
    patient: Patient;
    onBack: () => void;
    onGoHome: () => void;
}

const PatientProfilePage: React.FC<PatientProfilePageProps> = ({ patient, onBack, onGoHome }) => {
    const [realPatient, setRealPatient] = useState<Patient>(patient);
    const [medicationSteps, setMedicationSteps] = useState<MedicationStep[]>([]);
    const [injections, setInjections] = useState<Injection[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalPaid, setTotalPaid] = useState(0);
    const [paidStepIds, setPaidStepIds] = useState<Set<string>>(new Set());

    // Modals state
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
    const [isDeleting, setIsDeleting] = useState(false);
    const [highlightedDate, setHighlightedDate] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch Patient Details (to ensure they are fresh)
            const { data: patientData } = await supabase
                .from('patients')
                .select('*')
                .eq('id', patient.id)
                .single();

            if (patientData) {
                setRealPatient({
                    id: patientData.id,
                    name: patientData.name,
                    initials: patientData.initials,
                    age: patientData.age,
                    gender: patientData.gender,
                    avatarUrl: patientData.avatar_url,
                    currentWeight: patientData.current_weight,
                    initialWeight: patientData.initial_weight || patientData.current_weight,
                    weightChange: patientData.weight_change || 0,
                    bmi: patientData.bmi,
                    bmiCategory: patientData.bmi_category,
                    targetWeight: patientData.target_weight,
                });
            }

            // 2. Fetch Medication Steps
            const { data: stepsData } = await supabase
                .from('medication_steps')
                .select('*')
                .eq('patient_id', patient.id)
                .order('order_index', { ascending: true });

            setMedicationSteps(stepsData || []);

            // 3. Fetch Injections
            const { data: injectionsData } = await supabase
                .from('injections')
                .select('*')
                .eq('patient_id', patient.id)
                .order('created_at', { ascending: false });

            const formattedInjections = (injectionsData || []).map(inj => {
                const dateSource = inj.applied_at || inj.created_at;
                let date: Date;

                // Fix (Robust): Always interpret the date part (YYYY-MM-DD) as a local date at noon.
                // This bypasses conversion issues whether the source is '2023-12-26' or '2023-12-26T00:00:00Z'.
                // Supabase typically returns ISO strings.
                if (typeof dateSource === 'string') {
                    // Extract just the YYYY-MM-DD part first
                    const datePart = dateSource.split('T')[0];
                    const [year, month, day] = datePart.split('-').map(Number);

                    // Create date at 12:00 local time to be safe from DST/Timezone shifts
                    date = new Date(year, month - 1, day, 12, 0, 0);
                } else {
                    // Fallback for unlikely case it's already a Date object or other
                    date = new Date(dateSource);
                }

                return {
                    id: inj.id,
                    date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
                    day: date.toLocaleDateString('pt-BR', { weekday: 'long' }).replace(/^\w/, c => c.toUpperCase()),
                    dosage: inj.dosage,
                    notes: inj.notes,
                    status: inj.status === 'Applied' ? 'Aplicada' : 'Pulada',
                    doseValue: inj.dose_value || 0,
                    applicationDate: dateSource.split('T')[0], // Use raw string YYYY-MM-DD part for consistency
                    isPaid: inj.is_paid || false,
                    patient_id: inj.patient_id,
                    patientWeightAtInjection: inj.patient_weight_at_injection,
                    medicationId: inj.medication_id
                } as Injection;
            });

            setInjections(formattedInjections);

            // Calculate Dynamic Current Weight from latest injection
            const latestInjectionWithWeight = formattedInjections.find(inj => inj.patientWeightAtInjection && inj.patientWeightAtInjection > 0);

            // Priority: 
            // 1. Latest Injection Weight
            // 2. Patient Initial Weight (If no history, current = initial)
            // IGNORING patientData.current_weight from DB to prevent stale data
            const dynamicCurrentKey = latestInjectionWithWeight
                ? latestInjectionWithWeight.patientWeightAtInjection
                : patientData?.initial_weight;

            const initial = patientData?.initial_weight || 0;
            const current = dynamicCurrentKey || 0;
            const change = current - initial;

            if (patientData) {
                setRealPatient({
                    id: patientData.id,
                    name: patientData.name,
                    initials: patientData.initials,
                    age: patientData.age,
                    gender: patientData.gender,
                    avatarUrl: patientData.avatar_url,
                    currentWeight: current, // UPDATED: Dynamic
                    initialWeight: initial,
                    weightChange: parseFloat(change.toFixed(1)), // UPDATED: Dynamic calculation
                    bmi: patientData.bmi, // NOTE: BMI in DB might be stale too, but let's stick to weight for now or recalc BMI if we have height.
                    bmiCategory: patientData.bmi_category,
                    targetWeight: patientData.target_weight,
                    height: patientData.height
                });
            }

            // 4. Fetch payments for this patient
            const { data: paymentsData } = await supabase
                .from('financial_records')
                .select('amount')
                .eq('patient_id', patient.id)
                .eq('status', 'Paid');

            const paidSum = (paymentsData || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
            setTotalPaid(paidSum);

            // 5. Fetch step payments to know which steps are paid
            const paidIds = new Set<string>();
            formattedInjections.forEach(inj => {
                if (inj.isPaid && inj.id) paidIds.add(inj.id);
            });
            setPaidStepIds(paidIds);

            setLoading(false);
        } catch (err) {
            console.error('Error fetching profile data:', err);
            setLoading(false);
        }
    }, [patient.id]);

    useEffect(() => {
        fetchData();

        // Listen for global dose updates (from top bar button)
        const handleGlobalUpdate = () => {
            fetchData();
        };

        window.addEventListener('global-dose-added', handleGlobalUpdate);
        return () => {
            window.removeEventListener('global-dose-added', handleGlobalUpdate);
        };
    }, [fetchData]);

    // Calculate financial totals
    const { totalDosesValue, doseCount, paidDoseCount, totalPaidFromDoses } = useMemo(() => {
        const total = injections.reduce((sum, inj) => sum + (inj.doseValue || 0), 0);
        const paidCount = injections.filter(inj => inj.isPaid).length;
        const paidValue = injections.filter(inj => inj.isPaid).reduce((sum, inj) => sum + (inj.doseValue || 0), 0);
        return { totalDosesValue: total, doseCount: injections.length, paidDoseCount: paidCount, totalPaidFromDoses: paidValue };
    }, [injections]);

    // Build Journey Steps Dynamically from History + Plan
    const journeySteps: MedicationStep[] = useMemo(() => {
        // 1. Past Steps from Injections (Source of Truth)
        // Injections are sorted Newest -> Oldest in state. Reverse for Journey (1st -> Last)
        const pastSteps = [...injections].sort((a, b) => new Date(a.applicationDate).getTime() - new Date(b.applicationDate).getTime()).map((inj, index) => ({
            id: inj.id,
            dosage: inj.dosage,
            status: 'Concluído' as const, // Injections are by definition applied
            details: inj.date, // Display date as detail
            recordedWeight: inj.patientWeightAtInjection,
            date: inj.date,
            // Link to injection for edit? The component logic handles editing differently...
            // But we can pass the injection ID if needed.
        }));

        // 2. Future Steps from MedicationSteps table (The Plan)
        // Filter out any step that is marked 'Concluído' because we replaced them with actual history.
        // We only want 'Atual' (if not yet in history?), 'Bloqueado', 'Pulada'.
        // Actually, 'Atual' might be the *next* dose.
        const futureSteps = medicationSteps.filter(s => s.status !== 'Concluído');

        return [...pastSteps, ...futureSteps];
    }, [injections, medicationSteps]);

    const handleEditStep = (step: MedicationStep) => {
        // If it's a past step (from injection), we should edit the INJECTION
        if (step.status === 'Concluído' && step.id && injections.some(i => i.id === step.id)) {
            const injectionsToEdit = injections.find(i => i.id === step.id);
            if (injectionsToEdit) {
                handleEditInjection(injectionsToEdit);
                return;
            }
        }

        // Otherwise edit as step (Plan)
        setSelectedStep(step);
        setIsEditStepModalOpen(true);
    };

    const handleDeleteStep = (step: MedicationStep) => {
        setStepToDelete(step);
        setIsConfirmDeleteModalOpen(true);
    };

    const confirmDeleteStep = async () => {
        if (!stepToDelete || !stepToDelete.id) return;

        try {
            // Check if it's a real injection (history) or just a plan
            // If it's history (Concluído), we might need to delete from 'injections' table?
            // "cancelar a etapa" usually implies future.
            // If the user tries to delete a "Concluído" step that comes from 'injections', the ID should be the injection ID.
            // My 'journeySteps' logic sets ID = injection.id for past steps.

            if (stepToDelete.status === 'Concluído') {
                // It's an injection
                const { error } = await supabase
                    .from('injections')
                    .delete()
                    .eq('id', stepToDelete.id);
                if (error) throw error;
            } else {
                // It's a planned step
                const { error } = await supabase
                    .from('medication_steps')
                    .delete()
                    .eq('id', stepToDelete.id);
                if (error) throw error;
            }

            // Refresh
            fetchData();
            setIsConfirmDeleteModalOpen(false);
            setStepToDelete(null);
        } catch (error) {
            console.error('Error deleting step:', error);
            alert('Erro ao excluir etapa. Tente novamente.');
        }
    };

    const handleAddStep = () => {
        setSelectedStep(null);
        setIsEditStepModalOpen(true);
    };

    const handleDeleteInjection = (id: string, injection: Injection) => {
        // Open custom confirmation modal
        setInjectionToDelete({
            id,
            name: `${injection.dosage} - ${injection.date}`
        });
        setIsConfirmDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!injectionToDelete) return;

        setIsDeleting(true);
        try {
            const { error } = await supabase.from('injections').delete().eq('id', injectionToDelete.id);
            if (error) throw error;

            setIsConfirmDeleteModalOpen(false);
            setInjectionToDelete(null);

            requestAnimationFrame(() => {
                fetchData();
            });
        } catch (err) {
            alert('Erro ao excluir aplicação');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleTogglePayment = async (injection: Injection) => {
        if (!injection.id) return;

        const newStatus = !injection.isPaid;

        // Optimistic update
        setInjections(prev => prev.map(i => i.id === injection.id ? { ...i, isPaid: newStatus } : i));

        try {
            await supabase
                .from('injections')
                .update({ is_paid: newStatus })
                .eq('id', injection.id);

            // Also manage financial record? The modal does it... simplify for toggle
        } catch (e) {
            fetchData(); // Revert
        }
    };

    const handleEditPatient = () => {
        setIsEditPatientModalOpen(true);
    };

    const handleAddHistoricalDose = () => {
        setIsHistoricalDoseModalOpen(true);
    };

    const handleEditInjection = (injection: Injection) => {
        setSelectedInjectionForEdit(injection);
        setIsEditDoseModalOpen(true);
    };

    const handlePaymentClick = (step: MedicationStep) => {
        // If it's a past step, open payment for injection
        if (step.status === 'Concluído' && step.id && injections.some(i => i.id === step.id)) {
            const injectionsToEdit = injections.find(i => i.id === step.id);
            if (injectionsToEdit) {
                handleTogglePayment(injectionsToEdit);
                return;
            }
        }
        // Future steps payment logic? Usually we pay for done things.
        setSelectedStepForPayment(step);
        setIsPaymentModalOpen(true);
    };

    if (loading && medicationSteps.length === 0) {
        return <div className="p-20 text-center text-slate-500">Carregando perfil...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20 md:pb-0">
            <div className="max-w-6xl mx-auto flex items-center gap-2 text-sm text-slate-500 pt-8 px-4">
                <a href="#" onClick={(e) => { e.preventDefault(); onGoHome(); }} className="hover:underline opacity-60">Home</a>
                <span className="material-symbols-outlined text-base opacity-60">chevron_right</span>
                <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }} className="hover:underline">Pacientes</a>
                <span className="material-symbols-outlined text-base">chevron_right</span>
                <span className="font-medium text-slate-900 dark:text-white">{realPatient.name}</span>
            </div>

            <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
                <section className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 rounded-xl shadow-sm border border-blue-100 dark:border-slate-700 p-4 md:p-6 mb-4 md:mb-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="relative w-16 h-16 md:w-20 md:h-20 flex-shrink-0">
                                <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-2xl md:text-3xl font-bold shadow-lg">
                                    {realPatient.name.charAt(0)}
                                </div>
                                <div className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 md:w-6 md:h-6 rounded-full border-2 md:border-4 border-white dark:border-slate-800 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white text-xs md:text-sm">check</span>
                                </div>
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white truncate">{realPatient.name}</h2>
                                <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm text-slate-600 dark:text-slate-300 mt-1">
                                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-base">cake</span> {realPatient.age} anos</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-base">{realPatient.gender === 'Female' ? 'female' : 'male'}</span> {realPatient.gender === 'Female' ? 'Feminino' : 'Masculino'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    {/* Weight Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="material-symbols-outlined text-4xl text-blue-500">monitor_weight</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Peso Atual</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-slate-900 dark:text-white">{realPatient.currentWeight}</span>
                            <span className="text-sm font-medium text-slate-500">kg</span>
                        </div>
                        <div className={`text-xs font-medium mt-2 flex items-center gap-1 ${realPatient.weightChange <= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            <span className="material-symbols-outlined text-base">{realPatient.weightChange <= 0 ? 'trending_down' : 'trending_up'}</span>
                            <span>{Math.abs(realPatient.weightChange)} kg {realPatient.weightChange <= 0 ? 'perdidos' : 'ganhos'}</span>
                        </div>
                    </div>

                    {/* Target Weight Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="material-symbols-outlined text-4xl text-purple-500">flag</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Meta</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-slate-900 dark:text-white">{realPatient.targetWeight || '--'}</span>
                            <span className="text-sm font-medium text-slate-500">kg</span>
                        </div>
                        {realPatient.targetWeight && realPatient.currentWeight && (
                            <div className="text-xs font-medium mt-2 text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                <span className="material-symbols-outlined text-base">distance</span>
                                <span>Faltam {(realPatient.currentWeight - realPatient.targetWeight).toFixed(1)} kg</span>
                            </div>
                        )}
                        {!realPatient.targetWeight && (
                            <div className="text-xs font-medium mt-2 text-slate-400">
                                <span>Sem meta definida</span>
                            </div>
                        )}
                    </div>

                    {/* BMI Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="material-symbols-outlined text-4xl text-orange-500">health_and_safety</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">IMC</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-slate-900 dark:text-white">{realPatient.bmi}</span>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${realPatient.bmiCategory === 'Normal' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' :
                            realPatient.bmiCategory === 'Overweight' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            }`}>
                            {realPatient.bmiCategory === 'Overweight' ? 'Sobrepeso' :
                                realPatient.bmiCategory === 'Obese' ? 'Obesidade' :
                                    realPatient.bmiCategory === 'Normal' ? 'Normal' :
                                        realPatient.bmiCategory}
                        </span>
                    </div>

                    {/* Progress Card (Initial vs Current) */}
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 shadow-lg text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-30 transition-opacity">
                            <span className="material-symbols-outlined text-4xl text-white">analytics</span>
                        </div>
                        <p className="text-xs font-medium text-blue-100 uppercase tracking-wider mb-2">Progresso Total</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-white">
                                {realPatient.initialWeight && realPatient.currentWeight
                                    ? (realPatient.initialWeight - realPatient.currentWeight).toFixed(1)
                                    : '0.0'}
                            </span>
                            <span className="text-sm font-medium text-blue-100">kg elim.</span>
                        </div>
                        <div className="mt-3 w-full bg-black/20 rounded-full h-1.5 overflow-hidden">
                            <div
                                className="bg-white/90 h-full rounded-full transition-all duration-1000"
                                style={{
                                    width: `${realPatient.targetWeight && realPatient.initialWeight
                                        ? Math.min(100, Math.max(0, ((realPatient.initialWeight - realPatient.currentWeight) / (realPatient.initialWeight - realPatient.targetWeight)) * 100))
                                        : 0}%`
                                }}
                            ></div>
                        </div>
                        <div className="flex justify-between mt-1">
                            <span className="text-[10px] text-blue-200">Início: {realPatient.initialWeight}kg</span>
                            <span className="text-[10px] text-blue-200">Meta: {realPatient.targetWeight || '?'}kg</span>
                        </div>
                    </div>
                </div>

                {/* Weight Evolution Chart */}
                <div className="mb-8 animate-in slide-in-from-bottom-2 duration-500 delay-100">
                    <WeightEvolutionChart patient={realPatient} injections={injections} />
                </div>

                {/* Financial Section - New PatientFinancials */}
                <PatientFinancials
                    patient={realPatient}
                    injections={injections}
                    onUpdate={fetchData}
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Journey */}
                    <div className="lg:col-span-1 bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Jornada do Paciente</h3>
                        </div>
                        <MedicationPath
                            steps={journeySteps}
                            onEditStep={handleEditStep}
                            onAddStep={() => setIsEditStepModalOpen(true)}
                            onPaymentClick={handlePaymentClick}
                            onDeleteStep={handleDeleteStep}
                            paidStepIds={paidStepIds}
                            patient={realPatient}
                        />
                    </div>

                    {/* Right Column - History & Financial */}
                    <InjectionHistoryTable
                        injections={injections}
                        onDelete={(id, inj) => {
                            setInjectionToDelete({ id, name: `${inj.dosage} - ${inj.date}` });
                            setIsConfirmDeleteModalOpen(true);
                        }}
                        onEdit={handleEditInjection}
                        onAddHistorical={() => setIsHistoricalDoseModalOpen(true)}
                        onTogglePayment={handleTogglePayment}
                        highlightedDate={highlightedDate}
                    />
                </div>
            </main>

            {/* Modals */}
            {isEditStepModalOpen && (
                <EditMedicationStepModal
                    isOpen={isEditStepModalOpen}
                    onClose={() => setIsEditStepModalOpen(false)}
                    onSuccess={fetchData}
                    patientId={patient.id}
                    stepToEdit={selectedStep}
                    nextOrderIndex={medicationSteps.length}
                />
            )}

            {isEditPatientModalOpen && (
                <AddPatientModal
                    isOpen={isEditPatientModalOpen}
                    onClose={() => setIsEditPatientModalOpen(false)}
                    onSuccess={fetchData}
                    patientToEdit={realPatient}
                />
            )}

            {isHistoricalDoseModalOpen && (
                <GlobalRegisterDoseModal
                    isOpen={isHistoricalDoseModalOpen}
                    onClose={() => setIsHistoricalDoseModalOpen(false)}
                    onSuccess={(newInjection) => {
                        if (newInjection) {
                            setInjections(prev => [newInjection, ...prev]);
                        }
                        fetchData();
                        setIsHistoricalDoseModalOpen(false);
                    }}
                    initialPatient={realPatient}
                />
            )}

            {isPaymentModalOpen && selectedStepForPayment && (
                <PaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => {
                        setIsPaymentModalOpen(false);
                        setSelectedStepForPayment(null);
                    }}
                    onSuccess={fetchData}
                    step={selectedStepForPayment}
                    patientId={patient.id}
                    patientName={realPatient.name}
                />
            )}

            {isEditDoseModalOpen && selectedInjectionForEdit && (
                <GlobalRegisterDoseModal
                    isOpen={isEditDoseModalOpen}
                    onClose={() => {
                        setIsEditDoseModalOpen(false);
                        setSelectedInjectionForEdit(null);
                    }}
                    onSuccess={fetchData}
                    editMode={true}
                    editingInjection={selectedInjectionForEdit}
                />
            )}

            {isDosePaymentModalOpen && selectedInjectionForPayment && (
                <DosePaymentModal
                    isOpen={isDosePaymentModalOpen}
                    onClose={() => {
                        setIsDosePaymentModalOpen(false);
                        setSelectedInjectionForPayment(null);
                    }}
                    onSuccess={fetchData}
                    injection={selectedInjectionForPayment}
                    patientName={realPatient.name}
                />
            )}

            {/* Confirm Delete Modal */}
            <ConfirmDeleteModal
                isOpen={isConfirmDeleteModalOpen}
                onClose={() => {
                    setIsConfirmDeleteModalOpen(false);
                    setInjectionToDelete(null);
                    setStepToDelete(null);
                }}
                onConfirm={stepToDelete ? confirmDeleteStep : confirmDelete}
                itemName={stepToDelete ? `Dose ${stepToDelete.dosage}` : (injectionToDelete?.name || '')}
                loading={isDeleting}
            />
        </div>
    );
};

export default PatientProfilePage;
