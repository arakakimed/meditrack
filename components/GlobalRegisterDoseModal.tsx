import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface GlobalRegisterDoseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const GlobalRegisterDoseModal: React.FC<GlobalRegisterDoseModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [patients, setPatients] = useState<any[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
    const [lastStep, setLastStep] = useState<any | null>(null);
    const [medications, setMedications] = useState<any[]>([]);
    const [selectedMedId, setSelectedMedId] = useState('');

    // Form fields
    const [dosage, setDosage] = useState('2.5');
    const [currentWeek, setCurrentWeek] = useState(1);
    const [totalWeeks, setTotalWeeks] = useState(16);
    const [notes, setNotes] = useState('');
    const [sideEffects, setSideEffects] = useState('');
    const [injectionSite, setInjectionSite] = useState('Abdômen');
    const [weight, setWeight] = useState('');
    const [error, setError] = useState<string | null>(null);

    const searchRef = useRef<HTMLDivElement>(null);
    const [showResults, setShowResults] = useState(false);

    useEffect(() => {
        const fetchPatients = async () => {
            if (searchQuery.length < 2) {
                setPatients([]);
                return;
            }
            const { data } = await supabase
                .from('patients')
                .select('*')
                .ilike('name', `%${searchQuery}%`)
                .limit(5);
            setPatients(data || []);
        };

        const timer = setTimeout(fetchPatients, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        const fetchMedications = async () => {
            const { data } = await supabase.from('medications').select('*').order('name');
            setMedications(data || []);
            if (data && data.length > 0) setSelectedMedId(data[0].id);
        };
        fetchMedications();
    }, []);

    useEffect(() => {
        const fetchLastDose = async () => {
            if (!selectedPatient) return;

            setLoading(true);
            try {
                // Fetch last medication step
                const { data: stepData } = await supabase
                    .from('medication_steps')
                    .select('*')
                    .eq('patient_id', selectedPatient.id)
                    .order('current_week', { ascending: false })
                    .limit(1);

                if (stepData && stepData.length > 0) {
                    const last = stepData[0];
                    setLastStep(last);
                    setDosage(last.dosage.replace(' mg', '').replace('mg', ''));
                    setCurrentWeek(last.current_week + 1);
                    setTotalWeeks(last.total_weeks || 16);
                } else {
                    setLastStep(null);
                    setDosage('2.5');
                    setCurrentWeek(1);
                    setTotalWeeks(16);
                }

                setWeight(selectedPatient.current_weight?.toString() || '');
            } catch (err) {
                console.error('Error fetching last dose:', err);
            } finally {
                setLoading(false);
            }
        };

        if (selectedPatient) fetchLastDose();
    }, [selectedPatient]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatient) return;

        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            const formattedDosage = `${dosage} mg`;
            const today = new Date();
            const nextDoseDate = new Date();
            nextDoseDate.setDate(today.getDate() + 7);

            // 1. Register Injection
            const { error: injError } = await supabase.from('injections').insert([{
                patient_id: selectedPatient.id,
                dosage: formattedDosage,
                notes: notes,
                side_effects: sideEffects,
                injection_site: injectionSite,
                status: 'Applied',
                user_id: user.id
            }]);
            if (injError) throw injError;

            // 2. Update/Insert Medication Step
            const stepData = {
                patient_id: selectedPatient.id,
                dosage: formattedDosage,
                details: `Semana ${currentWeek} de ${totalWeeks}`,
                status: 'Atual',
                progress: Math.round((currentWeek / totalWeeks) * 100),
                current_week: currentWeek,
                total_weeks: totalWeeks,
                user_id: user.id,
                order_index: (lastStep?.order_index || 0) + 1
            };

            // Marks all previous steps as 'Concluído'
            await supabase
                .from('medication_steps')
                .update({ status: 'Concluído', progress: 100 })
                .eq('patient_id', selectedPatient.id)
                .neq('status', 'Pulada');

            const { error: stepError } = await supabase.from('medication_steps').insert([stepData]);
            if (stepError) throw stepError;

            // 3. Update Patient Weight
            if (weight) {
                await supabase
                    .from('patients')
                    .update({ current_weight: parseFloat(weight) })
                    .eq('id', selectedPatient.id);
            }

            // 4. Schedule Next Dose
            const { error: appError } = await supabase.from('upcoming_doses').insert([{
                patient_id: selectedPatient.id,
                scheduled_at: nextDoseDate.toISOString(),
                dosage: `${formattedDosage} (Semana ${currentWeek + 1})`,
                treatment: 'Tirzepatida', // Default treatment
                status: 'Agendado',
                user_id: user.id
            }]);
            if (appError) throw appError;

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Erro ao registrar aplicação');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <span className="material-symbols-outlined">vaccines</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Registrar Aplicação</h3>
                            <p className="text-xs text-slate-500">Controle clínico de jornada</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[80vh] space-y-6">
                    {/* Patient Search */}
                    <div className="relative" ref={searchRef}>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Buscar Paciente</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={selectedPatient ? selectedPatient.name : searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    if (selectedPatient) setSelectedPatient(null);
                                    setShowResults(true);
                                }}
                                onFocus={() => setShowResults(true)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 outline-none text-slate-900 dark:text-white"
                                placeholder="Digite o nome do paciente..."
                                autoComplete="off"
                            />
                            {selectedPatient && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedPatient(null)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"
                                >
                                    <span className="material-symbols-outlined">cancel</span>
                                </button>
                            )}
                        </div>

                        {showResults && patients.length > 0 && !selectedPatient && (
                            <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
                                {patients.map(p => (
                                    <div
                                        key={p.id}
                                        onClick={() => {
                                            setSelectedPatient(p);
                                            setShowResults(false);
                                        }}
                                        className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex items-center gap-3 transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                            {p.initials}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-slate-900 dark:text-white">{p.name}</span>
                                            <span className="text-[10px] text-slate-500 italic">ID: {p.id.substring(0, 8)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {selectedPatient && (
                        <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Medicação</label>
                                    <select
                                        value={selectedMedId}
                                        onChange={(e) => setSelectedMedId(e.target.value)}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 outline-none text-slate-900 dark:text-white"
                                    >
                                        <option value="">Selecione...</option>
                                        {medications.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col justify-end">
                                    {selectedMedId && (
                                        <div className="p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col justify-center h-[42px]">
                                            <div className="flex justify-between items-center px-1">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Conversão Principal:</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-sm font-bold text-primary">
                                                        {(() => {
                                                            const med = medications.find(m => m.id === selectedMedId);
                                                            const conc = parseFloat(med?.concentration_mg_ml) || 1;
                                                            const d = parseFloat(dosage) || 0;
                                                            const ml = d / conc;
                                                            return (ml * 100).toFixed(0);
                                                        })()} UI
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                        ({(() => {
                                                            const med = medications.find(m => m.id === selectedMedId);
                                                            const conc = parseFloat(med?.concentration_mg_ml) || 1;
                                                            const d = parseFloat(dosage) || 0;
                                                            const ml = d / conc;
                                                            return ml.toFixed(2);
                                                        })()} mL)
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Dose Atual</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.5"
                                            required
                                            value={dosage}
                                            onChange={(e) => setDosage(e.target.value)}
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 outline-none text-slate-900 dark:text-white"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs uppercase">mg</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Peso Hoje (kg)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={weight}
                                        onChange={(e) => setWeight(e.target.value)}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 outline-none text-slate-900 dark:text-white"
                                        placeholder="00.0"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Semana Progressiva</label>
                                    <input
                                        type="number"
                                        required
                                        value={currentWeek}
                                        onChange={(e) => setCurrentWeek(parseInt(e.target.value))}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 outline-none text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Plano Total (Semanas)</label>
                                    <input
                                        type="number"
                                        required
                                        value={totalWeeks}
                                        onChange={(e) => setTotalWeeks(parseInt(e.target.value))}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 outline-none text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Local de Aplicação</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['Abdômen', 'Coxa', 'Braço'].map(site => (
                                        <button
                                            key={site}
                                            type="button"
                                            onClick={() => setInjectionSite(site)}
                                            className={`py-2 text-xs font-bold rounded-lg border transition-all ${injectionSite === site
                                                ? 'bg-primary text-white border-primary shadow-md'
                                                : 'border-slate-200 text-slate-500 hover:border-primary/50'}`}
                                        >
                                            {site}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Efeitos Colaterais / Reações</label>
                                    <textarea
                                        value={sideEffects}
                                        onChange={(e) => setSideEffects(e.target.value)}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 outline-none text-slate-900 dark:text-white h-16 resize-none text-sm"
                                        placeholder="Náuseas, dor local, etc..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Observações Gerais</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 outline-none text-slate-900 dark:text-white h-20 resize-none text-sm"
                                        placeholder="Dificuldades de aplicação, relatos do paciente..."
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl flex items-center gap-3 text-rose-600 dark:text-rose-400 text-sm">
                            <span className="material-symbols-outlined">error</span>
                            {error}
                        </div>
                    )}

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !selectedPatient}
                            className="flex-1 bg-primary hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <>
                                    <span>Confirmar Aplicação</span>
                                    <span className="material-symbols-outlined">check_circle</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default GlobalRegisterDoseModal;
