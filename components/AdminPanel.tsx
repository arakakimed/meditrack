import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Patient } from '../types';
import { useAuth } from '../contexts/AuthContext';

import DashboardPage from './DashboardPage';
import PatientsPage from './PatientsPage';
import SchedulePage from './SchedulePage';
import MedicationsPage from './MedicationsPage';
import FinancialsPage from './FinancialsPage';
import PatientProfilePage from './PatientProfilePage';
import SettingsPage from './SettingsPage';
import AddPatientModal from './AddPatientModal';
import TagManagerModal from './TagManagerModal';

// Adicionei 'users' para a tela de gestão de equipe
export type View = 'dashboard' | 'patients' | 'schedule' | 'medications' | 'financials' | 'settings' | 'users';

const AdminPanel: React.FC = () => {
    const { signOut, role } = useAuth(); // Pegamos a role aqui

    // Verifica se é Admin (TitleCase)
    const isAdmin = role === 'Admin';

    // View inicial: Admin vê dashboard, Staff vê pacientes
    const [currentView, setCurrentView] = useState<View>(isAdmin ? 'dashboard' : 'patients');
    const [adminViewingPatient, setAdminViewingPatient] = useState<Patient | null>(null);

    const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
    const [isTagModalOpen, setIsTagModalOpen] = useState(false);
    const [patientToEdit, setPatientToEdit] = useState<Patient | undefined>(undefined);

    const handleAddPatient = () => {
        setPatientToEdit(undefined);
        setIsPatientModalOpen(true);
    };

    const handleEditPatient = (patient: Patient) => {
        setPatientToEdit(patient);
        setIsPatientModalOpen(true);
    };

    const renderAdminContent = () => {
        if (adminViewingPatient) {
            return (
                <PatientProfilePage
                    patient={adminViewingPatient}
                    onBack={() => setAdminViewingPatient(null)}
                    onGoHome={() => { setAdminViewingPatient(null); setCurrentView('dashboard'); }}
                    readonly={false}
                    isAdmin={true} // Staff também é "admin" no sentido de poder editar prontuário
                    showFinancials={role === 'Admin'} // Financeiro restrito ao Admin principal
                />
            );
        }

        switch (currentView) {
            case 'dashboard':
                return <DashboardPage
                    onViewPatient={(p: Patient) => setAdminViewingPatient(p)}
                    onAdministerDose={() => { }}
                    onAddPatient={handleAddPatient}
                    setView={setCurrentView}
                />;
            case 'patients':
                return <PatientsPage
                    onViewPatient={(patient: Patient) => setAdminViewingPatient(patient)}
                    onEditPatient={handleEditPatient}
                    onAddPatient={handleAddPatient}
                    onManageTags={() => setIsTagModalOpen(true)}
                />;
            case 'schedule': return <SchedulePage onViewPatient={(patientId: string) => {
                const findAndViewPatient = async () => {
                    const { data: patient } = await supabase.from('patients').select('*').eq('id', patientId).single();
                    if (patient) {
                        setAdminViewingPatient({
                            ...patient,
                            avatarUrl: patient.avatar_url,
                            initials: patient.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
                        });
                    }
                };
                findAndViewPatient();
            }} />;

            // --- BLOQUEIOS DE SEGURANÇA NA RENDERIZAÇÃO ---
            case 'medications':
                return isAdmin ? <MedicationsPage /> : <div className="p-8 text-center text-slate-500">Acesso Restrito ao Admin</div>;
            case 'financials':
                return isAdmin ? <FinancialsPage /> : <div className="p-8 text-center text-slate-500">Acesso Restrito ao Admin</div>;
            case 'settings':
                return isAdmin ? <SettingsPage /> : <div className="p-8 text-center text-slate-500">Acesso Restrito ao Admin</div>;

            // --- GESTÃO DE USUÁRIOS (AGORA RESTRITO AO ADMIN) ---
            case 'users':
                // Se for staff tentando acessar, mostra bloqueio ou apenas Dashboard
                // Para consistência, bloqueamos aqui também
                return isAdmin ? <SettingsPage defaultTab="users" readOnlySettings={true} /> : <div className="p-8 text-center text-slate-500">Acesso Restrito ao Admin</div>;

            default: return <DashboardPage setView={setCurrentView} onViewPatient={() => { }} onAdministerDose={() => { }} onAddPatient={handleAddPatient} />;
        }
    };

    const handleLogout = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error('Logout error:', error);
            // Force reload/clear if needed
            window.location.href = '/';
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
            {/* SIDEBAR DESKTOP */}
            <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-20">
                {/* ... existing header ... */}
                <div className="p-6 flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">M</div>
                    <span className="text-xl font-bold text-slate-800 dark:text-white">MediTrack</span>
                </div>
                {/* ... nav ... */}
                <nav className="flex-1 px-4 space-y-1 overflow-y-auto py-4">
                    {/* Admin: Todos os itens */}
                    {isAdmin && (
                        <>
                            <SidebarItem icon="dashboard" label="Painel" active={currentView === 'dashboard' && !adminViewingPatient} onClick={() => { setAdminViewingPatient(null); setCurrentView('dashboard'); }} />
                            <SidebarItem icon="group" label="Pacientes" active={currentView === 'patients' || !!adminViewingPatient} onClick={() => { setAdminViewingPatient(null); setCurrentView('patients'); }} />
                            <SidebarItem icon="calendar_month" label="Agenda" active={currentView === 'schedule'} onClick={() => { setAdminViewingPatient(null); setCurrentView('schedule'); }} />
                            <SidebarItem icon="medication" label="Medicações" active={currentView === 'medications'} onClick={() => { setAdminViewingPatient(null); setCurrentView('medications'); }} />
                            <SidebarItem icon="payments" label="Financeiro" active={currentView === 'financials'} onClick={() => { setAdminViewingPatient(null); setCurrentView('financials'); }} />
                            <SidebarItem icon="manage_accounts" label="Usuários" active={currentView === 'users'} onClick={() => { setAdminViewingPatient(null); setCurrentView('users'); }} />
                            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700">
                                <SidebarItem icon="settings" label="Configurações" active={currentView === 'settings'} onClick={() => { setAdminViewingPatient(null); setCurrentView('settings'); }} />
                            </div>
                        </>
                    )}

                    {/* Staff: Apenas Pacientes e Agenda */}
                    {!isAdmin && (
                        <>
                            <SidebarItem icon="group" label="Pacientes" active={currentView === 'patients' || !!adminViewingPatient} onClick={() => { setAdminViewingPatient(null); setCurrentView('patients'); }} />
                            <SidebarItem icon="calendar_month" label="Agenda" active={currentView === 'schedule'} onClick={() => { setAdminViewingPatient(null); setCurrentView('schedule'); }} />
                        </>
                    )}
                </nav>
                <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="px-4 pb-2 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                        {role === 'Admin' ? 'Administrador' : 'Equipe Médica'}
                    </div>
                    <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
                        <span className="material-symbols-outlined">logout</span>
                        <span className="font-medium text-sm">Sair</span>
                    </button>
                </div>
            </aside>

            {/* SIDEBAR MOBILE (Menu Inferior) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 z-50 safe-area-bottom">
                <div className={`grid ${isAdmin ? 'grid-cols-5' : 'grid-cols-2'} gap-2 px-4 py-3`}>
                    {/* Admin: Dashboard + Pacientes + Agenda + Finanças + Ajustes */}
                    {isAdmin && (
                        <>
                            <MobileNavItem icon="dashboard" label="Painel" active={currentView === 'dashboard' && !adminViewingPatient} onClick={() => { setAdminViewingPatient(null); setCurrentView('dashboard'); }} />
                            <MobileNavItem icon="group" label="Pacientes" active={currentView === 'patients' || !!adminViewingPatient} onClick={() => { setAdminViewingPatient(null); setCurrentView('patients'); }} />
                            <MobileNavItem icon="calendar_month" label="Agenda" active={currentView === 'schedule'} onClick={() => { setAdminViewingPatient(null); setCurrentView('schedule'); }} />
                            <MobileNavItem icon="payments" label="Finanças" active={currentView === 'financials'} onClick={() => { setAdminViewingPatient(null); setCurrentView('financials'); }} />
                            <MobileNavItem icon="settings" label="Ajustes" active={currentView === 'settings' || currentView === 'users'} onClick={() => { setAdminViewingPatient(null); setCurrentView('settings'); }} />
                        </>
                    )}

                    {/* Staff: Apenas Pacientes + Agenda */}
                    {!isAdmin && (
                        <>
                            <MobileNavItem icon="group" label="Pacientes" active={currentView === 'patients' || !!adminViewingPatient} onClick={() => { setAdminViewingPatient(null); setCurrentView('patients'); }} />
                            <MobileNavItem icon="calendar_month" label="Agenda" active={currentView === 'schedule'} onClick={() => { setAdminViewingPatient(null); setCurrentView('schedule'); }} />
                        </>
                    )}
                </div>
            </div>

            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                <header className="md:hidden h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 flex-shrink-0 z-10">
                    <span className="font-bold text-slate-800">
                        {isAdmin ? 'MediTrack Admin' : 'MediTrack Staff'}
                    </span>
                    <button
                        onClick={handleLogout}
                        className="p-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors"
                        aria-label="Sair"
                    >
                        <span className="material-symbols-outlined text-slate-500">logout</span>
                    </button>
                </header>
                <div className="flex-1 overflow-y-auto p-0">{renderAdminContent()}</div>
            </main>

            {isPatientModalOpen && (
                <AddPatientModal
                    isOpen={isPatientModalOpen}
                    onClose={() => setIsPatientModalOpen(false)}
                    onSuccess={() => { setIsPatientModalOpen(false); }}
                    patientToEdit={patientToEdit}
                />
            )}

            {isTagModalOpen && (
                <TagManagerModal
                    isOpen={isTagModalOpen}
                    onClose={() => setIsTagModalOpen(false)}
                />
            )}
        </div>
    );
};

// Componentes Auxiliares (SidebarItem, MobileNavItem) continuam iguais...
const SidebarItem: React.FC<any> = ({ icon, label, active, onClick }) => (
    <button onClick={onClick} className={`flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-all ${active ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><span className={`material-symbols-outlined text-[22px] ${active ? 'fill-current' : ''}`}>{icon}</span><span className="text-sm">{label}</span></button>
);

const MobileNavItem: React.FC<any> = ({ icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center py-1.5 gap-0.5 rounded-lg transition-colors ${active
            ? 'text-blue-600 bg-blue-50'
            : 'text-slate-400 hover:text-slate-600'
            }`}
    >
        <span className={`material-symbols-outlined text-xl ${active ? 'font-semibold' : ''}`}>{icon}</span>
        <span className="text-[9px] font-semibold leading-tight truncate max-w-full px-0.5">{label}</span>
    </button>
);

export default AdminPanel;