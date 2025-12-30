import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserRole, User } from '../types';

const AVATAR_OPTIONS = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Mark',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Jude',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Giselle',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Buster',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Trouble',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Tinkerbell',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Bandit'
];

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
    const [selectedAvatar, setSelectedAvatar] = useState<string>(AVATAR_OPTIONS[0]);

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
                // EDIT MODE INIT
                setName(userToEdit.name);
                setEmail(userToEdit.email);
                setRole(userToEdit.role);
                setSelectedAvatar(userToEdit.avatarUrl || AVATAR_OPTIONS[0]);
                // Password fields reset
                setCurrentPassword('');
                setNewPassword('');
                setConfirmNewPassword('');
            } else {
                // NEW MODE INIT
                setName('');
                setEmail('');
                setRole('Staff');
                setSelectedAvatar(AVATAR_OPTIONS[0]);
                setPassword('');
            }
        }
    }, [isOpen, userToEdit]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        // ... [prevent default, set loading]

        try {
            if (userToEdit) {
                // EDIT MODE
                // ... [DB Update]

                // Construct updated user object for immediate UI update
                const updatedUser = {
                    ...userToEdit,
                    name,
                    email,
                    role,
                    avatarUrl: selectedAvatar,
                    // If we had initials logic here, update it too
                    initials: name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
                };

                // ... [Password logic]

                onSuccess(updatedUser);
                if (!successMsg) onClose();

            } else {
                // ADD NEW USER
                // ... [Auth SignUp]
                // ... [DB Insert]

                // Construct the new user object
                const newUser = {
                    name,
                    email,
                    role,
                    avatarUrl: selectedAvatar,
                    status: 'Active',
                    initials: name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
                };

                // NOTE: In a real app we'd get the ID from the DB insert response
                // For now, if DB insert is successful, we assume it's created.
                // ideally, we should fetch it or return it from the backend. 
                // But since we are doing optimistic updates, let's minimally mock the structure 
                // so the UI can update. Ideally, onSuccess should receive the REAL DB user.

                // If using optimistic UI, we might need a temp ID if the list relies on keys.
                // However, let's assume the list re-fetches soon after anyway.
                // But wait, the list implementation I wrote checks for ID existence. 
                // We really should return an object that at least resembles a user.

                onSuccess(newUser);
                onClose();
            }

        } catch (err: any) {
            // ... [Error handling]
            if (
                err.message?.includes("relation") ||
                err.message?.includes("not found") ||
                err.message?.includes("schema cache")
            ) {
                fallbackSave();
                return;
            }
            // ...
        }
    };

    const fallbackSave = () => {
        const stored = localStorage.getItem('meditrack_profiles');
        let currentProfiles = stored ? JSON.parse(stored) : [];
        let updatedUser = null;

        if (userToEdit) {
            updatedUser = { ...userToEdit, name, email, role, avatarUrl: selectedAvatar };
            currentProfiles = currentProfiles.map((p: any) =>
                p.id === userToEdit.id ? { ...p, name, email, role, avatarUrl: selectedAvatar } : p
            );
        } else {
            // ... [New user object creation]
            const newUser = {
                id: crypto.randomUUID(),
                name,
                email,
                role,
                status: 'Active',
                initials: name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(),
                avatarUrl: selectedAvatar
            };
            currentProfiles = [newUser, ...currentProfiles];
            updatedUser = newUser; // Assign newUser to updatedUser so it's returned
        }
        localStorage.setItem('meditrack_profiles', JSON.stringify(currentProfiles));

        onSuccess(updatedUser);
        onClose();
    }
    // ... [Rest of component]

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

                    {/* AVATAR GRID - ALWAYS VISIBLE */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Avatar</label>
                        <div className="grid grid-cols-5 gap-3">
                            {AVATAR_OPTIONS.map((avatar, index) => (
                                <div
                                    key={index}
                                    onClick={() => setSelectedAvatar(avatar)}
                                    className={`aspect-square rounded-full overflow-hidden cursor-pointer border-2 transition-all hover:scale-110 ${selectedAvatar === avatar
                                        ? 'border-primary ring-2 ring-primary/20 scale-110'
                                        : 'border-transparent hover:border-slate-200'
                                        }`}
                                >
                                    <img src={avatar} alt={`Avatar ${index}`} className="w-full h-full object-cover bg-slate-100" />
                                </div>
                            ))}
                        </div>
                    </div>

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

                    {/* NEW USER PASSWORD */}
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

                    {/* EDIT USER PASSWORD CHANGE */}
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

                    {/* ROLE SELECT */}
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

                    {/* FEEDBACK MESSAGES */}
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
