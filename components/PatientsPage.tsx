import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import TagManagerModal, { TAG_COLORS } from './TagManagerModal';
import EnableAccessModal from './EnableAccessModal'; // <--- Importado Corretamente

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
                        Tem certeza que deseja remover <strong>{patientName}</strong>? Todos os dados serão deletados permanentemente.
                    </p>
                    <div className="flex gap-3">
                        <button onClick={onClose} disabled={isDeleting} className="flex-1 px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 transition-all">Cancelar</button>
                        <button onClick={onConfirm} disabled={isDeleting} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                            {isDeleting ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <span>Excluir</span>}
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
    const [confirmDelete, setConfirmDelete] = useState<{ id: string, name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [tags, setTags] = useState<any[]>([]);
    const [selectedTagFilter, setSelectedTagFilter] = useState<string>('');
    const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);

    // Estados do Modal de Acesso
    const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
    const [selectedPatientForAccess, setSelectedPatientForAccess] = useState<any>(null);

    const fetchPatients = async () => {
        setLoading(true);
        try {
            const { data: patientsData, error: patientsError } = await supabase.from('patients').select('*').order('name', { ascending: true });
            if (patientsError) throw patientsError;

            const { data: injectionsData } = await supabase.from('injections').select('patient_id, patient_weight_at_injection, applied_at').order('applied_at', { ascending: false });

            const enhancedPatients = (patientsData || []).map(patient => {
                const patientInjections = (injectionsData || []).filter(inj => inj.patient_id === patient.id && inj.patient_weight_at_injection);
                const latestInj = patientInjections.length > 0 ? patientInjections[0] : null;
                const dynamicCurrentWeight = latestInj ? latestInj.patient_weight_at_injection : patient.initial_weight;
                return { ...patient, current_weight: dynamicCurrentWeight || 0 };
            });
            setPatients(enhancedPatients);
        } catch (err: any) {
            console.error(err);
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
            await supabase.from('upcoming_doses').delete().eq('patient_id', confirmDelete.id);
            await supabase.from('financial_records').delete().eq('patient_id', confirmDelete.id);
            await supabase.from('injections').delete().eq('patient_id', confirmDelete.id);
            await supabase.from('patients').delete().eq('id', confirmDelete.id);
            setPatients(prev => prev.filter(p => p.id !== confirmDelete.id));
            setConfirmDelete(null);
        } catch (err: any) {
            alert('Erro ao excluir: ' + (err.message || 'Erro desconhecido'));
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredPatients = patients.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTag = selectedTagFilter ? p.tags && p.tags.includes(selectedTagFilter) : true;
        return matchesSearch && matchesTag;
    });

    return (
        <div className="flex flex-col gap-6 pb-20 md:pb-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Gestão de Pacientes</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">{patients.length} pacientes cadastrados</p>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-3">
                    <select value={selectedTagFilter} onChange={(e) => setSelectedTagFilter(e.target.value)} className="w-full md:w-auto p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm">
                        <option value="">Todas as Etiquetas</option>
                        {tags.map(tag => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
                    </select>
                    <input type="text" placeholder="Buscar por nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full md:w-64 p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm" />
                    <button onClick={onAddPatient} className="bg-primary hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg"><span className="material-symbols-outlined">add</span>Novo Paciente</button>
                    <button onClick={onManageTags} className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-600 rounded-xl"><span className="material-symbols-outlined">label_important</span></button>
                </div>
            </div>

            <div className="flex flex-col gap-3">
                {filteredPatients.map((patient) => {
                    const isExpanded = expandedPatientId === patient.id;
                    return (
                        <div key={patient.id} id={`patient-card-${patient.id}`} className={`bg-white dark:bg-slate-800 rounded-2xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-primary/50 shadow-lg' : 'border-slate-200 dark:border-slate-700 shadow-sm'}`}>
                            <div onClick={() => { setExpandedPatientId(isExpanded ? null : patient.id); }} className="p-4 flex items-center justify-between cursor-pointer active:bg-slate-50 dark:active:bg-slate-700/50">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-700 font-bold text-primary">
                                        {patient.avatar_url ? <img src={patient.avatar_url} className="h-full w-full object-cover rounded-full" /> : patient.initials}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white">{patient.name}</h3>
                                        <span className="text-xs text-slate-400">ID: {patient.id.substring(0, 8)}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-black text-blue-600">{patient.current_weight}<span className="text-xs text-slate-400 ml-1">kg</span></div>
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 p-5">
                                    <div className="grid grid-cols-4 gap-2 pt-2">
                                        {/* BOTÃO VERDE DE ACESSO */}
                                        <button onClick={(e) => { e.stopPropagation(); setSelectedPatientForAccess(patient); setIsAccessModalOpen(true); }} className="col-span-1 flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-emerald-600 text-white shadow-lg active:scale-95 transition-all hover:bg-emerald-700">
                                            <span className="material-symbols-outlined text-2xl">lock_open</span>
                                            <span className="text-[10px] font-bold uppercase">Acesso</span>
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); onViewPatient(patient); }} className="col-span-1 flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-violet-600 text-white shadow-lg active:scale-95 transition-all hover:bg-violet-700">
                                            <span className="material-symbols-outlined text-2xl">visibility</span>
                                            <span className="text-[10px] font-bold uppercase">Ver</span>
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); onEditPatient(patient); }} className="col-span-1 flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-blue-600 text-white shadow-lg active:scale-95 transition-all hover:bg-blue-700">
                                            <span className="material-symbols-outlined text-2xl">edit</span>
                                            <span className="text-[10px] font-bold uppercase">Editar</span>
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({ id: patient.id, name: patient.name }); }} className="col-span-1 flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-rose-500 text-white shadow-lg active:scale-95 transition-all hover:bg-rose-600">
                                            <span className="material-symbols-outlined text-2xl">delete</span>
                                            <span className="text-[10px] font-bold uppercase">Excluir</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <DeleteConfirmationModal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={handleDelete} patientName={confirmDelete?.name || ''} isDeleting={isDeleting} />

            {/* Modal de Acesso */}
            <EnableAccessModal
                isOpen={isAccessModalOpen}
                onClose={() => setIsAccessModalOpen(false)}
                patient={selectedPatientForAccess}
                onSuccess={() => fetchPatients()}
            />
        </div>
    );
};

export default PatientsPage;