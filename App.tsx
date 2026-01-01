import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Patient } from './types';

import AuthPage from './components/AuthPage';
import DashboardPage from './components/DashboardPage';
import PatientsPage from './components/PatientsPage';
import SchedulePage from './components/SchedulePage';
import MedicationsPage from './components/MedicationsPage';
import FinancialsPage from './components/FinancialsPage';
import PatientProfilePage from './components/PatientProfilePage';
import SettingsPage from './components/SettingsPage';
import AddPatientModal from './components/AddPatientModal';
import TagManagerModal from './components/TagManagerModal';

export type View = 'dashboard' | 'patients' | 'schedule' | 'medications' | 'financials' | 'settings' | 'patient_profile';

const App: React.FC = () => {
    const [session, setSession] = useState<any>(null);
    const [userRole, setUserRole] = useState<'admin' | 'staff' | 'patient' | 'unauthorized' | null>(null);
    const [patientData, setPatientData] = useState<Patient | null>(null);
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [loading, setLoading] = useState(true);

    const [adminViewingPatient, setAdminViewingPatient] = useState<Patient | null>(null);

    const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
    const [isTagModalOpen, setIsTagModalOpen] = useState(false);
    const [patientToEdit, setPatientToEdit] = useState<Patient | undefined>(undefined);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) checkUserRole(session.user.id);
            else setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) {
                checkUserRole(session.user.id);
            } else {
                setUserRole(null);
                setPatientData(null);
                setAdminViewingPatient(null);
                setCurrentView('dashboard');
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const checkUserRole = async (userId: string) => {
        setLoading(true);
        try {
            const { data: profile, error } = await supabase.from('profiles').select('role, patient_id').eq('id', userId).single();
            if (error || !profile) {
                setUserRole('unauthorized');
            } else {
                setUserRole(profile.role as any);
                if (profile.role === 'patient' && profile.patient_id) {
                    const { data: patient } = await supabase.from('patients').select('*').eq('id', profile.patient_id).single();
                    if (patient) setPatientData(mapDatabasePatient(patient));
                }
            }
        } catch (err) {
            setUserRole('unauthorized');
        } finally {
            setLoading(false);
        }
    };

    const mapDatabasePatient = (data: any): Patient => ({
        id: data.id,
        name: data.name,
        initials: data.initials,
        age: data.age,
        gender: data.gender,
        avatarUrl: data.avatar_url,
        currentWeight: data.current_weight,
        initialWeight: data.initial_weight,
        weightChange: data.weight_change,
        targetWeight: data.target_weight,
        height: data.height,
        bmi: data.bmi,
        bmiCategory: data.bmi_category,
        email: data.email,
        tags: data.tags
    });

    const handleLogout = async () => { await supabase.auth.signOut(); };

    const handleAddPatient = () => {
        setPatientToEdit(undefined);
        setIsPatientModalOpen(true);
    };

    const handleEditPatient = (patient: Patient) => {
        setPatientToEdit(patient);
        setIsPatientModalOpen(true);
    };

    // --- FUNÇÃO DE LIBERAÇÃO DE ACESSO (RESTAURADA) ---
    const handleToggleAccess = async (patient: Patient) => {
        if (!patient.email) {
            alert("O paciente precisa de um e-mail cadastrado para ter acesso.");
            return;
        }

        const defaultPassword = "Mudar@123";
        const confirmMessage = `Deseja liberar ou resetar o acesso para ${patient.name}?\n\nLogin: ${patient.email}\nSenha padrão: ${defaultPassword}`;

        if (window.confirm(confirmMessage)) {
            try {
                const { error } = await supabase.rpc('handle_patient_access', {
                    p_patient_id: patient.id,
                    p_email: patient.email,
                    p_password: defaultPassword
                });

                if (error) throw error;
                alert("Acesso configurado com sucesso! O paciente já pode logar.");
            } catch (err: any) {
                console.error("Erro ao liberar acesso:", err);
                alert("Erro ao liberar acesso. Verifique o console para detalhes.");
            }
        }
    };

    // --- FUNÇÃO DE EXCLUSÃO DE PACIENTE (CONFIRMAÇÃO PADRÃO) ---
    const handleDeletePatient = async (patient: Patient) => {
        if (window.confirm(`Tem certeza absoluta que deseja excluir o paciente ${patient.name}? Todos os registros de peso e doses serão perdidos.`)) {
            try {
                const { error } = await supabase.from('patients').delete().eq('id', patient.id);
                if (error) throw error;
                alert("Paciente removido com sucesso.");
                // Força atualização da vista para limpar o excluído da lista
                setCurrentView('dashboard');
                setTimeout(() => setCurrentView('patients'), 10);
            } catch (err: any) {
                alert("Erro ao excluir: " + err.message);
            }
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;
    if (!session) return <AuthPage />;
    if (userRole === 'unauthorized') return <div className="p-10 text-center">Acesso não configurado. <button onClick={handleLogout}>Sair</button></div>;

    if (userRole === 'patient') {
        if (!patientData) return <div className="p-10 text-center">Carregando...</div>;
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 relative">
                <div className="absolute top-4 right-4 z-50">
                    <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-md shadow-sm border border-slate-200 rounded-full text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all">
                        <span className="material-symbols-outlined text-sm">logout</span> Sair
                    </button>
                </div>
                <PatientProfilePage patient={patientData} onBack={() => { }} onGoHome={() => { }} readonly={true} />
            </div>
        );
    }

    const renderAdminContent = () => {
        if (adminViewingPatient) {
            return (
                <PatientProfilePage
                    patient={adminViewingPatient}
                    onBack={() => setAdminViewingPatient(null)}
                    onGoHome={() => { setAdminViewingPatient(null); setCurrentView('dashboard'); }}
                    readonly={false}
                />
            );
        }

        switch (currentView) {
            case 'dashboard':
                return <DashboardPage
                    onViewPatient={(p) => setAdminViewingPatient(p)}
                    onAdministerDose={() => { }}
                    onAddPatient={handleAddPatient}
                    setView={setCurrentView}
                />;
            case 'patients':
                return <PatientsPage
                    onViewPatient={(patient) => setAdminViewingPatient(patient)}
                    onEditPatient={handleEditPatient}
                    onAddPatient={handleAddPatient}
                    onManageTags={() => setIsTagModalOpen(true)}
                />;
            case 'schedule': return <SchedulePage />;
            case 'medications': return <MedicationsPage />;
            case 'financials': return <FinancialsPage />;
            case 'settings': return <SettingsPage />;
            default: return <DashboardPage setView={setCurrentView} onViewPatient={() => { }} onAdministerDose={() => { }} onAddPatient={handleAddPatient} />;
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
            <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-20">
                <div className="p-6 flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">M</div>
                    <span className="text-xl font-bold text-slate-800 dark:text-white">MediTrack</span>
                </div>
                <nav className="flex-1 px-4 space-y-1 overflow-y-auto py-4">
                    <SidebarItem icon="dashboard" label="Painel" active={currentView === 'dashboard' && !adminViewingPatient} onClick={() => { setAdminViewingPatient(null); setCurrentView('dashboard'); }} />
                    <SidebarItem icon="group" label="Pacientes" active={currentView === 'patients' || !!adminViewingPatient} onClick={() => { setAdminViewingPatient(null); setCurrentView('patients'); }} />
                    <SidebarItem icon="calendar_month" label="Agenda" active={currentView === 'schedule'} onClick={() => { setAdminViewingPatient(null); setCurrentView('schedule'); }} />
                    <SidebarItem icon="medication" label="Medicações" active={currentView === 'medications'} onClick={() => { setAdminViewingPatient(null); setCurrentView('medications'); }} />
                    <SidebarItem icon="payments" label="Financeiro" active={currentView === 'financials'} onClick={() => { setAdminViewingPatient(null); setCurrentView('financials'); }} />
                    <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700">
                        <SidebarItem icon="settings" label="Configurações" active={currentView === 'settings'} onClick={() => { setAdminViewingPatient(null); setCurrentView('settings'); }} />
                    </div>
                </nav>
                <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                    <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"><span className="material-symbols-outlined">logout</span> <span className="font-medium text-sm">Sair</span></button>
                </div>
            </aside>

            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 flex justify-around p-2 pb-safe z-50">
                <MobileNavItem icon="dashboard" label="Painel" active={currentView === 'dashboard' && !adminViewingPatient} onClick={() => { setAdminViewingPatient(null); setCurrentView('dashboard'); }} />
                <MobileNavItem icon="group" label="Pacientes" active={currentView === 'patients' || !!adminViewingPatient} onClick={() => { setAdminViewingPatient(null); setCurrentView('patients'); }} />
                <MobileNavItem icon="calendar_month" label="Agenda" active={currentView === 'schedule'} onClick={() => { setAdminViewingPatient(null); setCurrentView('schedule'); }} />
                <MobileNavItem icon="settings" label="Ajustes" active={currentView === 'settings'} onClick={() => { setAdminViewingPatient(null); setCurrentView('settings'); }} />
            </div>

            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                <header className="md:hidden h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 flex-shrink-0 z-10">
                    <span className="font-bold text-slate-800">MediTrack Admin</span>
                    <button onClick={handleLogout}><span className="material-symbols-outlined text-slate-500">logout</span></button>
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

const SidebarItem: React.FC<any> = ({ icon, label, active, onClick }) => (
    <button onClick={onClick} className={`flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-all ${active ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><span className={`material-symbols-outlined text-[22px] ${active ? 'fill-current' : ''}`}>{icon}</span><span className="text-sm">{label}</span></button>
);
const MobileNavItem: React.FC<any> = ({ icon, label, active, onClick }) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-16 gap-1 ${active ? 'text-blue-600' : 'text-slate-400'}`}><span className={`material-symbols-outlined text-2xl ${active ? 'fill-current' : ''}`}>{icon}</span><span className="text-[10px] font-bold">{label}</span></button>
);

export default App;