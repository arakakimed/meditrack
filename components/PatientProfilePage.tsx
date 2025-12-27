import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Patient, MedicationStep, Injection } from '../types';
import { supabase } from '../lib/supabase';
import EditMedicationStepModal from './EditMedicationStepModal';
import AddPatientModal from './AddPatientModal';
import AddHistoricalDoseModal from './AddHistoricalDoseModal';

// Financial Balance Card Component
const FinancialBalanceCard: React.FC<{
    totalDosesValue: number;
    totalPaid: number;
    doseCount: number;
}> = ({ totalDosesValue, totalPaid, doseCount }) => {
    const balance = totalDosesValue - totalPaid;
    const balanceStatus = balance <= 0 ? 'quitado' : balance < 200 ? 'baixo' : 'pendente';

    const statusColors = {
        quitado: 'bg-green-50 border-green-200 text-green-700',
        baixo: 'bg-amber-50 border-amber-200 text-amber-700',
        pendente: 'bg-red-50 border-red-200 text-red-700'
    };

    const statusLabels = {
        quitado: '✓ Quitado',
        baixo: '⚠️ Saldo Baixo',
        pendente: '⚠️ Pendente'
    };

    const formatCurrency = (value: number) => {
        return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-emerald-500">account_balance_wallet</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Saldo Financeiro</h3>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-blue-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Doses</p>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(totalDosesValue)}</p>
                    <p className="text-[10px] text-slate-400">{doseCount} aplicações</p>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Pagamentos</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(totalPaid)}</p>
                </div>
                <div className={`text-center p-3 rounded-lg border ${statusColors[balanceStatus]}`}>
                    <p className="text-xs uppercase tracking-wider mb-1 opacity-70">Saldo</p>
                    <p className="text-lg font-bold">{formatCurrency(Math.max(0, balance))}</p>
                    <p className="text-[10px]">{statusLabels[balanceStatus]}</p>
                </div>
            </div>
        </div>
    );
};

const MedicationPath: React.FC<{ steps: MedicationStep[], onEditStep: (step: MedicationStep) => void, onAddStep: () => void }> = ({ steps, onEditStep, onAddStep }) => {
    const getIcon = (status: MedicationStep['status']) => {
        switch (status) {
            case 'Concluído': return 'check';
            case 'Atual': return 'pill';
            case 'Bloqueado': return 'lock';
            case 'Pulada': return 'error';
        }
    };

    const getIconClasses = (status: MedicationStep['status']) => {
        switch (status) {
            case 'Concluído': return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 ring-4 ring-surface-light dark:ring-surface-dark';
            case 'Atual': return 'bg-primary text-white ring-4 ring-blue-100 dark:ring-blue-900/30 shadow-lg shadow-blue-500/30';
            case 'Bloqueado': return 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 ring-4 ring-surface-light dark:ring-surface-dark border border-slate-200 dark:border-slate-700';
            case 'Pulada': return 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 ring-4 ring-surface-light dark:ring-surface-dark';
        }
    };

    return (
        <div className="relative pl-2">
            <div className="absolute top-2 left-[19px] bottom-6 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
            {steps.map((step, index) => (
                <div key={index} className={`relative flex gap-4 mb-8 ${step.status === 'Bloqueado' ? 'opacity-60' : ''}`}>
                    <div className={`relative z-10 flex items-center justify-center size-10 rounded-full ${getIconClasses(step.status)} cursor-pointer hover:scale-110 transition-transform`} onClick={() => onEditStep(step)}>
                        <span className={`material-symbols-outlined text-lg ${step.status === 'Atual' && 'animate-pulse'}`}>{getIcon(step.status)}</span>
                    </div>
                    <div className="flex flex-col pt-1 flex-1">
                        <div className="flex justify-between items-start">
                            <span className={`text-sm font-bold ${step.status === 'Atual' ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>{step.dosage}</span>
                        </div>
                        <span className="text-xs text-slate-500 mb-1">{step.details}</span>
                        {step.status === 'Atual' && step.progress && (
                            <div className="w-32 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-2">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${step.progress}%` }}></div>
                            </div>
                        )}
                    </div>
                </div>
            ))}
            <button
                onClick={onAddStep}
                className="ml-1 mt-2 flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-primary transition-colors uppercase tracking-wider"
            >
                <span className="material-symbols-outlined text-lg">add_circle</span>
                Adicionar Etapa
            </button>
        </div>
    );
};

const InjectionHistoryTable: React.FC<{
    injections: Injection[],
    onDelete: (id: string) => void,
    onAddHistorical: () => void
}> = ({ injections, onDelete, onAddHistorical }) => {
    const formatCurrency = (value: number) => {
        if (!value) return '-';
        return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="lg:col-span-2 bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Histórico de Aplicações</h3>
                <div className="flex gap-2">
                    <button
                        onClick={onAddHistorical}
                        className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 border border-amber-200 transition-colors flex items-center gap-1"
                    >
                        <span className="material-symbols-outlined text-sm">history</span>
                        Adicionar Dose Histórica
                    </button>
                    <button className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">Exportar CSV</button>
                </div>
            </div>
            <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            <th className="px-6 py-4 font-semibold">Data</th>
                            <th className="px-6 py-4 font-semibold">Dosagem</th>
                            <th className="px-6 py-4 font-semibold">Valor</th>
                            <th className="px-6 py-4 font-semibold">Notas</th>
                            <th className="px-6 py-4 font-semibold text-right">Status</th>
                            <th className="px-6 py-4 font-semibold text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {injections.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                    Nenhuma aplicação registrada
                                </td>
                            </tr>
                        ) : (
                            injections.map((injection, index) => (
                                <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {injection.isHistorical && (
                                                <span className="material-symbols-outlined text-amber-500 text-sm" title="Dose histórica">history</span>
                                            )}
                                            <div>
                                                <div className="text-sm font-medium text-slate-900 dark:text-white">{injection.date}</div>
                                                <div className="text-xs text-slate-500">{injection.day}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-slate-900 dark:text-white font-medium">{injection.dosage}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-mono text-slate-600">{formatCurrency(injection.doseValue || 0)}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-slate-500 truncate max-w-[150px]">{injection.notes}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ring-1 ring-inset ${injection.status === 'Aplicada' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-slate-50 text-slate-700 ring-slate-600/20'}`}>
                                            {injection.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => injection.id && onDelete(injection.id)}
                                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


interface PatientProfilePageProps {
    patient: Patient;
    onBack: () => void;
}

const PatientProfilePage: React.FC<PatientProfilePageProps> = ({ patient, onBack }) => {
    const [realPatient, setRealPatient] = useState<Patient>(patient);
    const [medicationSteps, setMedicationSteps] = useState<MedicationStep[]>([]);
    const [injections, setInjections] = useState<Injection[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalPaid, setTotalPaid] = useState(0);

    // Modals state
    const [isEditStepModalOpen, setIsEditStepModalOpen] = useState(false);
    const [selectedStep, setSelectedStep] = useState<MedicationStep | null>(null);
    const [isEditPatientModalOpen, setIsEditPatientModalOpen] = useState(false);
    const [isHistoricalDoseModalOpen, setIsHistoricalDoseModalOpen] = useState(false);

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
                    weightChange: patientData.weight_change || 0,
                    bmi: patientData.bmi,
                    bmiCategory: patientData.bmi_category,
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
                const dateSource = inj.application_date || inj.created_at;
                const date = new Date(dateSource);
                return {
                    id: inj.id,
                    date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
                    day: date.toLocaleDateString('pt-BR', { weekday: 'long' }).replace(/^\w/, c => c.toUpperCase()),
                    dosage: inj.dosage,
                    notes: inj.notes,
                    status: inj.status === 'Applied' ? 'Aplicada' : 'Pulada',
                    doseValue: inj.dose_value || 0,
                    isHistorical: inj.is_historical || false,
                    applicationDate: inj.application_date
                } as Injection;
            });

            setInjections(formattedInjections);

            // 4. Fetch payments for this patient
            const { data: paymentsData } = await supabase
                .from('financial_records')
                .select('value')
                .eq('patient_id', patient.id)
                .eq('status', 'Paid');

            const paidSum = (paymentsData || []).reduce((sum, p) => sum + (Number(p.value) || 0), 0);
            setTotalPaid(paidSum);

        } catch (err) {
            console.error('Error fetching profile data:', err);
        } finally {
            setLoading(false);
        }
    }, [patient.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Calculate financial totals
    const { totalDosesValue, doseCount } = useMemo(() => {
        const total = injections.reduce((sum, inj) => sum + (inj.doseValue || 0), 0);
        return { totalDosesValue: total, doseCount: injections.length };
    }, [injections]);

    const handleEditStep = (step: MedicationStep) => {
        setSelectedStep(step);
        setIsEditStepModalOpen(true);
    };

    const handleAddStep = () => {
        setSelectedStep(null);
        setIsEditStepModalOpen(true);
    };

    const handleDeleteInjection = async (id: string) => {
        if (!confirm('Deseja realmente excluir este registro de aplicação?')) return;

        try {
            const { error } = await supabase.from('injections').delete().eq('id', id);
            if (error) throw error;
            requestAnimationFrame(() => {
                fetchData();
            });
        } catch (err) {
            alert('Erro ao excluir aplicação');
        }
    };

    const handleEditPatient = () => {
        setIsEditPatientModalOpen(true);
    };

    const handleAddHistoricalDose = () => {
        setIsHistoricalDoseModalOpen(true);
    };

    if (loading && medicationSteps.length === 0) {
        return <div className="p-20 text-center text-slate-500">Carregando perfil...</div>;
    }

    return (
        <div className="max-w-6xl mx-auto flex flex-col gap-6 pb-20">
            <div className="flex items-center gap-2 text-sm text-slate-500">
                <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }} className="hover:underline">Pacientes</a>
                <span className="material-symbols-outlined text-base">chevron_right</span>
                <span className="font-medium text-slate-900 dark:text-white">Visão Geral do Perfil</span>
            </div>

            <section className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden relative group">
                <button
                    onClick={handleEditPatient}
                    className="absolute top-4 right-4 z-10 p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-primary transition-all opacity-0 group-hover:opacity-100"
                >
                    <span className="material-symbols-outlined text-lg">edit</span>
                </button>

                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8 justify-between items-start md:items-center">
                    <div className="flex gap-6 items-center">
                        <div className="bg-center bg-no-repeat bg-cover rounded-full h-24 w-24 ring-4 ring-slate-50 dark:ring-slate-800 shadow-inner" style={{ backgroundImage: `url("${realPatient.avatarUrl || 'https://ui-avatars.com/api/?name=' + realPatient.name}")` }}></div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{realPatient.name}</h1>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500 dark:text-slate-400 text-sm">
                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-base">badge</span> ID: {realPatient.id.substring(0, 8)}</span>
                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-base">cake</span> {realPatient.age} Anos</span>
                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-base">{realPatient.gender === 'Female' ? 'female' : 'male'}</span> {realPatient.gender === 'Female' ? 'Feminino' : 'Masculino'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                        <div className="flex-1 md:flex-none min-w-[140px] bg-blue-50 dark:bg-slate-800/50 rounded-lg p-4 border border-blue-100 dark:border-slate-700">
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Peso Atual</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-slate-900 dark:text-white">{realPatient.currentWeight}</span>
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">kg</span>
                            </div>
                            <div className="text-xs text-green-600 mt-1 flex items-center">
                                <span className="material-symbols-outlined text-sm mr-0.5">trending_down</span>
                                <span>{realPatient.weightChange} kg esta semana</span>
                            </div>
                        </div>
                        <div className="flex-1 md:flex-none min-w-[140px] bg-orange-50 dark:bg-slate-800/50 rounded-lg p-4 border border-orange-100 dark:border-slate-700">
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">IMC</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-slate-900 dark:text-white">{realPatient.bmi}</span>
                            </div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 mt-1">
                                {realPatient.bmiCategory === 'Overweight' ? 'Sobrepeso' :
                                    realPatient.bmiCategory === 'Obese' ? 'Obesidade' :
                                        realPatient.bmiCategory === 'Normal' ? 'Normal' :
                                            realPatient.bmiCategory}
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Financial Balance Card */}
            <FinancialBalanceCard
                totalDosesValue={totalDosesValue}
                totalPaid={totalPaid}
                doseCount={doseCount}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Jornada do Paciente</h3>
                    </div>
                    <MedicationPath
                        steps={medicationSteps}
                        onEditStep={handleEditStep}
                        onAddStep={handleAddStep}
                    />
                </div>
                <InjectionHistoryTable
                    injections={injections}
                    onDelete={handleDeleteInjection}
                    onAddHistorical={handleAddHistoricalDose}
                />
            </div>

            <button
                onClick={handleEditPatient}
                className="fixed bottom-8 right-8 z-30 group flex items-center justify-center gap-2 bg-primary hover:bg-blue-700 text-white shadow-xl shadow-blue-900/20 rounded-full pl-5 pr-6 py-4 transition-all duration-300 hover:scale-105 active:scale-95"
            >
                <span className="material-symbols-outlined text-2xl group-hover:rotate-90 transition-transform duration-300">add</span>
                <span className="font-bold text-base tracking-wide">Registrar Peso</span>
            </button>

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
                <AddHistoricalDoseModal
                    isOpen={isHistoricalDoseModalOpen}
                    onClose={() => setIsHistoricalDoseModalOpen(false)}
                    onSuccess={fetchData}
                    patientId={patient.id}
                    patientName={realPatient.name}
                />
            )}
        </div>
    );
};

export default PatientProfilePage;
