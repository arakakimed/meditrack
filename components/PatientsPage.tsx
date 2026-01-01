import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Patient } from '../types';
import { TAG_COLORS } from './TagManagerModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import FeedbackModal from './FeedbackModal';

interface PatientsPageProps {
    onViewPatient: (patient: Patient) => void;
    onEditPatient: (patient: Patient) => void;
    onAddPatient: () => void;
    onManageTags: () => void;
}

// Modal de Acesso Liberado
const AccessGrantedModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    patientName: string;
    email: string;
}> = ({ isOpen, onClose, patientName, email }) => {
    const [copied, setCopied] = useState(false);
    const password = 'Mudar@123';

    const whatsappMessage = `Olá ${patientName.split(' ')[0]}! 👋

Seu acesso ao *MediTrack* foi liberado! 🎉

📱 *Dados de Acesso:*
• Login: ${email}
• Senha: ${password}

Baixe o app e faça login para acompanhar seu tratamento.

_Importante: Troque sua senha no primeiro acesso._`;

    const handleCopy = () => {
        navigator.clipboard.writeText(whatsappMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header com sucesso */}
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="material-symbols-outlined text-4xl text-white">check_circle</span>
                    </div>
                    <h2 className="text-xl font-bold text-white">Acesso Liberado!</h2>
                    <p className="text-emerald-100 text-sm mt-1">{patientName}</p>
                </div>

                {/* Credenciais */}
                <div className="p-6 space-y-4">
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-400 uppercase">Login</span>
                            <span className="text-sm font-mono font-medium text-slate-900 dark:text-white">{email}</span>
                        </div>
                        <div className="border-t border-slate-200 dark:border-slate-600" />
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-400 uppercase">Senha Provisória</span>
                            <span className="text-sm font-mono font-bold text-emerald-600">{password}</span>
                        </div>
                    </div>

                    <p className="text-xs text-slate-500 text-center">
                        O paciente deve trocar a senha no primeiro acesso.
                    </p>
                </div>

                {/* Ações */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-4 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        Fechar
                    </button>
                    <button
                        onClick={handleCopy}
                        className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${copied
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20'
                            }`}
                    >
                        <span className="material-symbols-outlined text-lg">{copied ? 'done' : 'content_copy'}</span>
                        {copied ? 'Copiado!' : 'Copiar Mensagem'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Modal de Input de E-mail
const EmailInputModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (email: string) => void;
    patientName: string;
    loading: boolean;
}> = ({ isOpen, onClose, onSubmit, patientName, loading }) => {
    const [email, setEmail] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                        <span className="material-symbols-outlined text-2xl">mail</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">E-mail Necessário</h3>
                        <p className="text-sm text-slate-500">{patientName}</p>
                    </div>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Para liberar o acesso, precisamos do e-mail do paciente.
                </p>

                <input
                    type="email"
                    placeholder="paciente@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                    autoFocus
                />

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 py-3 px-4 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onSubmit(email)}
                        disabled={!email || loading}
                        className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
                        ) : (
                            <span className="material-symbols-outlined text-lg">check</span>
                        )}
                        Salvar e Liberar
                    </button>
                </div>
            </div>
        </div>
    );
};

const PatientsPage: React.FC<PatientsPageProps> = ({
    onViewPatient,
    onEditPatient,
    onAddPatient,
    onManageTags
}) => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [allClinicTags, setAllClinicTags] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTagId, setSelectedTagId] = useState<string>('Todas');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);

    // Modals state
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [accessGrantedModal, setAccessGrantedModal] = useState(false);
    const [accessPatient, setAccessPatient] = useState<Patient | null>(null);

    const [emailInputModal, setEmailInputModal] = useState(false);

    // Feedback Modal state
    const [feedbackModal, setFeedbackModal] = useState<{
        isOpen: boolean;
        type: 'success' | 'error' | 'warning' | 'info';
        title: string;
        message: string;
        details?: string;
        actionLabel?: string;
        actionPatient?: Patient;
    }>({ isOpen: false, type: 'info', title: '', message: '' });
    const [emailPatient, setEmailPatient] = useState<Patient | null>(null);
    const [accessLoading, setAccessLoading] = useState(false);

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
                    tags: p.tags || [],
                    user_id: p.user_id,
                    access_granted: p.access_granted || false
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
            <span
                key={tagId}
                className={`inline-flex items-center justify-center h-5 px-2.5 rounded text-[9px] font-black uppercase tracking-wide ${colorConfig.bg} ${colorConfig.text} ${colorConfig.border} border`}
            >
                {tagInfo.name}
            </span>
        );
    };

    const handleCardClick = (patientId: string) => {
        setExpandedPatientId(prev => prev === patientId ? null : patientId);
    };

    // Handle Delete
    const handleDeleteClick = (patient: Patient) => {
        setPatientToDelete(patient);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!patientToDelete) return;
        setDeleteLoading(true);
        try {
            const { error } = await supabase.from('patients').delete().eq('id', patientToDelete.id);
            if (error) throw error;
            setPatients(prev => prev.filter(p => p.id !== patientToDelete.id));
            setDeleteModalOpen(false);
            setPatientToDelete(null);
        } catch (error) {
            console.error('Erro ao excluir paciente:', error);
            alert('Erro ao excluir paciente.');
        } finally {
            setDeleteLoading(false);
        }
    };

    // Handle Access
    const handleAccessClick = async (patient: Patient) => {
        if (!patient.email) {
            // Precisa cadastrar e-mail primeiro
            setEmailPatient(patient);
            setEmailInputModal(true);
            return;
        }

        // Tem e-mail, libera o acesso
        await grantAccess(patient, patient.email);
    };

    const handleEmailSubmit = async (email: string) => {
        if (!emailPatient) return;
        setAccessLoading(true);

        try {
            // Salva o e-mail no paciente
            const { error: updateError } = await supabase
                .from('patients')
                .update({ email })
                .eq('id', emailPatient.id);

            if (updateError) {
                // Tratamento específico de erros
                if (updateError.code === '23505') {
                    // Unique constraint violation
                    alert('Este e-mail já está em uso por outro paciente. Por favor, use um e-mail diferente.');
                    return;
                } else if (updateError.code === 'PGRST204' || updateError.message?.includes('column')) {
                    // Coluna não existe
                    alert('Erro de configuração: A coluna "email" não existe na tabela. Execute a migração SQL no Supabase.');
                    console.error('SQL necessário: ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS email TEXT;');
                    return;
                } else {
                    throw updateError;
                }
            }

            // Atualiza localmente
            setPatients(prev => prev.map(p =>
                p.id === emailPatient.id ? { ...p, email } : p
            ));

            // Libera o acesso
            await grantAccess({ ...emailPatient, email }, email);

            setEmailInputModal(false);
            setEmailPatient(null);
        } catch (error: any) {
            console.error('Erro ao salvar e-mail:', error);
            alert(`Erro ao salvar e-mail: ${error?.message || 'Erro desconhecido'}`);
        } finally {
            setAccessLoading(false);
        }
    };

    const grantAccess = async (patient: Patient, email: string) => {
        setAccessLoading(true);
        const defaultPassword = 'Mudar@123';

        try {
            // Usar Auth API oficial do Supabase
            // IMPORTANTE: Desabilite "Confirm email" em Authentication > Providers > Email
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: email.toLowerCase().trim(),
                password: defaultPassword,
                options: {
                    data: { patient_id: patient.id, name: patient.name, role: 'patient' }
                }
            });

            if (authError) {
                // Se usuário já existe, apenas atualizar vínculo
                if (authError.message?.includes('already registered') || authError.message?.includes('already exists')) {
                    await supabase.from('patients').update({ email: email.toLowerCase().trim() }).eq('id', patient.id);
                    setAccessPatient({ ...patient, email });
                    setAccessGrantedModal(true);
                    return;
                }
                throw authError;
            }

            // Atualizar paciente com user_id
            await supabase.from('patients').update({
                email: email.toLowerCase().trim(),
                user_id: authData?.user?.id,
                access_granted: true,
                access_granted_at: new Date().toISOString()
            }).eq('id', patient.id);

            // Atualiza lista local com status de acesso
            setPatients(prev => prev.map(p =>
                p.id === patient.id
                    ? { ...p, email: email.toLowerCase().trim(), user_id: authData?.user?.id, access_granted: true }
                    : p
            ));

            // Mostra modal de sucesso
            setAccessPatient({ ...patient, email });
            setAccessGrantedModal(true);

        } catch (error: any) {
            console.error('Erro ao liberar acesso:', error);

            if (error.message?.includes('rate limit') || error.message?.includes('429')) {
                setFeedbackModal({
                    isOpen: true,
                    type: 'warning',
                    title: 'Muitas Tentativas',
                    message: 'Aguarde alguns minutos e tente novamente.',
                    details: error.message,
                    actionLabel: 'Tentar Novamente',
                    actionPatient: patient
                });
            } else if (error.message?.includes('invalid')) {
                setFeedbackModal({
                    isOpen: true,
                    type: 'error',
                    title: 'E-mail Inválido',
                    message: 'O e-mail informado não é válido. Por favor, corrija e tente novamente.',
                    details: error.message,
                    actionLabel: 'Corrigir E-mail',
                    actionPatient: patient
                });
            } else {
                setFeedbackModal({
                    isOpen: true,
                    type: 'error',
                    title: 'Erro ao Liberar Acesso',
                    message: 'Não foi possível liberar o acesso. Tente novamente.',
                    details: error.message,
                    actionLabel: 'Tentar Novamente',
                    actionPatient: patient
                });
            }
        } finally {
            setAccessLoading(false);
        }
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

            {/* Barra de Filtros - Grid Responsivo */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {/* Botão "Todas" */}
                <button
                    onClick={() => setSelectedTagId('Todas')}
                    className={`h-10 w-full rounded-xl text-xs font-bold border-2 transition-all duration-200 flex items-center justify-center active:scale-95 ${selectedTagId === 'Todas'
                        ? 'bg-slate-800 text-white border-slate-800 shadow-lg shadow-slate-800/20'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
                        }`}
                >
                    Todas
                </button>

                {/* Tags dinâmicas */}
                {allClinicTags.map(tag => {
                    const tagColor = TAG_COLORS.find(c => c.name === tag.color);
                    const isActive = selectedTagId === tag.id;

                    return (
                        <button
                            key={tag.id}
                            onClick={() => setSelectedTagId(tag.id)}
                            className={`h-10 w-full rounded-xl text-xs font-bold border-2 transition-all duration-200 flex items-center justify-center active:scale-95 ${isActive
                                ? 'shadow-lg'
                                : 'hover:shadow-md'
                                }`}
                            style={{
                                backgroundColor: isActive ? tagColor?.hex : (tagColor?.hex + '10'),
                                color: isActive ? 'white' : tagColor?.hex,
                                borderColor: isActive ? tagColor?.hex : (tagColor?.hex + '40'),
                                boxShadow: isActive ? `0 4px 14px ${tagColor?.hex}30` : undefined
                            }}
                        >
                            {tag.name}
                        </button>
                    );
                })}
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
                                        {patient.avatarUrl ? <img src={patient.avatarUrl} className="w-full h-full object-cover" alt="" /> : patient.initials}
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
                                    <div className="p-4 pt-3 border-t border-slate-100 bg-slate-50/50">
                                        {/* Grid de Botões Refatorado */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            {/* Ver Prontuário */}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onViewPatient(patient); }}
                                                className="h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                            >
                                                <span className="material-symbols-outlined text-lg">visibility</span>
                                                <span className="hidden sm:inline">Ver Prontuário</span>
                                                <span className="sm:hidden">Ver</span>
                                            </button>

                                            {/* Editar */}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onEditPatient(patient); }}
                                                className="h-12 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                            >
                                                <span className="material-symbols-outlined text-lg">edit</span>
                                                Editar
                                            </button>

                                            {/* Acesso */}
                                            {(() => {
                                                const isAccessGranted = !!(patient.email && patient.user_id);
                                                return (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleAccessClick(patient); }}
                                                        disabled={accessLoading}
                                                        className={`h-12 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 ${isAccessGranted
                                                                ? 'bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300'
                                                                : 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300'
                                                            }`}
                                                    >
                                                        <span className="material-symbols-outlined text-lg">
                                                            {isAccessGranted ? 'verified_user' : 'lock_open'}
                                                        </span>
                                                        {isAccessGranted ? 'Liberado' : 'Acesso'}
                                                    </button>
                                                );
                                            })()}

                                            {/* Excluir */}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(patient); }}
                                                className="h-12 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 hover:border-red-300 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                            >
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                                Excluir
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal de Confirmação de Exclusão */}
            <ConfirmDeleteModal
                isOpen={deleteModalOpen}
                onClose={() => { setDeleteModalOpen(false); setPatientToDelete(null); }}
                onConfirm={confirmDelete}
                itemName={patientToDelete?.name || ''}
                loading={deleteLoading}
            />

            {/* Modal de E-mail */}
            <EmailInputModal
                isOpen={emailInputModal}
                onClose={() => { setEmailInputModal(false); setEmailPatient(null); }}
                onSubmit={handleEmailSubmit}
                patientName={emailPatient?.name || ''}
                loading={accessLoading}
            />

            {/* Modal de Acesso Liberado */}
            <AccessGrantedModal
                isOpen={accessGrantedModal}
                onClose={() => { setAccessGrantedModal(false); setAccessPatient(null); }}
                patientName={accessPatient?.name || ''}
                email={accessPatient?.email || ''}
            />

            {/* Modal de Feedback (Erros/Avisos) */}
            <FeedbackModal
                isOpen={feedbackModal.isOpen}
                onClose={() => setFeedbackModal(prev => ({ ...prev, isOpen: false }))}
                type={feedbackModal.type}
                title={feedbackModal.title}
                message={feedbackModal.message}
                details={feedbackModal.details}
                actionLabel={feedbackModal.actionLabel}
                onAction={feedbackModal.actionPatient ? () => {
                    setEmailPatient(feedbackModal.actionPatient!);
                    setEmailInputModal(true);
                } : undefined}
            />
        </div>
    );
};

export default PatientsPage;