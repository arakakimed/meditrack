import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserRole, User } from '../types';
import { createClient } from '@supabase/supabase-js';

// Credenciais para criação de usuário secundário (sem deslogar admin)
const SUPABASE_URL = 'https://ermgwkdddilrisvycrne.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YwXkmt-TmFr6nlIbpSFecg_BGyvUoQH';

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

    // helper to check if we are editing ourselves
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
                // EDIT MODE
                setName(userToEdit.name);
                setEmail(userToEdit.email);
                setRole(userToEdit.role);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmNewPassword('');
            } else {
                // NEW MODE
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
                // ========================== UPDATE ==========================

                // 1. Atualizar Profile
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({
                        name,
                        role: role.toLowerCase() // DATABASE: role lowercase (admin, staff)
                    })
                    .eq('id', userToEdit.id);

                if (updateError) throw updateError;

                // 2. Troca de Senha
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
                    role, // UI: role TitleCase
                    initials: name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
                };

                setTimeout(() => {
                    onSuccess(updatedUser);
                    setLoading(false);
                    onClose();
                }, 1000);

            } else {
                // ========================== CREATE NEW ==========================

                // 1. Criar Auth User
                const tempSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false,
                        detectSessionInUrl: false
                    }
                });

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
                    if (authError.message?.includes('already registered')) {
                        console.warn("Usuário já existe no Auth... erro fatal para este fluxo sem backend.");
                        throw new Error('Este e-mail já está registrado em Auth. Tente outro.');
                    }
                    throw authError;
                }

                if (authData.user) {
                    const newUserId = authData.user.id;

                    // 2. Criar Profile Manualmente
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .insert({
                            id: newUserId,
                            email: email,
                            name: name,
                            role: role.toLowerCase(), // CRÍTICO: db constraint check exige lowercase
                            created_at: new Date().toISOString()
                        });

                    if (profileError) {
                        console.error("Erro ao inserir profile manual:", profileError);
                        throw new Error(`Auth criada, mas falha ao salvar perfil: ${profileError.message}`);
                    }

                    setSuccessMsg(`Usuário ${name} criado com sucesso!`);

                    const newUser = {
                        id: newUserId,
                        name,
                        email,
                        role, // UI: TitleCase
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
            console.error('Erro ao salvar:', err);
            setError(err.message || 'Erro ao processar solicitação.');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 sticky top-0 z-10 backdrop-blur-md">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{userToEdit ? 'Editar Usuário' : 'Novo Usuário'}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
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
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-slate-900 dark:text-white transition-all"
                            placeholder="Ex: Dr. João Silva"
                        />
                    </div>

                    {/* EMAIL */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">E-mail (Login)</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-slate-900 dark:text-white transition-all"
                            placeholder="email@clinica.com"
                        />
                    </div>

                    {/* SENHA (NOVO) */}
                    {!userToEdit && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Senha de Acesso</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-slate-900 dark:text-white transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    )}

                    {/* SENHA (EDITAR) */}
                    {userToEdit && isSelfEdit && (
                        <div className="pt-2">
                            {!isChangingPassword ? (
                                <button
                                    type="button"
                                    onClick={() => setIsChangingPassword(true)}
                                    className="text-sm font-bold text-primary hover:underline flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-base">lock_reset</span>
                                    Trocar Senha
                                </button>
                            ) : (
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 animate-in slide-in-from-top-2">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Alterar Senha</h4>
                                        <button type="button" onClick={() => setIsChangingPassword(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancelar</button>
                                    </div>
                                    <input
                                        type="password"
                                        placeholder="Senha Atual"
                                        value={currentPassword}
                                        onChange={e => setCurrentPassword(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                                    />
                                    <input
                                        type="password"
                                        placeholder="Nova Senha"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                                    />
                                    <input
                                        type="password"
                                        placeholder="Confirmar Nova Senha"
                                        value={confirmNewPassword}
                                        onChange={e => setConfirmNewPassword(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* ROLE */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Perfil de Acesso
                            {readOnlyRole && <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Somente Admin pode alterar</span>}
                        </label>
                        <select
                            value={role}
                            onChange={e => !readOnlyRole && setRole(e.target.value as UserRole)}
                            disabled={readOnlyRole}
                            className={`w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none text-slate-900 dark:text-white transition-all ${readOnlyRole ? 'opacity-60 cursor-not-allowed' : 'focus:ring-2 focus:ring-primary/20 focus:border-primary'
                                }`}
                        >
                            <option value="Staff">Equipe (Staff)</option>
                            <option value="Admin">Administrador</option>
                            <option value="Patient">Paciente</option>
                        </select>
                    </div>

                    {/* FEEDBACK */}
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-center gap-2 animate-in slide-in-from-bottom-2">
                            <span className="material-symbols-outlined text-lg">error</span>
                            {error}
                        </div>
                    )}
                    {successMsg && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm rounded-xl flex items-center gap-2 animate-in slide-in-from-bottom-2">
                            <span className="material-symbols-outlined text-lg">check_circle</span>
                            {successMsg}
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-3.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
                        <button type="submit" disabled={loading} className="flex-1 bg-primary text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-70 transition-transform active:scale-95">
                            {loading ? <span className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></span> : (userToEdit ? 'Salvar Alterações' : 'Adicionar Usuário')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddUserModal;
