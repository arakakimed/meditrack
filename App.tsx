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

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!session) {
        return <AuthPage onAuthSuccess={() => { }} />;
    }

    const handleViewPatient = (patientOrId: any) => {
        if (typeof patientOrId === 'string') {
            const patient = mockPatients.find(p => p.id === patientOrId);
            if (patient) {
                setSelectedPatient(patient);
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
        };
        setSelectedPatient(mappedPatient);
        setView('patientProfile');
    };

    const handleBackToPatients = () => {
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
    };

    const renderContent = () => {
        const commonProps = {
            onAddPatient: () => setIsAddPatientModalOpen(true),
            onManageTags: () => setIsTagManagerOpen(true)
        };

        switch (view) {
            case 'dashboard':
                return <DashboardPage onViewPatient={handleViewPatient} onAdministerDose={handleOpenDoseModal} {...commonProps} />;
            case 'patientProfile':
                return selectedPatient ? <PatientProfilePage patient={selectedPatient} onBack={handleBackToPatients} onGoHome={() => setView('dashboard')} /> : <div>Paciente não encontrado.</div>;
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
                return <DashboardPage onViewPatient={handleViewPatient} onAdministerDose={handleOpenDoseModal} />;
        }
    };

    return (
        <ErrorBoundary>
            <Layout view={view} setView={setView} onOpenGlobalDose={() => setIsGlobalDoseModalOpen(true)}>
                {renderContent()}
            </Layout>
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
        </ErrorBoundary>
    );
};

export default App;
