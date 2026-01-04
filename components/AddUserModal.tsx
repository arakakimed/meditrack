import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserRole, User } from '../types';
import { createClient } from '@supabase/supabase-js';

interface AddUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (updatedUser?: any) => void;
    userToEdit?: User | null;
    readOnlyRole?: boolean;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose, onSuccess, userToEdit, readOnlyRole = false }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Form Fields
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<UserRole>('Staff');

    // New User Password
    const [password, setPassword] = useState('');

    // Edit User - Password Change Mode
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    // Helper para verificar se estamos editando a nós mesmos
    const [isSelfEdit, setIsSelfEdit] = useState(false);

    useEffect(() => {
        const checkSelf = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user && userToEdit && user.id === userToEdit.id) {
                    setIsSelfEdit(true);
                } else {
                    setIsSelfEdit(false);
                }
            } catch (e) { console.error(e) }
        };
        checkSelf();

        if (isOpen) {
            setError(null);
            setSuccessMsg(null);
            setIsChangingPassword(false);

            if (userToEdit) {
                // MODO EDIÇÃO
                setName(userToEdit.name);
                setEmail(userToEdit.email);
                setRole(userToEdit.role);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmNewPassword('');
            } else {
                // MODO NOVO USUÁRIO
                setName('');
                setEmail('');
                setRole('Staff');
                setPassword('');
            }
        }
    }, [isOpen, userToEdit]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            if (userToEdit) {
                // ========================== ATUALIZAR USUÁRIO ==========================

                // 1. Atualizar Profile
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({
                        name,
                        role: role.toLowerCase() // DATABASE: role lowercase (admin, staff)
                    })
                    .eq('id', userToEdit.id);

                if (updateError) throw updateError;

                // 2. Troca de Senha (se solicitado)
                if (isChangingPassword) {
                    if (newPassword !== confirmNewPassword) throw new Error('As novas senhas não coincidem.');
                    if (newPassword.length < 6) throw new Error('A senha deve ter no mínimo 6 caracteres.');

                    const { error: passError } = await supabase.auth.updateUser({
                        password: newPassword
                    });
                    if (passError) throw passError;
                }

                setSuccessMsg('Usuário atualizado com sucesso!');

                const updatedUser = {
                    ...userToEdit,
                    name,
                    role, // UI: Mantém TitleCase
                    initials: name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
                };

                setTimeout(() => {
                    onSuccess(updatedUser);
                    setLoading(false);
                    onClose();
                }, 1000);

            } else {
                // ========================== CRIAR NOVO USUÁRIO ==========================

                // Validação básica
                if (password.length < 6) throw new Error('A senha deve ter no mínimo 6 caracteres.');

                // TRUQUE DO CLIENTE TEMPORÁRIO:
                // Criamos um cliente Supabase descartável que NÃO salva cookies.
                // Isso permite criar outro usuário sem deslogar o Admin atual.
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

                const tempSupabase = createClient(supabaseUrl, supabaseKey, {
                    auth: {
                        persistSession: false, // CRÍTICO: Não salvar sessão no navegador
                        autoRefreshToken: false,
                        detectSessionInUrl: false
                    }
                });

                // 1. Criar Auth User (SignUp)
                const { data: authData, error: authError } = await tempSupabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            name: name,
                            role: role.toLowerCase()
                        }
                    }
                });

                if (authError) {
                    // Traduzir erros comuns do Supabase
                    if (authError.message?.includes('already registered')) {
                        throw new Error('Este e-mail já está cadastrado no sistema.');
                    }
                    if (authError.message?.includes('password')) {
                        throw new Error('A senha é muito fraca ou inválida.');
                    }
                    throw authError;
                }

                if (authData.user) {
                    const newUserId = authData.user.id;

                    // 2. Garantir criação do Profile
                    // (O trigger do banco deve fazer isso, mas fazemos manual para garantir dados completos)
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .upsert({ // Upsert previne erro se o trigger já tiver criado
                            id: newUserId,
                            email: email,
                            name: name,
                            role: role.toLowerCase(),
                            created_at: new Date().toISOString()
                        });

                    if (profileError) {
                        console.error("Erro ao salvar profile:", profileError);
                        // Não lançamos erro fatal aqui porque o usuário Auth foi criado
                    }

                    setSuccessMsg(`Usuário ${name} criado com sucesso!`);

                    const newUser = {
                        id: newUserId,
                        name,
                        email,
                        role,
                        status: 'Active',
                        initials: name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
                    };

                    setTimeout(() => {
                        onSuccess(newUser);
                        setLoading(false);
                        onClose();
                    }, 1000);
                }
            }

        } catch (err: any) {
            console.error('Erro ao processar:', err);
            setError(err.message || 'Erro ao processar solicitação.');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 sticky top-0 z-10 backdrop-blur-md">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-600">
                            {userToEdit ? 'edit' : 'person_add'}
                        </span>
                        {userToEdit ? 'Editar Usuário' : 'Novo Usuário'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">

                    {/* NOME */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nome Completo</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-900 dark:text-white transition-all placeholder:text-slate-400"
                            placeholder="Ex: Dra. Marcela"
                        />
                    </div>

                    {/* EMAIL */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">E-mail (Login)</label>
                        <input
                            type="email"
                            required
                            disabled={!!userToEdit} // Não permite trocar email na edição para evitar conflito de Auth
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className={`w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none text-slate-900 dark:text-white transition-all ${userToEdit ? 'opacity-60 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'}`}
                            placeholder="email@clinica.com"
                        />
                    </div>

                    {/* SENHA (MODO NOVO) */}
                    {!userToEdit && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Senha de Acesso</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-900 dark:text-white transition-all"
                                placeholder="••••••••"
                            />
                            <p className="text-xs text-slate-400 mt-1 ml-1">Mínimo de 6 caracteres.</p>
                        </div>
                    )}

                    {/* SENHA (MODO EDIÇÃO - APENAS PRÓPRIO USUÁRIO) */}
                    {userToEdit && isSelfEdit && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                            {!isChangingPassword ? (
                                <button
                                    type="button"
                                    onClick={() => setIsChangingPassword(true)}
                                    className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-2"
                                >
                                    <span className="material-symbols-outlined text-base">lock_reset</span>
                                    Alterar minha senha
                                </button>
                            ) : (
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 mt-2 animate-in slide-in-from-top-2">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Alterar Senha</h4>
                                        <button type="button" onClick={() => setIsChangingPassword(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancelar</button>
                                    </div>
                                    <input
                                        type="password"
                                        placeholder="Nova Senha"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:border-blue-500"
                                    />
                                    <input
                                        type="password"
                                        placeholder="Confirmar Nova Senha"
                                        value={confirmNewPassword}
                                        onChange={e => setConfirmNewPassword(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:border-blue-500"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* PERFIL DE ACESSO */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Perfil de Acesso
                            {readOnlyRole && <span className="ml-2 text-[10px] font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">Restrito</span>}
                        </label>
                        <select
                            value={role}
                            onChange={e => !readOnlyRole && setRole(e.target.value as UserRole)}
                            disabled={readOnlyRole}
                            className={`w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none text-slate-900 dark:text-white transition-all appearance-none ${readOnlyRole ? 'opacity-60 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'}`}
                        >
                            <option value="Staff">Equipe (Staff)</option>
                            <option value="Admin">Administrador</option>
                            <option value="Patient">Paciente</option>
                        </select>
                    </div>

                    {/* MENSAGENS DE ERRO/SUCESSO */}
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-start gap-2 animate-in slide-in-from-bottom-2">
                            <span className="material-symbols-outlined text-lg mt-0.5">error</span>
                            <span>{error}</span>
                        </div>
                    )}
                    {successMsg && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 text-green-600 dark:text-green-400 text-sm rounded-xl flex items-center gap-2 animate-in slide-in-from-bottom-2">
                            <span className="material-symbols-outlined text-lg">check_circle</span>
                            {successMsg}
                        </div>
                    )}

                    {/* BOTÕES */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[20px]">
                                        {userToEdit ? 'save' : 'person_add'}
                                    </span>
                                    {userToEdit ? 'Salvar' : 'Criar Usuário'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddUserModal;