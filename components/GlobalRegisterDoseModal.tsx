import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface GlobalRegisterDoseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newInjection?: any) => void;
    editingInjection?: any | null;
    editMode?: boolean;
    initialPatient?: any | null; // Allow passing current patient context
}

const GlobalRegisterDoseModal: React.FC<GlobalRegisterDoseModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    editingInjection = null,
    editMode = false,
    initialPatient = null
}) => {
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [patients, setPatients] = useState<any[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<any | null>(initialPatient);
    // ...
    const [lastStep, setLastStep] = useState<any | null>(null);
    const [medications, setMedications] = useState<any[]>([]);
    const [selectedMedId, setSelectedMedId] = useState('');

    // Form fields
    const [applicationDate, setApplicationDate] = useState(new Date().toISOString().split('T')[0]);
    const [dosage, setDosage] = useState('2.5');
    const [currentWeek, setCurrentWeek] = useState(1);
    const [totalWeeks, setTotalWeeks] = useState(16);
    const [notes, setNotes] = useState('');
    const [sideEffects, setSideEffects] = useState('');
    const [injectionSite, setInjectionSite] = useState('Abdômen');
    const [injectionSide, setInjectionSide] = useState<'Esquerdo' | 'Direito' | ''>('');
    const [lastInjectionSide, setLastInjectionSide] = useState<string | null>(null);
    const [weight, setWeight] = useState('');
    const [doseValue, setDoseValue] = useState('60');
    const [isPaid, setIsPaid] = useState(false);
    const [patientBalance, setPatientBalance] = useState(0);
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

            if (data && data.length > 0 && !editMode) {
                // Default to Tirzepatida ONLY for NEW applications
                const tirzepatida = data.find(m => m.name.toLowerCase().includes('tirzepatida'));
                setSelectedMedId(tirzepatida ? tirzepatida.id : data[0].id);
            }
        };
        fetchMedications();
    }, [editMode]);

    useEffect(() => {
        const fetchLastDose = async () => {
            if (!selectedPatient) return;

            // CRITICAL FIX: If editing, DO NOT fetch last dose to auto-populate fields.
            // We want to keep the values from the injection being edited.
            // Unless we strictly need the side suggestion, but simpler to just skip for now to fix the bug.
            if (editMode) return;

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



                // Fetch last injection for side suggestion
                // Try to extract side info from notes (fallback because we don't have a column)
                // NOOP here - moved to separate useEffect dependent on date

                setWeight(selectedPatient.current_weight?.toString() || '');
            } catch (err) {
                console.error('Error fetching last dose:', err);
            } finally {
                setLoading(false);
            }
        };

        if (selectedPatient && !editMode) fetchLastDose();
    }, [selectedPatient, editMode]); // Added editMode dependency to prevent running when editing

    // Separate effect for Side Suggestion that depends on Date
    useEffect(() => {
        const fetchPreviousSide = async () => {
            if (!selectedPatient || !applicationDate) return;

            // Find the injection immediately PRIOR to the current application date
            const { data: prevInjection } = await supabase
                .from('injections')
                .select('notes, applied_at')
                .eq('patient_id', selectedPatient.id)
                .neq('status', 'Skipped')
                .lt('applied_at', applicationDate) // Strictly before this application
                .order('applied_at', { ascending: false })
                .limit(1);

            if (prevInjection && prevInjection.length > 0) {
                const notes = prevInjection[0].notes || '';

                let foundSide: 'Direito' | 'Esquerdo' | null = null;
                if (notes.includes('[Lado: Direito]')) foundSide = 'Direito';
                else if (notes.includes('[Lado: Esquerdo]')) foundSide = 'Esquerdo';

                setLastInjectionSide(foundSide);

                // Only auto-set if creating new dose and no side selected yet
                // If editing, we trust the loaded data (or user manual change)
                if (!editMode && foundSide && !injectionSide) {
                    setInjectionSide(foundSide === 'Direito' ? 'Esquerdo' : 'Direito');
                }
            } else {
                setLastInjectionSide(null);
            }
        };

        // Debounce slightly to avoid rapid queries on date typing?
        // For date picker it's fine.
        fetchPreviousSide();
    }, [selectedPatient, applicationDate, editMode]); // omit injectionSide to avoid loop, but we check it inside

    // Auto-populate dose value from packages or calculation
    useEffect(() => {
        if (selectedMedId && dosage) {
            const med = medications.find(m => m.id === selectedMedId);
            if (med) {
                const d = parseFloat(dosage) || 0;

                // Try to load packages from localStorage
                let packages: any[] = [];
                const stored = localStorage.getItem(`med_packages_${selectedMedId}`);
                if (stored) {
                    try {
                        packages = JSON.parse(stored);
                    } catch { /* ignore */ }
                }

                // Check if there's a matching package for this dosage
                const matchingPackage = packages.find(p => p.dosage === d && p.enabled && p.price > 0);

                if (matchingPackage) {
                    // Use the package price
                    setDoseValue(matchingPackage.price.toFixed(2));
                } else {
                    // Calculate from sale price per mg
                    const salePerMg = parseFloat(med.sale_price_per_mg || med.sale_price) || 0;
                    const calculatedPrice = d * salePerMg;
                    setDoseValue(calculatedPrice.toFixed(2));
                }
            }
        }
    }, [selectedMedId, dosage, medications]);

    // Populate fields when editing
    useEffect(() => {
        if (editMode && editingInjection) {
            // Set date
            if (editingInjection.applicationDate) {
                setApplicationDate(editingInjection.applicationDate);
            }

            // Set dosage
            if (editingInjection.dosage) {
                // Extract just the number from "2.5 mg" format
                const dosageMatch = editingInjection.dosage.match(/[\d.]+/);
                setDosage(dosageMatch ? dosageMatch[0] : editingInjection.dosage);
            }

            // Set notes
            setNotes(editingInjection.notes || '');

            // Restore Injection Side from Notes
            const notes = editingInjection.notes || '';
            if (notes.includes('[Lado: Direito]')) {
                setInjectionSide('Direito');
            } else if (notes.includes('[Lado: Esquerdo]')) {
                setInjectionSide('Esquerdo');
            } else {
                setInjectionSide('');
            }

            // Set value and payment
            setDoseValue((editingInjection.doseValue || 0).toString());
            setIsPaid(editingInjection.isPaid || false);

            // Set patient if available
            if (editingInjection.patient_id) {
                // Will need to fetch patient data
                const fetchPatient = async () => {
                    const { data } = await supabase
                        .from('patients')
                        .select('*')
                        .eq('id', editingInjection.patient_id)
                        .single();
                    if (data) {
                        setSelectedPatient(data);
                    }
                };
                fetchPatient();
            }

            // CRITICAL FIX: Restore Weight
            if (editingInjection.patientWeightAtInjection) {
                setWeight(editingInjection.patientWeightAtInjection.toString());
            } else if (editingInjection.patient_weight_at_injection) {
                setWeight(editingInjection.patient_weight_at_injection.toString());
            }

            // Restore Medication if available
            if (editingInjection.medicationId) {
                setSelectedMedId(editingInjection.medicationId);
            } else if (editingInjection.medication_id) {
                setSelectedMedId(editingInjection.medication_id);
            }
        }
    }, [editMode, editingInjection]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatient) return;

        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            const formattedDosage = `${dosage} mg`;
            const applicationDateTime = new Date(applicationDate);
            const nextDoseDate = new Date(applicationDate);
            nextDoseDate.setDate(applicationDateTime.getDate() + 7);

            //  Register or Update Injection
            // Include side info in notes for now (until migration is run)
            // Include side info in notes for now (until migration is run)
            // USER REQUEST FIX: Stop appending side to notes -> Actually, we MUST append if we want to remember it!
            // But we should be careful not to double append if editing.
            let fullNotes = notes;
            if (injectionSide) {
                const sideTag = `[Lado: ${injectionSide}]`;
                if (!fullNotes.includes('[Lado:')) {
                    fullNotes = fullNotes ? `${fullNotes} ${sideTag}` : sideTag;
                } else {
                    // Replace existing tag if changed
                    fullNotes = fullNotes.replace(/\[Lado: \w+\]/, sideTag);
                }
            }

            const injectionData = {
                patient_id: selectedPatient.id,
                medication_id: selectedMedId, // Save medication ID
                dosage: formattedDosage,
                notes: fullNotes,
                side_effects: sideEffects,
                injection_site: injectionSite,
                status: 'Applied',
                applied_at: applicationDateTime.toISOString(),
                dose_value: parseFloat(doseValue) || 0,
                is_paid: isPaid,
                user_id: user.id,
                patient_weight_at_injection: weight ? parseFloat(weight) : null
            };

            let finalInjection = null;

            if (editMode && editingInjection?.id) {
                // UPDATE existing injection
                const { data: updated, error: injError } = await supabase
                    .from('injections')
                    .update(injectionData)
                    .eq('id', editingInjection.id)
                    .select()
                    .single();
                if (injError) throw injError;
                finalInjection = updated;
            } else {
                // INSERT new injection
                const { data: inserted, error: injError } = await supabase
                    .from('injections')
                    .insert([injectionData])
                    .select()
                    .single();
                if (injError) throw injError;
                finalInjection = inserted;
            }

            // 1.5. If marked as paid, also create a financial record
            if (isPaid && parseFloat(doseValue) > 0) {
                await supabase
                    .from('financial_records')
                    .insert([{
                        patient_id: selectedPatient.id,
                        description: `Pagamento - Dose ${formattedDosage} (${applicationDate})`,
                        amount: parseFloat(doseValue),
                        status: 'Pago',
                        due_date: applicationDate,
                        user_id: user.id
                    }]);
            }

            // 2. Update/Insert Medication Step
            // Logic Update: user registered 'currentWeek'. So 'currentWeek' is DONE.
            // We should create a step for 'currentWeek + 1' as the NEW 'Atual'.

            // First, mark everything up to currentWeek as Concluído (just to be safe/clean)
            await supabase
                .from('medication_steps')
                .update({ status: 'Concluído', progress: 100 })
                .eq('patient_id', selectedPatient.id)
                .neq('status', 'Pulada');

            // Then insert the NEXT step (Plan for next week)
            const nextWeek = currentWeek + 1;
            // Determine dosage for next week? Assume maintenance unless changed.
            const nextStepData = {
                patient_id: selectedPatient.id,
                dosage: formattedDosage, // Default to same dosage
                details: `Semana ${nextWeek} de ${totalWeeks}`,
                status: 'Atual',
                progress: 0, // Fresh start for next step
                current_week: nextWeek,
                total_weeks: totalWeeks,
                user_id: user.id,
                order_index: (lastStep?.order_index || 0) + 1
            };

            const { error: stepError } = await supabase.from('medication_steps').insert([nextStepData]);
            // If error, log but don't block success of injection? 
            if (stepError) console.error("Error creating next step:", stepError);

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
                dosage: `${formattedDosage} (Semana ${nextWeek})`,
                treatment: 'Tirzepatida',
                status: 'Agendado',
                user_id: user.id
            }]);

            if (appError) console.error("Error scheduling next dose:", appError);

            onSuccess(finalInjection);
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
            <div className="relative bg-white dark:bg-slate-800 rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 m-4">
                <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <span className="material-symbols-outlined text-lg md:text-xl">vaccines</span>
                        </div>
                        <div>
                            <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">{editMode ? 'Editar Aplicação' : 'Registrar Aplicação'}</h3>
                            <p className="text-[10px] md:text-xs text-slate-500">Controle clínico de jornada</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 md:p-6 overflow-y-auto max-h-[80vh] space-y-4 md:space-y-6">
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
                        <div className="space-y-4 md:space-y-6 animate-in slide-in-from-top-2 duration-300">
                            {/* Application Date Field */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    <span className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">calendar_today</span>
                                        Data da Aplicação
                                    </span>
                                </label>
                                <input
                                    type="date"
                                    value={applicationDate}
                                    onChange={(e) => setApplicationDate(e.target.value)}
                                    max={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-2.5 md:py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 outline-none text-slate-900 dark:text-white"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Medicação</label>
                                    <select
                                        value={selectedMedId}
                                        onChange={(e) => setSelectedMedId(e.target.value)}
                                        className="w-full px-4 py-2.5 md:py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 outline-none text-slate-900 dark:text-white"
                                    >
                                        <option value="">Selecione...</option>
                                        {medications.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col justify-end">
                                    {selectedMedId && (
                                        <div className="p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col justify-center h-[42px] md:h-[42px]">
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

                            <div className="space-y-3 md:space-y-4">
                                {/* Dose Input with UI Calculation - Side by Side on Desktop, Stacked on Mobile */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Dose Atual</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs uppercase pointer-events-none">mg</span>
                                            <input
                                                type="number"
                                                step="0.5"
                                                required
                                                value={dosage}
                                                onChange={(e) => setDosage(e.target.value)}
                                                className="w-full pl-12 pr-4 py-2.5 md:py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 outline-none text-slate-900 dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    {/* UI Calculation Display - Highlighted */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            <span className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-sm">calculate</span>
                                                Conversão UI
                                            </span>
                                        </label>
                                        <div className="h-[42px] md:h-[38px] rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700 flex items-center justify-center px-4">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-2xl md:text-xl font-bold text-blue-600 dark:text-blue-400">
                                                    {selectedMedId && dosage ? (() => {
                                                        const med = medications.find(m => m.id === selectedMedId);
                                                        const conc = parseFloat(med?.concentration_mg_ml) || 1;
                                                        const d = parseFloat(dosage) || 0;
                                                        const ml = d / conc;
                                                        return (ml * 100).toFixed(0);
                                                    })() : '0'}
                                                </span>
                                                <span className="text-sm font-medium text-blue-500 dark:text-blue-400">UI</span>
                                                {selectedMedId && dosage && (() => {
                                                    const med = medications.find(m => m.id === selectedMedId);
                                                    const conc = parseFloat(med?.concentration_mg_ml) || 1;
                                                    const d = parseFloat(dosage) || 0;
                                                    const ml = d / conc;

                                                    // Calculate cost per UI
                                                    const totalMg = parseFloat(med?.total_content_mg || med?.total_mg_per_vial) || 1;
                                                    const vialCost = parseFloat(med?.cost_per_vial || med?.cost_price) || 0;
                                                    const totalVialML = totalMg / conc;
                                                    const totalVialUI = totalVialML * 100;
                                                    const costPerUI = vialCost / totalVialUI;
                                                    const uiTotal = ml * 100;
                                                    const totalCost = uiTotal * costPerUI;

                                                    return (
                                                        <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                                                            ({ml.toFixed(2)} mL)
                                                            {vialCost > 0 && (
                                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1.5 opacity-70">
                                                                    - custo: R$ {totalCost.toFixed(2)}
                                                                </span>
                                                            )}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Weight Input */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Peso na data (kg)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={weight}
                                        onChange={(e) => setWeight(e.target.value)}
                                        className="w-full px-4 py-2.5 md:py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 outline-none text-slate-900 dark:text-white"
                                        placeholder="00.0"
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
                                            className={`py-3 md:py-2 text-sm md:text-xs font-bold rounded-lg border transition-all ${injectionSite === site
                                                ? 'bg-primary text-white border-primary shadow-md'
                                                : 'border-slate-200 text-slate-500 hover:border-primary/50'}`}
                                        >
                                            {site}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Side Selection (Left/Right) */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Lado da Aplicação</label>
                                {lastInjectionSide && (
                                    <p className="text-xs text-amber-600 mb-2 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">info</span>
                                        Última aplicação: <strong>{lastInjectionSide}</strong> — Sugerido: <strong>{lastInjectionSide === 'Direito' ? 'Esquerdo' : 'Direito'}</strong>
                                    </p>
                                )}
                                <div className="grid grid-cols-2 gap-2">
                                    {['Esquerdo', 'Direito'].map(side => (
                                        <button
                                            key={side}
                                            type="button"
                                            onClick={() => setInjectionSide(side as 'Esquerdo' | 'Direito')}
                                            className={`py-3 md:py-2.5 text-sm md:text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-2 ${injectionSide === side
                                                ? 'bg-primary text-white border-primary shadow-md'
                                                : injectionSide === ''
                                                    ? 'border-slate-200 text-slate-400 hover:border-primary/50 bg-slate-50'
                                                    : 'border-slate-200 text-slate-500 hover:border-primary/50'}`}
                                        >
                                            <span className="material-symbols-outlined text-sm">{side === 'Esquerdo' ? 'arrow_back' : 'arrow_forward'}</span>
                                            {side}
                                        </button>
                                    ))}
                                </div>
                                {injectionSide === '' && (
                                    <p className="text-[10px] text-slate-400 mt-1 italic">Primeira aplicação ou sem histórico de lado</p>
                                )}
                            </div>

                            <div className="space-y-3 md:space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Efeitos Colaterais / Reações</label>
                                    <textarea
                                        value={sideEffects}
                                        onChange={(e) => setSideEffects(e.target.value)}
                                        className="w-full px-4 py-3 md:py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 outline-none text-slate-900 dark:text-white h-20 md:h-16 resize-none text-sm"
                                        placeholder="Náuseas, dor local, etc..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Observações Gerais</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="w-full px-4 py-3 md:py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 outline-none text-slate-900 dark:text-white h-20 md:h-16 resize-none text-sm"
                                        placeholder="Dificuldades de aplicação, relatos do paciente..."
                                    />
                                </div>
                            </div>

                            {/* Payment Section */}
                            <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-slate-800 dark:to-slate-800 rounded-xl border border-emerald-200 dark:border-slate-700">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="material-symbols-outlined text-emerald-600">payments</span>
                                    <label className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Informações de Pagamento</label>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Valor da Dose</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-mono">R$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={doseValue}
                                                onChange={(e) => setDoseValue(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-slate-900 dark:text-white text-sm font-mono"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-end">
                                        <label className="flex-1 flex items-center gap-3 p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={isPaid}
                                                onChange={(e) => setIsPaid(e.target.checked)}
                                                className="w-5 h-5 text-green-600 rounded border-slate-300 focus:ring-green-500"
                                            />
                                            <div className="flex flex-col">
                                                <span className={`text-sm font-bold ${isPaid ? 'text-green-700' : 'text-slate-600'}`}>
                                                    {isPaid ? '✓ Pago' : 'Marcar como pago'}
                                                </span>
                                            </div>
                                        </label>
                                    </div>
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

                    <div className="flex flex-col md:flex-row gap-3 md:gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full md:flex-1 px-6 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !selectedPatient}
                            className="w-full md:flex-1 bg-primary hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95"
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
