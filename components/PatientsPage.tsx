import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Patient } from '../types';
import { TAG_COLORS } from './TagManagerModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import FeedbackModal from './FeedbackModal';

// Utility function to convert HEX color to RGBA with transparency
const hexToRgba = (hex: string, alpha: number): string => {
    // Remove # if present
    const cleanHex = hex.replace('#', '');

    // Parse hex values
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);

    // Return rgba string
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Default color for patients without tags
const DEFAULT_TAG_COLOR = {
    name: 'Slate',
    hex: '#64748b',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200'
};

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
    const [pendingPatients, setPendingPatients] = useState<Patient[]>([]);
    const [allClinicTags, setAllClinicTags] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTagId, setSelectedTagId] = useState<string>('Todas');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);

    // Pending patients approval
    const [showPendingSection, setShowPendingSection] = useState(true);
    const [approvalLoading, setApprovalLoading] = useState<string | null>(null);

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

    // Refs for scroll into view when card is expanded
    const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});


    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: tagsData } = await supabase.from('clinic_tags').select('*');
            if (isMounted.current && tagsData) setAllClinicTags(tagsData);

            // Buscar TODOS os pacientes (aprovados e pendentes)
            const { data: pData, error } = await supabase.from('patients').select('*').order('name');

            if (error) throw error;

            if (isMounted.current && pData) {
                // Separar aprovados e pendentes
                const approved = pData.filter(p => p.access_granted === true || p.status === 'approved');
                const pending = pData.filter(p => p.access_granted === false && p.status === 'pending');

                setPatients(approved.map(p => ({
                    ...p,
                    id: p.id,
                    avatarUrl: p.avatar_url,
                    tags: p.tags || [],
                    user_id: p.user_id,
                    access_granted: p.access_granted || false
                })));

                setPendingPatients(pending.map(p => ({
                    ...p,
                    id: p.id,
                    avatarUrl: p.avatar_url,
                    tags: p.tags || [],
                    user_id: p.user_id,
                    access_granted: false
                })));
            }
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            // Optionally set error state here if UI handles it
        } finally {
            if (isMounted.current) setLoading(false);
        }
    }, []);

    const isMounted = useRef(true);
    useEffect(() => {
        isMounted.current = true;
        fetchData();
        return () => { isMounted.current = false; };
    }, [fetchData]);

    // ========== FUNÇÕES DE APROVAÇÃO/REJEIÇÃO ==========

    const approvePatient = async (patient: Patient) => {
        setApprovalLoading(patient.id);
        try {
            const { error } = await supabase
                .from('patients')
                .update({
                    access_granted: true,
                    status: 'approved',
                    approved_at: new Date().toISOString()
                })
                .eq('id', patient.id);

            if (error) throw error;

            // Atualizar listas locais
            setPendingPatients(prev => prev.filter(p => p.id !== patient.id));
            setPatients(prev => [...prev, { ...patient, access_granted: true }]);

            setFeedbackModal({
                isOpen: true,
                type: 'success',
                title: 'Paciente Aprovado!',
                message: `${patient.name} agora pode acessar o sistema.`
            });
        } catch (error: any) {
            console.error('Erro ao aprovar:', error);
            setFeedbackModal({
                isOpen: true,
                type: 'error',
                title: 'Erro ao Aprovar',
                message: error.message || 'Não foi possível aprovar o paciente.'
            });
        } finally {
            setApprovalLoading(null);
        }
    };

    const rejectPatient = async (patient: Patient) => {
        if (!confirm(`Tem certeza que deseja REJEITAR o cadastro de ${patient.name}? Esta ação é irreversível.`)) {
            return;
        }

        setApprovalLoading(patient.id);
        try {
            // Deletar registro do paciente
            const { error } = await supabase
                .from('patients')
                .delete()
                .eq('id', patient.id);

            if (error) throw error;

            // Atualizar lista local
            setPendingPatients(prev => prev.filter(p => p.id !== patient.id));

            setFeedbackModal({
                isOpen: true,
                type: 'warning',
                title: 'Cadastro Rejeitado',
                message: `O cadastro de ${patient.name} foi rejeitado e removido.`
            });
        } catch (error: any) {
            console.error('Erro ao rejeitar:', error);
            setFeedbackModal({
                isOpen: true,
                type: 'error',
                title: 'Erro ao Rejeitar',
                message: error.message || 'Não foi possível rejeitar o cadastro.'
            });
        } finally {
            setApprovalLoading(null);
        }
    };


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

    // Get primary color for patient based on their first tag (fully dynamic)
    const getPatientPrimaryColor = useCallback((patient: Patient) => {
        // Check if patient has tags
        if (!patient.tags || patient.tags.length === 0) {
            return DEFAULT_TAG_COLOR;
        }

        // Get the first tag ID
        const primaryTagId = patient.tags[0];

        // Find the tag info from loaded clinic tags
        const tagInfo = allClinicTags.find(t => t.id === primaryTagId);
        if (!tagInfo) {
            return DEFAULT_TAG_COLOR;
        }

        // Find the color configuration based on tag's color name
        const colorConfig = TAG_COLORS.find(c => c.name === tagInfo.color);
        if (!colorConfig) {
            return DEFAULT_TAG_COLOR;
        }

        return colorConfig;
    }, [allClinicTags]);

    const handleCardClick = useCallback((patientId: string) => {
        const isCurrentlyExpanded = expandedPatientId === patientId;

        // Toggle expansion
        setExpandedPatientId(prev => prev === patientId ? null : patientId);

        // If expanding (not collapsing), scroll into view after animation
        if (!isCurrentlyExpanded) {
            // Wait for the expansion animation to complete (300ms matches the transition duration)
            setTimeout(() => {
                const cardElement = cardRefs.current[patientId];
                if (cardElement) {
                    // Calculate if the card is near the bottom of the viewport
                    const rect = cardElement.getBoundingClientRect();
                    const viewportHeight = window.innerHeight;
                    const bottomNavHeight = 80; // Approximate height of bottom navigation

                    // Check if card bottom is below visible area (accounting for bottom nav)
                    const isCardCutOff = rect.bottom > (viewportHeight - bottomNavHeight);

                    if (isCardCutOff || rect.top < 0) {
                        cardElement.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                        });
                    }
                }
            }, 350); // Slightly longer than animation duration for safety
        }
    }, [expandedPatientId]);

    // Handle Delete
    const handleDeleteClick = (patient: Patient) => {
        setPatientToDelete(patient);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!patientToDelete) return;
        setDeleteLoading(true);

        try {
            // Verificar IDs atualizados antes de deletar
            const { data: currentPatient } = await supabase
                .from('patients')
                .select('id, user_id')
                .eq('id', patientToDelete.id)
                .single();
            const targetPatientId = currentPatient?.id || patientToDelete.id;
            const targetUserId = currentPatient?.user_id || patientToDelete.user_id;

            // 1. Tentar deletar da tabela PROFILES primeiro (para liberar a FK)

            // A) Deletar qualquer profile vinculado explicitamente pelo patient_id (CRUCIAL)
            const { error: profileFkError } = await supabase
                .from('profiles')
                .delete()
                .eq('patient_id', targetPatientId);

            if (profileFkError) console.warn('Erro ao deletar profiles por FK:', profileFkError);

            // B) Deletar profile vinculado pelo ID do usuário (se existir)
            if (targetUserId) {
                const { error: profileIdError } = await supabase
                    .from('profiles')
                    .delete()
                    .eq('id', targetUserId);
                if (profileIdError) console.warn('Erro ao deletar profiles por ID:', profileIdError);
            }

            // 2. Agora sim, deletar da tabela patients
            const { error: patientError } = await supabase
                .from('patients')
                .delete()
                .eq('id', targetPatientId);

            if (patientError) throw patientError;

            // 3. Atualizar listas locais
            setPatients(prev => prev.filter(p => p.id !== patientToDelete.id));
            setPendingPatients(prev => prev.filter(p => p.id !== patientToDelete.id));

            // 4. Feedback
            setFeedbackModal({
                isOpen: true,
                type: 'success',
                title: 'Paciente Excluído',
                message: `${patientToDelete.name} foi removido do sistema.`,
                details: targetUserId
                    ? '⚠️ Nota: O login do usuário ainda existe no Auth. Para remover completamente, acesse o Supabase Dashboard → Authentication → Users.'
                    : undefined
            });

            setDeleteModalOpen(false);
            setPatientToDelete(null);
        } catch (error: any) {
            console.error('Erro ao excluir paciente:', error);
            setFeedbackModal({
                isOpen: true,
                type: 'error',
                title: 'Erro ao Excluir',
                message: error.message || 'Não foi possível excluir o paciente.'
            });
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

    // ========== RENDERIZAÇÃO ==========
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium animate-pulse">Carregando pacientes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 pb-24 animate-in fade-in duration-300">
            <div className="flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-slate-900">Pacientes</h2>
                        {pendingPatients.length > 0 && (
                            <span className="bg-amber-500 text-white text-xs font-black px-2.5 py-1 rounded-full animate-pulse flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">notifications</span>
                                {pendingPatients.length} novo{pendingPatients.length > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
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

            {/* ========== SEÇÃO DE SOLICITAÇÕES PENDENTES ========== */}
            {pendingPatients.length > 0 && showPendingSection && (
                <div className="mb-6">
                    <div
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-t-2xl cursor-pointer"
                        onClick={() => setShowPendingSection(!showPendingSection)}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                                <span className="material-symbols-outlined text-white">person_add</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-amber-900 dark:text-amber-300">Novas Solicitações</h3>
                                <p className="text-xs text-amber-700 dark:text-amber-400">
                                    {pendingPatients.length} paciente{pendingPatients.length > 1 ? 's' : ''} aguardando aprovação
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="bg-amber-500 text-white text-sm font-black px-3 py-1 rounded-full animate-pulse">
                                {pendingPatients.length}
                            </span>
                            <span className={`material-symbols-outlined text-amber-600 transition-transform ${showPendingSection ? 'rotate-180' : ''}`}>
                                expand_more
                            </span>
                        </div>
                    </div>

                    {showPendingSection && (
                        <div className="space-y-2 p-4 bg-white dark:bg-slate-800 border-x border-b border-amber-200 dark:border-amber-800 rounded-b-2xl">
                            {pendingPatients.map(patient => (
                                <div
                                    key={patient.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-300 font-bold text-lg">
                                            {patient.initials || patient.name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white">{patient.name}</h4>
                                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                {patient.email && (
                                                    <span className="flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-sm">mail</span>
                                                        {patient.email}
                                                    </span>
                                                )}
                                                {(patient as any).phone && (
                                                    <span className="flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-sm">phone</span>
                                                        {(patient as any).phone}
                                                    </span>
                                                )}
                                                {(patient as any).requested_at && (
                                                    <span className="flex items-center gap-1 text-amber-600">
                                                        <span className="material-symbols-outlined text-sm">schedule</span>
                                                        {new Date((patient as any).requested_at).toLocaleDateString('pt-BR')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 sm:flex-shrink-0">
                                        <button
                                            onClick={() => approvePatient(patient)}
                                            disabled={approvalLoading === patient.id}
                                            className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {approvalLoading === patient.id ? (
                                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-lg">check_circle</span>
                                                    <span className="hidden sm:inline">Aprovar</span>
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => rejectPatient(patient)}
                                            disabled={approvalLoading === patient.id}
                                            className="flex-1 sm:flex-none px-4 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold text-sm rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-lg">close</span>
                                            <span className="hidden sm:inline">Rejeitar</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-3">
                {filteredPatients.map(patient => {
                    const isExpanded = expandedPatientId === patient.id;
                    const primaryColor = getPatientPrimaryColor(patient);

                    return (
                        <div
                            key={patient.id}
                            ref={(el) => { cardRefs.current[patient.id] = el; }}
                            className={`relative rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden ${isExpanded
                                ? 'shadow-xl ring-2 relative z-10 scale-[1.01]'
                                : 'hover:shadow-lg'
                                }`}
                            style={{
                                backgroundColor: hexToRgba(primaryColor.hex, 0.04),
                                borderWidth: '1px',
                                borderColor: isExpanded ? primaryColor.hex : hexToRgba(primaryColor.hex, 0.2),
                                boxShadow: isExpanded ? `0 0 0 2px ${hexToRgba(primaryColor.hex, 0.15)}` : undefined
                            }}
                        >
                            {/* Dynamic colored left accent bar */}
                            <div
                                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                                style={{ backgroundColor: primaryColor.hex }}
                            />

                            <div className="p-4 pl-5 flex items-center justify-between" onClick={() => handleCardClick(patient.id)}>
                                <div className="flex items-center gap-4">
                                    {/* Avatar with dynamic color */}
                                    <div
                                        className="w-12 h-12 rounded-full flex items-center justify-center font-bold overflow-hidden text-lg shadow-sm"
                                        style={{
                                            backgroundColor: patient.avatarUrl ? 'transparent' : hexToRgba(primaryColor.hex, 0.15),
                                            color: primaryColor.hex,
                                            border: `2px solid ${hexToRgba(primaryColor.hex, 0.3)}`
                                        }}
                                    >
                                        {patient.avatarUrl
                                            ? <img src={patient.avatarUrl} className="w-full h-full object-cover" alt="" />
                                            : patient.initials
                                        }
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">{patient.name}</h4>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {patient.tags?.map(tId => renderTagBadge(tId))}
                                        </div>
                                    </div>
                                </div>
                                <span
                                    className={`material-symbols-outlined transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}
                                    style={{ color: isExpanded ? primaryColor.hex : hexToRgba(primaryColor.hex, 0.5) }}
                                >
                                    chevron_right
                                </span>
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