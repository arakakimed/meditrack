import React, { useState, useEffect } from 'react';
import { Patient, mockPatients } from './types';
import Layout from './components/Layout';
import DashboardPage from './components/DashboardPage';
import PatientProfilePage from './components/PatientProfilePage';
import FinancialsPage from './components/FinancialsPage';
import SchedulePage from './components/SchedulePage';
import MedicationsPage from './components/MedicationsPage';
import SettingsPage from './components/SettingsPage';
import AuthPage from './components/AuthPage';
import AddPatientModal from './components/AddPatientModal';
import PatientsPage from './components/PatientsPage';
import GlobalRegisterDoseModal from './components/GlobalRegisterDoseModal';
import TagManagerModal from './components/TagManagerModal';
import FirstAccessPage from './components/FirstAccessPage';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import ErrorBoundary from './components/ErrorBoundary';

export type View = 'dashboard' | 'patients' | 'schedule' | 'settings' | 'financials' | 'patientProfile' | 'medications';

const App: React.FC = () => {
    const [view, setView] = useState<View>('dashboard');
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [patientToEdit, setPatientToEdit] = useState<any | null>(null);
    const [isGlobalDoseModalOpen, setIsGlobalDoseModalOpen] = useState(false);
    const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
    const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0); // For forcing re-fetch
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [showFirstAccess, setShowFirstAccess] = useState(false);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) {
                checkUserRole(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) {
                checkUserRole(session.user.id);
            } else {
                setUserRole(null);
                setShowFirstAccess(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const checkUserRole = async (userId: string) => {
        console.log('Checking user role/status for:', userId);
        try {
            let role = null;

            // 0. SUPER ADMIN HARDCODE (God Mode)
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email === 'arakaki.med@gmail.com') {
                console.log('⚡ SUPER ADMIN DETECTED ⚡');
                role = 'Admin';
                setShowFirstAccess(false);
                setUserRole('Admin');

                // Ensure profile exists/is correct
                // Fire and forget upsert to fix DB if broken
                supabase.from('profiles').upsert({
                    id: userId,
                    email: user.email,
                    role: 'Admin',
                    name: 'SuperAdmin',
                    status: 'Active',
                    initials: 'SA'
                }).then(({ error }) => {
                    if (error) console.error('Auto-fixing SuperAdmin profile failed:', error);
                    else console.log('SuperAdmin profile auto-fixed.');
                });

                return;
            }

            // 1. Always check Profile first (Source of Truth for Roles)
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single();

            if (profile) {
                console.log('Profile Role found:', profile.role);
                role = profile.role;
            } else {
                // Backup: Check metadata if profile is missing
                console.warn('Profile not found in profiles table. Checking metadata...');
                const metaRole = user?.user_metadata?.role;
                if (metaRole === 'Admin' || metaRole === 'Staff') {
                    console.log('Role found in metadata:', metaRole);
                    role = metaRole;
                }
            }

            // 2. Decide based on Role
            if (role === 'Admin' || role === 'Staff') {
                // Admins/Staff NEVER see First Access, regardless of patients table
                setShowFirstAccess(false);
                setUserRole(role);
                // Admin stays on dashboard or whatever default view is
                return;
            }

            // 3. If standard user or patient, check/enforce Patient Record
            role = 'Patient'; // Defaulting to Patient if not admin

            const { data: patientRecord } = await supabase
                .from('patients')
                .select('id')
                .eq('user_id', userId)
                .single();

            if (patientRecord) {
                // Patient EXISTS -> Go to Profile
                setShowFirstAccess(false);
                setUserRole('Patient');

                // Fetch full data
                const { data: patient } = await supabase
                    .from('patients')
                    .select('*')
                    .eq('user_id', userId)
                    .single();

                if (patient) {
                    const mappedPatient: Patient = {
                        id: patient.id,
                        name: patient.name,
                        initials: patient.initials,
                        age: patient.age,
                        gender: patient.gender,
                        avatarUrl: patient.avatar_url,
                        currentWeight: patient.current_weight,
                        weightChange: 0,
                        bmi: patient.bmi,
                        bmiCategory: patient.bmi_category,
                        tags: patient.tags || [],
                        initialWeight: patient.initial_weight || patient.current_weight,
                        targetWeight: patient.target_weight,
                        height: patient.height
                    };
                    setSelectedPatient(mappedPatient);
                    setView('patientProfile');
                }

            } else {
                // Patient MISSING -> Show First Access
                console.log('User is not Admin and has no patient record -> First Access');
                setShowFirstAccess(true);
                setUserRole('Patient'); // Tentative role
            }

        } catch (error) {
            console.error('Error checking user role:', error);
            // On error, safest to default to standard view or error state, but let's leave as is to avoid lockout
        } finally {
            setLoading(false);
        }
    };


    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!session) {
        return <AuthPage onAuthSuccess={() => { /* State handled by onAuthStateChange */ }} />;
    }

    // New User / First Access Flow
    if (showFirstAccess) {
        return <FirstAccessPage onSuccess={() => checkUserRole(session.user.id)} />;
    }

    const handleViewPatient = async (patientOrId: any) => {
        if (typeof patientOrId === 'string') {
            // Fetch patient from Supabase by ID
            const { data: patient, error } = await supabase
                .from('patients')
                .select('*')
                .eq('id', patientOrId)
                .single();

            if (error) {
                console.error('Error fetching patient:', error);
                return;
            }

            if (patient) {
                const mappedPatient: Patient = {
                    id: patient.id,
                    name: patient.name,
                    initials: patient.initials,
                    age: patient.age,
                    gender: patient.gender,
                    avatarUrl: patient.avatar_url,
                    currentWeight: patient.current_weight,
                    weightChange: patient.weight_change || 0,
                    bmi: patient.bmi,
                    bmiCategory: patient.bmi_category,
                    tags: patient.tags || [],
                    initialWeight: patient.initial_weight || patient.current_weight,
                    targetWeight: patient.target_weight,
                    height: patient.height
                };
                setSelectedPatient(mappedPatient);
                setView('patientProfile');
            }
            return;
        }

        const patient = patientOrId;
        // Map from DB schema to frontend types
        const mappedPatient: Patient = {
            id: patient.id,
            name: patient.name,
            initials: patient.initials,
            age: patient.age,
            gender: patient.gender,
            avatarUrl: patient.avatar_url,
            currentWeight: patient.current_weight,
            weightChange: patient.weight_change || 0,
            bmi: patient.bmi,
            bmiCategory: patient.bmi_category,
            tags: patient.tags || [],
            initialWeight: patient.initial_weight || patient.current_weight,
            targetWeight: patient.target_weight,
            height: patient.height
        };
        setSelectedPatient(mappedPatient);
        setView('patientProfile');
    };

    const handleBackToPatients = () => {
        if (userRole === 'Patient') return; // Prevent patients from going back
        setView('patients');
        setSelectedPatient(null);
    }

    const handleOpenDoseModal = (patient: Patient) => {
        // Now using GlobalRegisterDoseModal instead of old RegisterDoseModal
        setIsGlobalDoseModalOpen(true);
    };

    const handleEditPatient = (patient: any) => {
        setPatientToEdit(patient);
        setIsAddPatientModalOpen(true);
    };

    const handlePatientActionSuccess = () => {
        setRefreshKey(prev => prev + 1);
        setIsAddPatientModalOpen(false);
        setPatientToEdit(null);
        // Dispatch global event for other components (like PatientProfilePage) to refresh
        window.dispatchEvent(new CustomEvent('global-dose-added'));

        // If patient, re-fetch self to update UI
        if (userRole === 'Patient' && session) {
            checkUserRole(session.user.id);
        }
    };

    const renderContent = () => {
        const commonProps = {
            onAddPatient: () => setIsAddPatientModalOpen(true),
            onManageTags: () => setIsTagManagerOpen(true)
        };

        switch (view) {
            case 'dashboard':
                return <DashboardPage
                    onViewPatient={handleViewPatient}
                    onAdministerDose={handleOpenDoseModal}
                    onAddPatient={() => setIsAddPatientModalOpen(true)}
                    setView={setView}
                    {...commonProps}
                />;
            case 'patientProfile':
                return selectedPatient ? <PatientProfilePage patient={selectedPatient} onBack={handleBackToPatients} onGoHome={() => userRole !== 'Patient' && setView('dashboard')} isPatientView={userRole === 'Patient'} /> : <div>Paciente não encontrado.</div>;
            case 'financials':
                return <FinancialsPage />;
            case 'patients':
                return <PatientsPage key={refreshKey} onViewPatient={handleViewPatient} onEditPatient={handleEditPatient} {...commonProps} />;
            case 'schedule':
                return <SchedulePage onViewPatient={handleViewPatient} />;
            case 'medications':
                return <MedicationsPage />;
            case 'settings':
                return <SettingsPage />;
            default:
                return <DashboardPage
                    onViewPatient={handleViewPatient}
                    onAdministerDose={handleOpenDoseModal}
                    onAddPatient={() => setIsAddPatientModalOpen(true)}
                    setView={setView}
                />;
        }
    };

    return (
        <ErrorBoundary>
            <Layout
                view={view}
                setView={setView}
                onOpenGlobalDose={() => setIsGlobalDoseModalOpen(true)}
                onViewPatient={userRole === 'Patient' ? undefined : handleViewPatient}
                userRole={userRole} // Pass user role
            >
                {renderContent()}
            </Layout>

            {/* Modal Logic */}
            {/* Hide global add dose/patient for patients generally */}
            {userRole !== 'Patient' && (
                <>
                    <GlobalRegisterDoseModal
                        isOpen={isGlobalDoseModalOpen}
                        onClose={() => setIsGlobalDoseModalOpen(false)}
                        onSuccess={handlePatientActionSuccess}
                    />
                    <AddPatientModal
                        isOpen={isAddPatientModalOpen}
                        patientToEdit={patientToEdit}
                        onClose={() => {
                            setIsAddPatientModalOpen(false);
                            setPatientToEdit(null);
                        }}
                        onSuccess={handlePatientActionSuccess}
                        onManageTags={() => setIsTagManagerOpen(true)}
                    />
                    <TagManagerModal
                        isOpen={isTagManagerOpen}
                        onClose={() => {
                            setIsTagManagerOpen(false);
                            setRefreshKey(prev => prev + 1);
                        }}
                    />
                </>
            )}
        </ErrorBoundary>
    );
};

export default App;
