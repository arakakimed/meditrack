import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Patient } from '../types';
import { TAG_COLORS } from './TagManagerModal';

interface PatientsPageProps {
    onViewPatient: (patient: Patient) => void;
    onEditPatient: (patient: Patient) => void;
    onAddPatient: () => void;
    onManageTags: () => void;
    onToggleAccess: (patient: Patient) => void; // Esta prop deve ser tratada no App.tsx
    onDeletePatient: (patient: Patient) => void;
}

const PatientsPage: React.FC<PatientsPageProps> = ({
    onViewPatient,
    onEditPatient,
    onAddPatient,
    onManageTags,
    onToggleAccess,
    onDeletePatient
}) => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [allClinicTags, setAllClinicTags] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTagId, setSelectedTagId] = useState<string>('Todas');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: tagsData } = await supabase.from('clinic_tags').select('*');
            if (tagsData) setAllClinicTags(tagsData);

            const { data: pData } = await supabase.from('patients').select('*').order('name');
            if (pData) {
                setPatients(pData.map(p => ({
                    ...p,
                    id: p.id,
                    avatarUrl: p.avatar_url,
                    tags: p.tags || []
                })));
            }
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const filteredPatients = useMemo(() => {
        let result = patients.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesTag = selectedTagId === 'Todas' || (p.tags && p.tags.includes(selectedTagId));
            return matchesSearch && matchesTag;
        });

        return result.sort((a, b) => {
            if (sortOrder === 'asc') return a.name.localeCompare(b.name);
            return b.name.localeCompare(a.name);
        });
    }, [patients, searchTerm, selectedTagId, sortOrder]);

    const renderTagBadge = (tagId: string) => {
        const tagInfo = allClinicTags.find(t => t.id === tagId);
        if (!tagInfo) return null;
        const colorConfig = TAG_COLORS.find(c => c.name === tagInfo.color) || TAG_COLORS[4];
        return (
            <span key={tagId} className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase shadow-sm ${colorConfig.bg} ${colorConfig.text} ${colorConfig.border}`}>
                {tagInfo.name}
            </span>
        );
    };

    const handleCardClick = (patientId: string) => {
        setExpandedPatientId(prev => prev === patientId ? null : patientId);
    };

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 pb-24">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Pacientes</h2>
                    <p className="text-slate-500 text-sm">{patients.length} cadastrados</p>
                </div>
                <button onClick={onAddPatient} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all">
                    <span className="material-symbols-outlined">add</span> Novo
                </button>
            </div>

            <div className="flex gap-2">
                <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                    <input
                        type="text"
                        placeholder="Buscar paciente..."
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <button
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className={`p-3 border rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 ${sortOrder === 'asc' ? 'bg-white border-slate-200 text-slate-500 hover:text-blue-600' : 'bg-blue-50 border-blue-200 text-blue-600'}`}
                >
                    <span className="material-symbols-outlined">sort_by_alpha</span>
                </button>

                <button
                    onClick={onManageTags}
                    className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-blue-600 shadow-sm flex items-center justify-center"
                >
                    <span className="material-symbols-outlined">settings_suggest</span>
                </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 no-scrollbar">
                <button
                    onClick={() => setSelectedTagId('Todas')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${selectedTagId === 'Todas' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}
                >
                    Todas
                </button>
                {allClinicTags.map(tag => (
                    <button
                        key={tag.id}
                        onClick={() => setSelectedTagId(tag.id)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${selectedTagId === tag.id ? 'ring-2 ring-blue-500 scale-105' : 'opacity-70'}`}
                        style={{ backgroundColor: TAG_COLORS.find(c => c.name === tag.color)?.hex + '20', color: TAG_COLORS.find(c => c.name === tag.color)?.hex, borderColor: TAG_COLORS.find(c => c.name === tag.color)?.hex + '40' }}
                    >
                        {tag.name}
                    </button>
                ))}
            </div>

            <div className="space-y-3">
                {filteredPatients.map(patient => {
                    const isExpanded = expandedPatientId === patient.id;
                    return (
                        <div
                            key={patient.id}
                            className={`bg-white rounded-2xl border transition-all cursor-pointer overflow-hidden ${isExpanded ? 'shadow-lg border-blue-200 ring-1 ring-blue-100' : 'border-slate-100 hover:shadow-md'}`}
                        >
                            <div className="p-4 flex items-center justify-between" onClick={() => handleCardClick(patient.id)}>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-blue-600 font-bold border border-slate-50 overflow-hidden text-lg">
                                        {patient.avatarUrl ? <img src={patient.avatarUrl} className="w-full h-full object-cover" /> : patient.initials}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">{patient.name}</h4>
                                        <div className="flex gap-1 mt-1">
                                            {patient.tags?.map(tId => renderTagBadge(tId))}
                                        </div>
                                    </div>
                                </div>
                                <span className={`material-symbols-outlined text-slate-300 transition-transform duration-300 ${isExpanded ? 'rotate-90 text-blue-500' : ''}`}>chevron_right</span>
                            </div>

                            <div className={`grid transition-all duration-300 ease-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                <div className="overflow-hidden">
                                    <div className="p-4 pt-0 flex flex-wrap md:flex-nowrap gap-3 border-t border-slate-50 bg-slate-50/50">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onViewPatient(patient); }}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
                                        >
                                            <span className="material-symbols-outlined text-base">visibility</span>
                                            Ver Prontuário
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onEditPatient(patient); }}
                                            className="flex-1 bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-base">edit</span>
                                            Editar
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onToggleAccess(patient); }}
                                            className="flex-1 bg-emerald-50 border border-emerald-200 text-emerald-700 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-base">lock_person</span>
                                            Acesso
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDeletePatient(patient); }}
                                            className="flex-1 bg-red-50 border border-red-200 text-red-700 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-base">delete</span>
                                            Excluir
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PatientsPage;