import React, { useState, useEffect } from 'react';
import { UserRole, Profile } from '../types';

interface EditRoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    roleProfile: Profile | null;
    onSave: (updatedProfile: Profile) => void;
}

const EditRoleModal: React.FC<EditRoleModalProps> = ({ isOpen, onClose, roleProfile, onSave }) => {
    const [description, setDescription] = useState('');
    const [permissions, setPermissions] = useState<string[]>([]);

    // Mock permission toggle list for demonstration
    const AVAILABLE_PERMISSIONS = [
        'Visualizar Painel',
        'Gerenciar Pacientes',
        'Editar Prontuários',
        'Gerenciar Financeiro',
        'Configurações do Sistema',
        'Gerenciar Usuários'
    ];

    useEffect(() => {
        if (roleProfile) {
            setDescription(roleProfile.description);
            // In a real app, permissions would be in the profile object. 
            // We'll mock some defaults based on role if not present.
            if (roleProfile.role === 'Admin') setPermissions(AVAILABLE_PERMISSIONS);
            else if (roleProfile.role === 'Staff') setPermissions(AVAILABLE_PERMISSIONS.slice(0, 3));
            else setPermissions([AVAILABLE_PERMISSIONS[0]]);
        }
    }, [roleProfile, isOpen]);

    if (!isOpen || !roleProfile) return null;

    const togglePermission = (perm: string) => {
        setPermissions(prev =>
            prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
        );
    };

    const handleSave = () => {
        onSave({
            ...roleProfile,
            description: description
        });
        onClose();
    };

    const getRoleDisplayName = (role: string) => {
        switch (role) {
            case 'Admin': return 'Administrador';
            case 'Staff': return 'Equipe (Staff)';
            case 'Patient': return 'Paciente';
            default: return role;
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <span className="material-symbols-outlined text-xl">{roleProfile.icon}</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Editar Perfil: {getRoleDisplayName(roleProfile.role)}</h3>
                            <p className="text-xs text-slate-500">Defina as permissões de acesso</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Descrição do Perfil</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-slate-900 dark:text-white resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Permissões do Sistema</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {AVAILABLE_PERMISSIONS.map(perm => (
                                <label key={perm} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${permissions.includes(perm) ? 'bg-primary border-primary text-white' : 'border-slate-300 bg-white'}`}>
                                        {permissions.includes(perm) && <span className="material-symbols-outlined text-sm font-bold">check</span>}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={permissions.includes(perm)} onChange={() => togglePermission(perm)} />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{perm}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
                        <button onClick={handleSave} className="flex-1 bg-primary text-white font-bold py-3 rounded-xl shadow-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-transform active:scale-95">
                            Salvar Alterações
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditRoleModal;
