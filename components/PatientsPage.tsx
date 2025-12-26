import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
}

const PatientsPage: React.FC<PatientsPageProps> = ({ onViewPatient, onEditPatient, onAddPatient }) => {
    const [patients, setPatients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string, name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchPatients = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setPatients(data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPatients();
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

    const filteredPatients = patients.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getBMICategoryStyle = (category: string) => {
        switch (category) {
            case 'Normal': return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
            case 'Overweight': case 'Sobrepeso': return 'bg-amber-50 text-amber-700 ring-amber-600/20';
            case 'Obese': case 'Obesidade': return 'bg-rose-50 text-rose-700 ring-rose-600/20';
            default: return 'bg-slate-50 text-slate-700 ring-slate-600/20';
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Gestão de Pacientes</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {patients.length} {patients.length === 1 ? 'paciente cadastrado' : 'pacientes cadastrados'}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative flex-1 min-w-[240px]">
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
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Paciente</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Idade / Gênero</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Peso Atual</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Evolução / Meta</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold text-primary">IMC</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                            <span className="text-sm font-medium">Carregando pacientes...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredPatients.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="material-symbols-outlined text-4xl">person_search</span>
                                            <span className="text-sm font-medium">Nenhum paciente encontrado.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredPatients.map((patient) => (
                                    <tr key={patient.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                    {patient.avatar_url ? (
                                                        <img src={patient.avatar_url} alt="" className="h-10 w-10 rounded-full" />
                                                    ) : (
                                                        <span>{patient.initials}</span>
                                                    )}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{patient.name}</div>
                                                    <div className="text-xs text-slate-500">ID: {patient.id.substring(0, 8)}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-slate-900 dark:text-white">{patient.age} anos</div>
                                            <div className={`mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${patient.gender === 'Female' ? 'text-rose-500' : 'text-blue-500'}`}>
                                                <span className="material-symbols-outlined text-[14px] leading-none">
                                                    {patient.gender === 'Female' ? 'female' : 'male'}
                                                </span>
                                                <span>{patient.gender === 'Female' ? 'Feminino' : 'Masculino'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{patient.current_weight}</span>
                                                    <span className="text-[10px] font-medium text-slate-400 lowercase">kg</span>
                                                </div>
                                                <div className={`flex items-center gap-0.5 text-[10px] font-bold ${(patient.initial_weight - patient.current_weight) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    <span className="material-symbols-outlined text-[14px]">{(patient.initial_weight - patient.current_weight) >= 0 ? 'trending_down' : 'trending_up'}</span>
                                                    {Math.abs(patient.initial_weight - patient.current_weight).toFixed(1)} kg total
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap min-w-[180px]">
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-bold">
                                                    <span className="text-emerald-500 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[14px]">flag</span>
                                                        Meta: {patient.target_weight}kg
                                                    </span>
                                                    <span className="text-slate-400 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                                                        {Math.floor((new Date().getTime() - new Date(patient.created_at).getTime()) / (1000 * 60 * 60 * 24))} dias
                                                    </span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-600/30">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-1000"
                                                        style={{
                                                            width: `${Math.min(100, Math.max(0, ((patient.initial_weight - patient.current_weight) / (patient.initial_weight - patient.target_weight)) * 100))}%`
                                                        }}
                                                    ></div>
                                                </div>
                                                <div className="text-[9px] text-slate-400 text-right font-medium italic">
                                                    {Math.max(0, (patient.current_weight - patient.target_weight)).toFixed(1)}kg restantes
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <div className="text-sm font-bold text-slate-900 dark:text-white leading-none">{patient.bmi}</div>
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold ring-1 ring-inset w-fit ${getBMICategoryStyle(patient.bmi_category)}`}>
                                                    {patient.bmi_category === 'Overweight' ? 'Sobrepeso' :
                                                        patient.bmi_category === 'Obese' ? 'Obesidade' :
                                                            patient.bmi_category === 'Underweight' ? 'Abaixo do Peso' :
                                                                patient.bmi_category}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => onViewPatient(patient)}
                                                    className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                                    title="Visualizar Perfil"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">visibility</span>
                                                </button>
                                                <button
                                                    onClick={() => onEditPatient(patient)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                                                    title="Editar"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDelete({ id: patient.id, name: patient.name })}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                    title="Excluir"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
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
