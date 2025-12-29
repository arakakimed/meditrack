import React, { useState, useEffect } from 'react';
import AddPatientModal from './AddPatientModal';
import { supabase } from '../lib/supabase';

interface FirstAccessPageProps {
    onSuccess: () => void;
}

const FirstAccessPage: React.FC<FirstAccessPageProps> = ({ onSuccess }) => {
    const [isModalOpen, setIsModalOpen] = useState(true);

    useEffect(() => {
        const ensurePatientRole = async () => {
            // Pre-emptively ensure this user is marked as a Patient in profiles
            // This helps avoid RLS issues when inserting the patient record
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
                    if (!profile || (profile.role !== 'Admin' && profile.role !== 'Staff' && profile.role !== 'Patient')) {
                        console.log('FirstAccess: Setting user role to Patient...');
                        await supabase.from('profiles').upsert({
                            id: user.id,
                            email: user.email,
                            role: 'Patient',
                            status: 'Active',
                            name: user.user_metadata?.name || 'Novo Paciente'
                        });
                    }
                }
            } catch (err) {
                console.error('Error ensuring patient role:', err);
            }
        };
        ensurePatientRole();
    }, []);

    const handleSuccess = async () => {
        // Just call onSuccess to trigger App.tsx re-check
        // The role is likely already set by the useEffect
        onSuccess();
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-6 animate-pulse">
                    <span className="material-symbols-outlined text-primary text-4xl">waving_hand</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Bem-vindo ao MediTrack!</h1>
                <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
                    Para começar, precisamos de algumas informações para criar seu perfil de paciente.
                </p>
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-blue-600 transition-colors"
                    >
                        Completar Cadastro
                    </button>
                </div>
            </div>

            <AddPatientModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    // Optionally re-open if we want to force them
                    setTimeout(() => setIsModalOpen(true), 1000);
                }}
                onSuccess={handleSuccess}
            />
        </div>
    );
};

export default FirstAccessPage;
