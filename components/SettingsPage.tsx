
import React, { useState } from 'react';
import { mockUsers, mockProfiles, User, Profile, UserStatus, UserRole } from '../types';

const ProfileCard: React.FC<{ profile: Profile }> = ({ profile }) => (
    <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-start gap-4">
        <div className="p-3 rounded-full bg-primary/10 text-primary">
            <span className="material-symbols-outlined text-2xl">{profile.icon}</span>
        </div>
        <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{profile.role}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{profile.description}</p>
        </div>
        <button className="mt-auto text-sm font-medium text-primary hover:underline">Editar Permissões</button>
    </div>
);

const UserManagementTable: React.FC<{ users: User[], onUserUpdate: (users: User[]) => void }> = ({ users, onUserUpdate }) => {
    
    const approveUser = (id: string) => {
        onUserUpdate(users.map(u => u.id === id ? { ...u, status: 'Active' } : u));
    };

    const removeUser = (id: string) => {
        onUserUpdate(users.filter(u => u.id !== id));
    };
    
    const declineUser = (id: string) => {
         onUserUpdate(users.map(u => u.id === id ? { ...u, status: 'Inactive' } : u));
    };

    const getStatusBadge = (status: UserStatus) => {
        const baseClasses = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";
        switch (status) {
            case 'Active':
                return <span className={`${baseClasses} bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300`}>Ativo</span>;
            case 'Pending':
                return <span className={`${baseClasses} bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300`}>Pendente</span>;
            case 'Inactive':
                return <span className={`${baseClasses} bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300`}>Inativo</span>;
        }
    };
    
    const getRoleBadge = (role: UserRole) => {
        const baseClasses = "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium";
        switch (role) {
            case 'Admin':
                return <span className={`${baseClasses} bg-primary/10 text-primary`}>Admin</span>;
            case 'Staff':
                return <span className={`${baseClasses} bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300`}>Equipe</span>;
            case 'Patient':
                 return <span className={`${baseClasses} bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300`}>Paciente</span>;
        }
    }
    
    return (
        <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-surface-light dark:bg-surface-dark shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            <th className="px-6 py-4 text-left text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Usuário</th>
                            <th className="px-6 py-4 text-left text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Perfil</th>
                            <th className="px-6 py-4 text-left text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-right text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        {user.avatarUrl ? (
                                            <div className="size-10 rounded-full bg-cover bg-center" style={{ backgroundImage: `url(${user.avatarUrl})`}}></div>
                                        ) : (
                                            <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500">{user.initials}</div>
                                        )}
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white">{user.name}</p>
                                            <p className="text-sm text-slate-500">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                                <td className="px-6 py-4">{getStatusBadge(user.status)}</td>
                                <td className="px-6 py-4 text-right">
                                    {user.status === 'Pending' ? (
                                        <div className="flex gap-2 justify-end">
                                            <button onClick={() => approveUser(user.id)} className="px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-100 rounded-lg hover:bg-green-200">Aprovar</button>
                                            <button onClick={() => declineUser(user.id)} className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-100 rounded-lg hover:bg-red-200">Recusar</button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2 justify-end">
                                            <button className="p-2 text-slate-500 hover:text-primary"><span className="material-symbols-outlined text-lg">edit</span></button>
                                            <button onClick={() => removeUser(user.id)} className="p-2 text-slate-500 hover:text-red-500"><span className="material-symbols-outlined text-lg">delete</span></button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}


const SettingsPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>(mockUsers);

    return (
        <div className="flex-1 max-w-[1440px] mx-auto w-full space-y-12">
            <section>
                <div className="flex flex-col md:flex-row flex-wrap justify-between gap-4 mb-8">
                    <div className="flex min-w-72 flex-col gap-2">
                        <h1 className="text-slate-900 dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">Perfis de Usuário</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-base font-normal leading-normal">Defina níveis de acesso e permissões para cada perfil.</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {mockProfiles.map(profile => <ProfileCard key={profile.role} profile={profile} />)}
                </div>
            </section>

            <section>
                 <div className="flex flex-col md:flex-row flex-wrap justify-between gap-4 mb-8">
                    <div className="flex min-w-72 flex-col gap-2">
                        <h2 className="text-slate-900 dark:text-white text-3xl font-black leading-tight tracking-[-0.033em]">Gerenciamento de Usuários</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-base font-normal leading-normal">Adicione, remova e aprove novos usuários no sistema.</p>
                    </div>
                     <button className="flex min-w-[84px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30">
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        <span className="truncate">Adicionar Usuário</span>
                    </button>
                </div>
                <UserManagementTable users={users} onUserUpdate={setUsers} />
            </section>
        </div>
    );
};

export default SettingsPage;
