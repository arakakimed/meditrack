import React, { useState, useEffect } from 'react';
import { Patient } from '../types';
import { supabase } from '../lib/supabase';

interface StatCardProps {
    title: string;
    value: string;
    change?: string;
    changeType?: 'positive' | 'negative';
    unit: string;
    icon: string;
    iconColorClass: string;
    actionText?: string;
    actionColorClass?: string;
}

// Color themes for each card type
const cardThemes = {
    primary: 'from-blue-500 to-blue-600',
    danger: 'from-rose-500 to-rose-600',
    success: 'from-emerald-500 to-emerald-600',
    purple: 'from-violet-500 to-violet-600',
    amber: 'from-amber-500 to-amber-600',
    cyan: 'from-cyan-500 to-cyan-600',
};

interface ExtendedStatCardProps extends StatCardProps {
    theme?: keyof typeof cardThemes;
}

const StatCard: React.FC<ExtendedStatCardProps> = ({ title, value, change, changeType, unit, icon, theme = 'primary', actionText }) => {
    const gradientClass = cardThemes[theme] || cardThemes.primary;
    const isPositive = changeType === 'positive';

    return (
        <div className={`bg-gradient-to-br ${gradientClass} rounded-2xl p-6 shadow-lg flex flex-col justify-between h-36 relative overflow-hidden group hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer`}>
            {/* Decorative background icons */}
            <div className="absolute -right-4 -bottom-4 opacity-15 group-hover:opacity-25 transition-opacity duration-300">
                <span className="material-symbols-outlined text-[120px] text-white">{icon}</span>
            </div>
            <div className="absolute right-16 top-2 opacity-10 rotate-12">
                <span className="material-symbols-outlined text-[60px] text-white">{icon}</span>
            </div>

            {/* Content */}
            <div className="relative z-10">
                <p className="text-white/80 text-sm font-medium tracking-wide">{title}</p>
            </div>

            <div className="relative z-10 flex items-end justify-between">
                <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white drop-shadow-sm">{value}</span>
                    <span className="text-white/70 text-sm font-medium">{unit}</span>
                </div>

                {change && (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold backdrop-blur-sm ${isPositive ? 'bg-white/20 text-white' : 'bg-white/20 text-white'}`}>
                        <span className="material-symbols-outlined text-sm">{isPositive ? 'trending_up' : 'trending_down'}</span>
                        {change}
                    </span>
                )}

                {actionText && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold bg-white/25 text-white backdrop-blur-sm animate-pulse">
                        <span className="material-symbols-outlined text-sm">priority_high</span>
                        {actionText}
                    </span>
                )}
            </div>
        </div>
    );
};

interface UpcomingDosesTableProps {
    onViewPatient: (patientId: string) => void;
    onAdministerDose: (patient: Patient) => void;
}

const UpcomingDosesTable: React.FC<UpcomingDosesTableProps> = ({ onViewPatient, onAdministerDose }) => {
    const [doses, setDoses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchDoses = async () => {
        setLoading(true);
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { data, error } = await supabase
                .from('upcoming_doses')
                .select('*, patients(*)')
                .gte('scheduled_at', today.toISOString())
                .order('scheduled_at', { ascending: true })
                .limit(5);

            if (error) throw error;
            setDoses(data || []);
        } catch (err) {
            console.error('Error fetching doses:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDoses();
    }, []);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Aguardando':
                return <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">Aguardando</span>;
            case 'Agendado':
                return <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">Agendado</span>;
            case 'Concluído':
                return <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Concluído</span>;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center text-slate-400">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <span className="text-sm font-medium">Carregando agendamentos...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Paciente</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tratamento</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Horário</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                        {doses.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="material-symbols-outlined text-4xl">calendar_today</span>
                                        <span className="text-sm font-medium">Nenhum agendamento para hoje.</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            doses.map((dose) => {
                                const patient = dose.patients;
                                if (!patient) return null;
                                const time = new Date(dose.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                return (
                                    <tr key={dose.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center cursor-pointer" onClick={() => onViewPatient(patient)}>
                                                <div className="h-10 w-10 flex-shrink-0">
                                                    {patient.avatar_url ? (
                                                        <div className="h-10 w-10 rounded-full bg-cover bg-center" style={{ backgroundImage: `url('${patient.avatar_url}')` }}></div>
                                                    ) : (
                                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                            <span>{patient.initials}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{patient.name}</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">ID: {patient.id.substring(0, 8)}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-slate-900 dark:text-white">{dose.treatment}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">{dose.dosage}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-sm text-slate-900 dark:text-white font-medium">{time}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(dose.status)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => onAdministerDose(patient)} className="bg-primary/10 hover:bg-primary text-primary hover:text-white font-medium py-1.5 px-4 rounded-lg transition-all duration-200 text-sm">
                                                Administrar
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

interface DashboardPageProps {
    onViewPatient: (patientId: string) => void;
    onAdministerDose: (patient: Patient) => void;
    onAddPatient: () => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ onViewPatient, onAdministerDose, onAddPatient }) => {
    const [stats, setStats] = useState({
        dosesToday: '0',
        overduePayments: '0',
        estimatedRevenue: '0'
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const nextDay = new Date(today);
                nextDay.setDate(today.getDate() + 1);

                // 1. Doses Today
                const { count: dosesToday } = await supabase
                    .from('upcoming_doses')
                    .select('*', { count: 'exact', head: true })
                    .gte('scheduled_at', today.toISOString())
                    .lt('scheduled_at', nextDay.toISOString());

                // 2. Overdue Payments
                const { count: overduePayments } = await supabase
                    .from('financial_records')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'Atrasado');

                // 3. Estimated Revenue (Sum of paid records this month)
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                const { data: revenueData } = await supabase
                    .from('financial_records')
                    .select('amount')
                    .eq('status', 'Pago')
                    .gte('created_at', startOfMonth.toISOString());

                const totalRevenue = (revenueData || []).reduce((acc, curr) => acc + Number(curr.amount), 0);

                setStats({
                    dosesToday: (dosesToday || 0).toString(),
                    overduePayments: (overduePayments || 0).toString(),
                    estimatedRevenue: `R$ ${(totalRevenue / 1000).toFixed(1)}k`
                });
            } catch (err) {
                console.error('Error fetching dashboard stats:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);
    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Painel de Controle</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Protocolo Tirzepatida • 16 de Outubro, 2023</p>
                </div>
                <button
                    onClick={onAddPatient}
                    className="inline-flex items-center gap-2 bg-primary hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm shadow-blue-500/20"
                >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    Novo Paciente
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Doses Hoje" value={stats.dosesToday} unit="pacientes" change="+0%" changeType="positive" icon="vaccines" theme="primary" />
                <StatCard title="Em Atraso" value={stats.overduePayments} unit="registros" actionText={stats.overduePayments !== '0' ? "Ação Necessária" : undefined} icon="event_busy" theme="danger" />
                <StatCard title="Receita (Mês)" value={stats.estimatedRevenue} unit="líquido" change="+0%" changeType="positive" icon="payments" theme="success" />
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">schedule</span>
                        Próximas Doses
                    </h3>
                    <a href="#" className="text-sm font-medium text-primary hover:text-blue-700">Ver todas</a>
                </div>
                <UpcomingDosesTable onViewPatient={onViewPatient} onAdministerDose={onAdministerDose} />
            </div>

            <div className="mt-4 rounded-xl bg-blue-50 dark:bg-slate-800/50 border border-blue-100 dark:border-slate-700 p-4 flex gap-3 items-start">
                <span className="material-symbols-outlined text-blue-500 shrink-0 mt-0.5">info</span>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Aviso Legal:</span>
                    Esta ferramenta auxilia no acompanhamento clínico, mas não substitui o julgamento médico profissional. Confirme as alergias do paciente e a dosagem correta antes da administração de qualquer medicamento. O uso deste software implica na aceitação dos termos de responsabilidade clínica.
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
