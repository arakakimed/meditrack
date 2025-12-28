import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface MedicationStep {
    id?: string;
    dosage: string;
    details: string;
    status: 'Concluído' | 'Atual' | 'Bloqueado' | 'Pulada';
    progress?: number;
    order_index: number;
    current_week?: number;
    total_weeks?: number;
    is_skipped?: boolean;
}

interface EditMedicationStepModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    patientId: string;
    stepToEdit?: MedicationStep | null;
    nextOrderIndex: number;
}

const EditMedicationStepModal: React.FC<EditMedicationStepModalProps> = ({ isOpen, onClose, onSuccess, patientId, stepToEdit, nextOrderIndex }) => {
    const [loading, setLoading] = useState(false);
    const [dosage, setDosage] = useState('');
    const [details, setDetails] = useState('');
    const [status, setStatus] = useState<'Concluído' | 'Atual' | 'Bloqueado' | 'Pulada'>('Bloqueado');
    const [progress, setProgress] = useState(0);
    const [currentWeek, setCurrentWeek] = useState(1);
    const [totalWeeks, setTotalWeeks] = useState(16);
    const [isSkipped, setIsSkipped] = useState(false);
    const [lastRegisteredWeek, setLastRegisteredWeek] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [date, setDate] = useState('');

    useEffect(() => {
        const fetchLastWeek = async () => {
            const { data } = await supabase
                .from('medication_steps')
                .select('current_week')
                .eq('patient_id', patientId)
                .order('current_week', { ascending: false })
                .limit(1);
            if (data && data.length > 0) {
                setLastRegisteredWeek(data[0].current_week);
                if (!stepToEdit) setCurrentWeek(data[0].current_week + 1);
            }
        };

        if (isOpen) {
            fetchLastWeek();
            if (stepToEdit) {
                setDosage(stepToEdit.dosage.replace(' mg', '').replace('mg', ''));
                setDetails(stepToEdit.details || '');
                setStatus(stepToEdit.status);
                setProgress(stepToEdit.progress || 0);
                setCurrentWeek(stepToEdit.current_week || 1);
                setTotalWeeks(stepToEdit.total_weeks || 16);
                setIsSkipped(stepToEdit.is_skipped || false);
                // Parse date if exists. Step date format might be "26 de dez." or "DD/MM/YYYY" or ISO?
                // Ideally we should store ISO in DB. Assuming 'date' in stepToEdit is display string, 
                // we might need to change implementation plan to store ISO separately or parse it back.
                // For now, let's assume we are starting fresh with ISO dates in DB for new feature.
                // Or if it's already localized, we can't easily put it in input type="date".
                // Let's assume we will start saving YYYY-MM-DD from now on.
                // If the existing date is "26 de dez.", we ignore it for the date picker (or try to parse).
                // Let's check if stepToEdit has a 'scheduled_date' or raw 'date' if it was YYYY-MM-DD.

                // If stepToEdit.date is "YYYY-MM-DD", use it.
                if (stepToEdit.date && stepToEdit.date.includes('-') && !stepToEdit.date.includes('de')) {
                    setDate(stepToEdit.date);
                } else {
                    setDate('');
                }
            } else {
                setDosage('');
                setDetails('');
                setStatus('Bloqueado');
                setProgress(0);
                setTotalWeeks(16);
                setIsSkipped(false);
                setDate('');
            }
            // Fetch Patient Weights for Progress Calculation
            const fetchWeights = async () => {
                const { data: p } = await supabase
                    .from('patients')
                    .select('initial_weight, current_weight, target_weight')
                    .eq('id', patientId)
                    .single();

                if (p && p.initial_weight && p.target_weight && p.current_weight) {
                    const totalToLose = p.initial_weight - p.target_weight;
                    const lostSoFar = p.initial_weight - p.current_weight;
                    if (totalToLose > 0) {
                        const pct = Math.round((lostSoFar / totalToLose) * 100);
                        // Cap at 100? User Image shows 119%, so DO NOT CAP.
                        setProgress(pct);
                    } else {
                        setProgress(100);
                    }
                }
            };
            fetchWeights();

        }
    }, [stepToEdit, isOpen, patientId]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            const formattedDosage = dosage.includes('mg') ? dosage : `${dosage} mg`;

            // Validation: Current week must be > last week (except for editing current or past)
            if (!stepToEdit && currentWeek <= lastRegisteredWeek) {
                throw new Error(`A semana atual deve ser maior que a última registrada (${lastRegisteredWeek})`);
            }

            const autoDetails = isSkipped ? 'Dose Pulada' : `Semana ${currentWeek} de ${totalWeeks}`;
            const calculatedProgress = status === 'Concluído' ? 100 : (status === 'Bloqueado' ? 0 : Math.round((currentWeek / totalWeeks) * 100));

            const stepData = {
                patient_id: patientId,
                dosage: formattedDosage,
                details: details || autoDetails,
                status: isSkipped ? 'Pulada' : status,
                progress: calculatedProgress,
                current_week: currentWeek,
                total_weeks: totalWeeks,
                is_skipped: isSkipped,
                user_id: user.id,
                order_index: stepToEdit ? stepToEdit.order_index : nextOrderIndex,
                date: date || null // Save ISO string directly.
            };

            if (stepToEdit?.id) {
                const { error: updateError } = await supabase
                    .from('medication_steps')
                    .update(stepData)
                    .eq('id', stepToEdit.id);
                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('medication_steps')
                    .insert([stepData]);
                if (insertError) throw insertError;
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar etapa');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{stepToEdit ? 'Editar Etapa' : 'Nova Etapa'}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Dosagem</label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.5"
                                required
                                value={dosage}
                                onChange={(e) => setDosage(e.target.value)}
                                className="w-full pl-4 pr-12 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 outline-none text-slate-900 dark:text-white"
                                placeholder="0.0"
                            />
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                                mg
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Detalhes / Observações</label>
                        <input
                            type="text"
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 outline-none text-slate-900 dark:text-white"
                            placeholder="Ex: Semana 1 de 4"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Data Prevista</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 outline-none text-slate-900 dark:text-white"
                        />
                    </div>



                    <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl">
                        <input
                            type="checkbox"
                            id="isSkipped"
                            checked={isSkipped}
                            onChange={(e) => setIsSkipped(e.target.checked)}
                            className="w-5 h-5 rounded-lg border-slate-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="isSkipped" className="text-sm font-semibold text-amber-900 dark:text-amber-200 flex flex-col">
                            <span>Informar dose pulada</span>
                            <span className="text-[10px] font-normal opacity-70">A dose será registrada mas não contará como avanço semanal</span>
                        </label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as any)}
                                disabled={isSkipped}
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none text-slate-900 dark:text-white disabled:opacity-50"
                            >
                                <option value="Concluído">Concluído</option>
                                <option value="Atual">Atual</option>
                                <option value="Bloqueado">Bloqueado</option>
                                {isSkipped && <option value="Pulada">Pulada</option>}
                            </select>
                        </div>
                        <div className="flex flex-col justify-end">
                            <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Progresso Automático (Peso)</div>
                            <div className="text-sm font-bold text-primary">
                                {progress}%
                            </div>
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-xs">{error}</p>}

                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 transition-all">Cancelar</button>
                        <button type="submit" disabled={loading} className="flex-1 bg-primary text-white font-bold py-2.5 rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-70">
                            {loading ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditMedicationStepModal;
