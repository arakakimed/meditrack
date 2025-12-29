import React, { useState, useEffect } from 'react';
import { User, Profile, UserRole, UserStatus, mockUsers, mockProfiles } from '../types';
import { supabase } from '../lib/supabase';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import AddUserModal from './AddUserModal';
import EditRoleModal from './EditRoleModal';

const ProfileCard: React.FC<{ profile: Profile, onEdit: (profile: Profile) => void }> = ({ profile, onEdit }) => {
    const getRoleName = (role: string) => {
        switch (role) {
            case 'Admin': return 'Administrador';
            case 'Staff': return 'Equipe (Staff)';
            case 'Patient': return 'Paciente';
            default: return role;
        }
    };

    return (
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-start gap-4 h-full transition-transform hover:scale-[1.02] duration-300">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-2xl">{profile.icon}</span>
            </div>
            <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{getRoleName(profile.role)}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{profile.description}</p>
            </div>
            <button
                onClick={() => onEdit(profile)}
                className="mt-4 text-sm font-bold text-primary hover:text-blue-700 transition-colors flex items-center gap-1"
            >
                Editar Permissões
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
        </div>
    );
};

interface UserManagementTableProps {
    users: User[];
    onApprove: (id: string, user: User) => void;
    onReject: (id: string) => void;
    onDelete: (id: string) => void;
    onEdit: (user: User) => void;
}

const UserManagementTable: React.FC<UserManagementTableProps> = ({ users, onApprove, onReject, onDelete, onEdit }) => (
    <>
        {/* DESKTOP VIEW: Table */}
        <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700">
                        <th className="text-left py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Usuário</th>
                        <th className="text-left py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Perfil</th>
                        <th className="text-left py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="text-right py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {users.map((user) => (
                        <tr key={user.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                    {user.avatarUrl ? (
                                        <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-slate-800 shadow-sm" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300 ring-2 ring-white dark:ring-slate-800 shadow-sm">
                                            {user.initials}
                                        </div>
                                    )}
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white">{user.name}</div>
                                        <div className="text-sm text-slate-500">{user.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="py-4 px-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${user.role === 'Admin' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800' :
                                        user.role === 'Staff' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800' :
                                            'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                    }`}>
                                    {user.role}
                                </span>
                            </td>
                            <td className="py-4 px-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${user.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' :
                                        user.status === 'Pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800' :
                                            'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
                                    }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-green-500' :
                                            user.status === 'Pending' ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}></span>
                                    {user.status === 'Active' ? 'Ativo' : user.status === 'Pending' ? 'Pendente' : 'Inativo'}
                                </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    {user.status === 'Pending' ? (
                                        <>
                                            <button onClick={() => onApprove(user.id, user)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Aprovar">
                                                <span className="material-symbols-outlined text-xl">check_circle</span>
                                            </button>
                                            <button onClick={() => onReject(user.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Rejeitar">
                                                <span className="material-symbols-outlined text-xl">cancel</span>
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => onEdit(user)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors" title="Editar">
                                                <span className="material-symbols-outlined text-xl">edit_square</span>
                                            </button>
                                            <button onClick={() => onDelete(user.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                                                <span className="material-symbols-outlined text-xl">delete</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* MOBILE VIEW: Aesthetic Slider/Cards */}
        <div className="md:hidden flex flex-col gap-4">
            {users.map((user) => (
                <div key={user.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 overflow-hidden">
                        {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-white dark:ring-slate-800 shadow-sm flex-shrink-0" />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300 ring-2 ring-white dark:ring-slate-800 shadow-sm flex-shrink-0">
                                {user.initials}
                            </div>
                        )}
                        <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white truncate">{user.name}</div>
                            <div className="text-xs text-slate-500 truncate mb-1">{user.email}</div>
                            <div className="flex gap-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${user.role === 'Admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                                        user.role === 'Staff' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                    }`}>
                                    {user.role}
                                </span>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${user.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                        user.status === 'Pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                    }`}>
                                    {user.status === 'Active' ? 'Ativo' : user.status === 'Pending' ? 'Pendente' : 'Inativo'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        {user.status === 'Pending' ? (
                            <>
                                <button onClick={() => onApprove(user.id, user)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                                    <span className="material-symbols-outlined text-lg">check</span>
                                </button>
                                <button onClick={() => onReject(user.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                                    <span className="material-symbols-outlined text-lg">close</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => onEdit(user)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                    <span className="material-symbols-outlined text-lg">edit</span>
                                </button>
                                <button onClick={() => onDelete(user.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
    </>
);


const SettingsPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const [roleProfiles, setRoleProfiles] = useState<Profile[]>(mockProfiles);
    const [editingRole, setEditingRole] = useState<Profile | null>(null);
    const [isEditRoleModalOpen, setIsEditRoleModalOpen] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            // Try fetching from 'profiles'
            const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });

            if (error) {
                console.warn("Supabase profiles table missing or error, using localStorage fallback:", error);

                // FALLBACK: Load from LocalStorage
                const localData = localStorage.getItem('meditrack_profiles');
                if (localData) {
                    setUsers(JSON.parse(localData));
                } else {
                    // Initialize with Mock data if nothing in local storage
                    setUsers(mockUsers);
                    localStorage.setItem('meditrack_profiles', JSON.stringify(mockUsers));
                }
            } else {
                if (data && data.length > 0) {
                    // Map backend fields to User interface
                    const mappedUsers: User[] = data.map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        email: p.email || '',
                        role: p.role as UserRole,
                        status: p.status as UserStatus,
                        avatarUrl: p.avatar_url,
                        initials: p.initials || p.name.substring(0, 2).toUpperCase()
                    }));
                    setUsers(mappedUsers);
                } else {
                    setUsers(mockUsers);
                }
            }
        } catch (err) {
            console.error(err);
            // FALLBACK
            const localData = localStorage.getItem('meditrack_profiles');
            setUsers(localData ? JSON.parse(localData) : mockUsers);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        // Load role definitions from local storage if any
        const savedRoles = localStorage.getItem('meditrack_role_definitions');
        if (savedRoles) {
            setRoleProfiles(JSON.parse(savedRoles));
        }
    }, []);

    const handleApprove = async (id: string, user: User) => {
        // Optimistic update
        const updatedUsers = users.map(u => u.id === id ? { ...u, status: 'Active' as UserStatus } : u);
        setUsers(updatedUsers);

        // Try Supabase first
        try {
            const { error } = await supabase.from('profiles').update({ status: 'Active' }).eq('id', id);
            if (error) throw error;
        } catch (err) {
            console.warn("Could not update Supabase, updating localStorage", err);
            // Fallback: Update localStorage
            localStorage.setItem('meditrack_profiles', JSON.stringify(updatedUsers));
        }
    };

    const handleReject = async (id: string) => {
        const updatedUsers = users.filter(u => u.id !== id);
        setUsers(updatedUsers);

        try {
            const { error } = await supabase.from('profiles').delete().eq('id', id);
            if (error) throw error;
        } catch (err) {
            console.warn("Could not delete from Supabase, updating localStorage", err);
            localStorage.setItem('meditrack_profiles', JSON.stringify(updatedUsers));
        }
    };

    const handleDeleteClick = (id: string) => {
        setUserToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        setDeleteLoading(true);
        try {
            // Optimistic
            const updatedUsers = users.filter(u => u.id !== userToDelete);

            const { error } = await supabase.from('profiles').delete().eq('id', userToDelete);
            if (error) {
                console.warn("Supabase delete failed (using fallback):", error);
                // Fallback to localStorage
                localStorage.setItem('meditrack_profiles', JSON.stringify(updatedUsers));
            }

            setUsers(updatedUsers);
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
        } catch (err) {
            console.error(err);
            // Even on crash, ensure local state is consistent
            const updatedUsers = users.filter(u => u.id !== userToDelete);
            setUsers(updatedUsers);
            localStorage.setItem('meditrack_profiles', JSON.stringify(updatedUsers));
            setIsDeleteModalOpen(false);
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleEditUser = (user: User) => {
        setEditingUser(user);
        setIsAddUserModalOpen(true);
    };

    const handleEditRole = (roleProfile: Profile) => {
        setEditingRole(roleProfile);
        setIsEditRoleModalOpen(true);
    };

    const saveRoleUpdate = (updatedProfile: Profile) => {
        const updatedRoles = roleProfiles.map(p => p.role === updatedProfile.role ? updatedProfile : p);
        setRoleProfiles(updatedRoles);
        localStorage.setItem('meditrack_role_definitions', JSON.stringify(updatedRoles));
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header section... */}

            {/* Profiles Section */}
            <section className="space-y-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Perfis de Usuário</h2>
                    <p className="text-slate-500 dark:text-slate-400">Defina níveis de acesso e permissões para cada perfil.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {roleProfiles.map((profile) => (
                        <ProfileCard key={profile.role} profile={profile} onEdit={handleEditRole} />
                    ))}
                </div>
            </section>

            <div className="h-px bg-slate-200 dark:bg-slate-700/50"></div>

            {/* User Management Section */}
            <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gerenciamento de Usuários</h2>
                        <p className="text-slate-500 dark:text-slate-400">Adicione, remova e aprove novos usuários no sistema.</p>
                    </div>
                    <button
                        onClick={() => { setEditingUser(null); setIsAddUserModalOpen(true); }}
                        className="bg-primary hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">add</span>
                        Adicionar Usuário
                    </button>
                </div>

                <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                            <span className="animate-spin h-8 w-8 border-4 border-primary/20 border-t-primary rounded-full mb-4"></span>
                            Carregando usuários...
                        </div>
                    ) : (
                        <UserManagementTable
                            users={users}
                            onApprove={handleApprove}
                            onReject={handleReject}
                            onDelete={handleDeleteClick}
                            onEdit={handleEditUser}
                        />
                    )}
                </div>
            </section>

            <ConfirmDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Excluir Usuário"
                description="Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita."
                isLoading={deleteLoading}
            />

            <AddUserModal
                isOpen={isAddUserModalOpen}
                onClose={() => { setIsAddUserModalOpen(false); setEditingUser(null); }}
                onSuccess={fetchUsers}
                userToEdit={editingUser}
            />

            <EditRoleModal
                isOpen={isEditRoleModalOpen}
                onClose={() => setIsEditRoleModalOpen(false)}
                roleProfile={editingRole}
                onSave={saveRoleUpdate}
            />
        </div>
    );
};

export default SettingsPage;
