import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Patient } from '../types';
import EditMedicationStepModal from './EditMedicationStepModal';

interface NewAppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const NewAppointmentModal: React.FC<NewAppointmentModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [showResults, setShowResults] = useState(false);

    // For Step Modal
    const [isStepModalOpen, setIsStepModalOpen] = useState(false);
    const [nextOrderIndex, setNextOrderIndex] = useState(0);

    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
            setPatients([]);
            setSelectedPatient(null);
            setShowResults(false);
            setIsStepModalOpen(false);
        }
    }, [isOpen]);

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

    const handleSelectPatient = async (patient: Patient) => {
        setSelectedPatient(patient);
        setShowResults(false);

        // Fetch next order index for this patient
        const { data } = await supabase
            .from('medication_steps')
            .select('order_index')
            .eq('patient_id', patient.id)
            .order('order_index', { ascending: false })
            .limit(1);

        const lastIndex = data && data.length > 0 ? data[0].order_index : 0;
        setNextOrderIndex(lastIndex + 1);

        // Open the Step Modal immediately
        setIsStepModalOpen(true);
    };

    const handleStepSuccess = () => {
        setIsStepModalOpen(false);
        onSuccess(); // Refresh calendar
        onClose(); // Close this modal
    };

    if (!isOpen) return null;

    // If step modal is open, we just show it. 
    // Since EditMedicationStepModal is "fixed inset-0", it will cover this modal.
    // Ideally we might want to hide this one, but keeping it rendered is fine.

    return (
        <>
            <div className="fixed inset-0 z-[105] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
                <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Novo Agendamento</h3>
                            <p className="text-xs text-slate-500">Selecione o paciente para agendar uma nova etapa</p>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <div className="p-6 h-[400px]">
                        <div className="relative" ref={searchRef}>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Buscar Paciente</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined">search</span>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setShowResults(true);
                                    }}
                                    onFocus={() => setShowResults(true)}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 outline-none text-slate-900 dark:text-white"
                                    placeholder="Digite o nome..."
                                    autoFocus
                                />
                            </div>

                            {showResults && patients.length > 0 && (
                                <div className="absolute z-10 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-[250px] overflow-y-auto">
                                    {patients.map(p => (
                                        <div
                                            key={p.id}
                                            onClick={() => handleSelectPatient(p)}
                                            className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 last:border-0"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                                                {p.initials}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{p.name}</p>
                                                <p className="text-xs text-slate-500">Última: {p.currentWeight}kg</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {searchQuery.length > 1 && patients.length === 0 && showResults && (
                                <div className="mt-4 text-center text-slate-500 text-sm">
                                    Nenhum paciente encontrado.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {selectedPatient && (
                <EditMedicationStepModal
                    isOpen={isStepModalOpen}
                    onClose={() => setIsStepModalOpen(false)}
                    onSuccess={handleStepSuccess}
                    patientId={selectedPatient.id}
                    nextOrderIndex={nextOrderIndex}
                />
            )}
        </>
    );
};

export default NewAppointmentModal;
