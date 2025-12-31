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

export type View = 'dashboard' | 'patients' | 'schedule' | 'medications' | 'financials' | 'settings' | 'patient_profile';

const App: React.FC = () => {
    const [session, setSession] = useState<any>(null);
    const [userRole, setUserRole] = useState<'admin' | 'staff' | 'patient' | 'unauthorized' | null>(null);
    const [patientData, setPatientData] = useState<Patient | null>(null);
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [loading, setLoading] = useState(true);

    // Estado para quando o Admin visualiza um paciente
    const [adminViewingPatient, setAdminViewingPatient] = useState<Patient | null>(null);

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
                    if (patient) setPatientData({
                        id: patient.id,
                        name: patient.name,
                        initials: patient.initials,
                        age: patient.age,
                        gender: patient.gender,
                        avatarUrl: patient.avatar_url,
                        currentWeight: patient.current_weight,
                        initialWeight: patient.initial_weight,
                        weightChange: patient.weight_change,
                        targetWeight: patient.target_weight,
                        height: patient.height,
                        bmi: patient.bmi,
                        bmiCategory: patient.bmi_category,
                        email: patient.email
                    });
                }
            }
        } catch (err) {
            setUserRole('unauthorized');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => { await supabase.auth.signOut(); };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;
    if (!session) return <AuthPage />;
    if (userRole === 'unauthorized') return <div className="p-10 text-center">Acesso não configurado. <button onClick={handleLogout}>Sair</button></div>;

    // ROTA PACIENTE (Visualização Única)
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

    // ROTA ADMIN (Layout Completo)
    const renderAdminContent = () => {
        // Se estiver vendo um paciente, renderiza AQUI DENTRO para manter o layout
        if (adminViewingPatient) {
            return (
                <PatientProfilePage
                    patient={adminViewingPatient}
                    onBack={() => setAdminViewingPatient(null)}
                    onGoHome={() => { setAdminViewingPatient(null); setCurrentView('dashboard'); }}
                    readonly={false} // Admin tem poder total
                />
            );
        }

        switch (currentView) {
            case 'dashboard': return <DashboardPage onViewPatient={(p) => setCurrentView('patients')} onAdministerDose={() => { }} onAddPatient={() => setCurrentView('patients')} setView={setCurrentView} />;
            case 'patients': return <PatientsPage onViewPatient={(patient) => setAdminViewingPatient(patient)} onEditPatient={() => { }} onAddPatient={() => { }} onManageTags={() => { }} />;
            case 'schedule': return <SchedulePage />;
            case 'medications': return <MedicationsPage />;
            case 'financials': return <FinancialsPage />;
            case 'settings': return <SettingsPage />;
            default: return <DashboardPage setView={setCurrentView} onViewPatient={() => { }} onAdministerDose={() => { }} onAddPatient={() => { }} />;
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
            {/* Sidebar Desktop */}
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
                    <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700"><SidebarItem icon="settings" label="Configurações" active={currentView === 'settings'} onClick={() => { setAdminViewingPatient(null); setCurrentView('settings'); }} /></div>
                </nav>
                <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                    <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"><span className="material-symbols-outlined">logout</span> <span className="font-medium text-sm">Sair</span></button>
                </div>
            </aside>

            {/* Mobile Nav */}
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