import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Patient } from '../types';
import { useAuth } from '../contexts/AuthContext';
import PatientProfilePage from './PatientProfilePage';

const PatientPanel: React.FC = () => {
    const { user, signOut } = useAuth();
    const [patientData, setPatientData] = useState<Patient | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const loadPatientData = async () => {
            try {
                // 1. Tentar buscar por user_id
                const { data: patientByUserId } = await supabase
                    .from('patients')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (patientByUserId) {
                    setPatientData(mapDatabasePatient(patientByUserId));
                    setLoading(false);
                    return;
                }

                // 2. Self-healing: Buscar por Email
                // Isso cobre o caso de pacientes migrados que ainda não logaram
                if (user.email) {
                    const { data: patientByEmail } = await supabase
                        .from('patients')
                        .select('*')
                        .ilike('email', user.email)
                        .maybeSingle();

                    if (patientByEmail) {
                        // Vínculo automático (Self-Healing)
                        if (!patientByEmail.user_id) {
                            console.log("Realizando auto-vínculo de paciente por email...");
                            await supabase
                                .from('patients')
                                .update({ user_id: user.id })
                                .eq('id', patientByEmail.id);
                        }
                        setPatientData(mapDatabasePatient(patientByEmail));
                        setLoading(false);
                        return;
                    }
                }

                // Se não encontrou
                console.warn("Paciente autenticado, mas registro não encontrado em 'patients'.");
                setLoading(false);

            } catch (error) {
                console.error("Erro ao carregar dados do paciente:", error);
                setLoading(false);
            }
        };

        loadPatientData();
    }, [user]);

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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!patientData) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 gap-4 p-4 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-400">person_off</span>
                <p className="text-slate-600 dark:text-slate-300">Dados do paciente não encontrados.</p>
                <button onClick={() => signOut()} className="text-blue-600 hover:underline font-bold">Voltar para Login</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
            {/* Header Dedicado - Fixo no Topo */}
            <header className="w-full bg-white dark:bg-slate-800 h-16 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 flex-shrink-0 shadow-sm">
                {/* Logo/Nome do App */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-xl">medical_services</span>
                    </div>
                    <span className="text-xl font-bold text-slate-800 dark:text-white">MediTrack</span>
                </div>

                {/* Botão Sair - Limpo e Organizado */}
                <button
                    onClick={() => signOut()}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-all"
                >
                    <span className="material-symbols-outlined text-lg">logout</span>
                    <span>Sair</span>
                </button>
            </header>

            {/* Conteúdo Principal - Com Espaçamento Adequado */}
            <div className="flex-1 overflow-y-auto">
                <PatientProfilePage
                    patient={patientData}
                    onBack={() => { }}
                    onGoHome={() => { }}
                    readonly={true}
                />
            </div>
        </div>
    );
};

export default PatientPanel;
