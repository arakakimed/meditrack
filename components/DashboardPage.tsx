import React, { useState, useEffect } from 'react';
import { Patient } from '../types';
import type { View } from '../App';
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
    primary: 'from-blue-600 to-indigo-600 shadow-blue-500/25',
    danger: 'from-rose-500 to-pink-600 shadow-rose-500/25',
    success: 'from-emerald-500 to-teal-600 shadow-emerald-500/25',
    purple: 'from-violet-500 to-purple-600 shadow-violet-500/25',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/25',
    cyan: 'from-cyan-500 to-blue-500 shadow-cyan-500/25',
};

interface ExtendedStatCardProps extends StatCardProps {
    theme?: keyof typeof cardThemes;
}

const StatCard: React.FC<ExtendedStatCardProps> = ({ title, value, change, changeType, unit, icon, theme = 'primary', actionText }) => {
    const gradientClass = cardThemes[theme] || cardThemes.primary;
    const isPositive = changeType === 'positive';

    return (
        <div className={`bg-gradient-to-br ${gradientClass} rounded-2xl p-6 shadow-xl flex flex-col justify-between h-36 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300 cursor-pointer border border-white/10`}>
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

import { TAG_COLORS } from './TagManagerModal';

interface UpcomingDosesTableProps {
    onViewPatient: (patientId: string) => void;
    onAdministerDose: (patient: Patient) => void;
    setView: (view: View) => void;
}

const UpcomingDosesTable: React.FC<UpcomingDosesTableProps> = ({ onViewPatient, onAdministerDose, setView }) => {
    const [doses, setDoses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [clinicTags, setClinicTags] = useState<any[]>([]);

    const fetchDoses = async () => {
        setLoading(true);
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Fetch Doses
            const { data, error } = await supabase
                .from('upcoming_doses')
                .select('*, patients(*)')
                .gte('scheduled_at', today.toISOString())
                .order('scheduled_at', { ascending: true })
                .limit(5);

            if (error) throw error;
            setDoses(data || []);

            // Fetch Tags
            const { data: tagsData } = await supabase.from('clinic_tags').select('*');
            if (tagsData) setClinicTags(tagsData);

        } catch (err) {
            console.error('Error fetching doses:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDoses();
    }, []);

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
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-full">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-blue-500/20">
                        <span className="material-symbols-outlined text-[20px]">schedule</span>
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg tracking-tight">Próximas Doses</h3>
                </div>
                <button onClick={() => setView('schedule')} className="text-sm font-bold text-primary hover:text-blue-700 transition-colors bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg">
                    Ver todas
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {doses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                            <span className="material-symbols-outlined text-3xl">event_busy</span>
                        </div>
                        <span className="text-sm font-medium">Nenhum agendamento próximo.</span>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {doses.map((dose) => {
                            const patient = dose.patients;
                            if (!patient) return null;
                            const dateObj = new Date(dose.scheduled_at);
                            const day = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

                            // Tag Logic
                            const patientTags = patient.tags || [];
                            const firstTagId = patientTags.length > 0 ? patientTags[0] : null;
                            const tagDef = firstTagId ? clinicTags.find(t => t.id === firstTagId) : null;
                            const tagColor = tagDef ? TAG_COLORS.find(c => c.name === tagDef.color) : null;

                            // Determine status dot color (Semantic)
                            const getStatusDotColor = (status: string) => {
                                switch (status) {
                                    case 'Aguardando': return 'bg-amber-500';
                                    case 'Agendado': return 'bg-blue-500';
                                    case 'Concluído': return 'bg-emerald-500';
                                    case 'Atrasado': return 'bg-rose-500';
                                    default: return 'bg-slate-400';
                                }
                            };

                            // Get Badge Style: Priority to Patient Tag, fallback to Semesteric Status
                            let badgeStyle = '';

                            if (tagColor) {
                                // If patient has a tag, use its color for the badge
                                badgeStyle = `${tagColor.bg} ${tagColor.text} ${tagColor.border} ring-1 ring-inset ${tagColor.border}`;
                            } else {
                                // Fallback to semantic status colors
                                switch (dose.status) {
                                    case 'Aguardando': badgeStyle = 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-400'; break;
                                    case 'Agendado': badgeStyle = 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400'; break;
                                    case 'Concluído': badgeStyle = 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-400'; break;
                                    case 'Atrasado': badgeStyle = 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20 dark:bg-rose-900/30 dark:text-rose-400'; break;
                                    default: badgeStyle = 'bg-slate-100 text-slate-600 ring-1 ring-slate-500/10 dark:bg-slate-800 dark:text-slate-400';
                                }
                            }

                            return (
                                <div
                                    key={dose.id}
                                    className="group flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all cursor-pointer relative"
                                    onClick={() => onViewPatient(patient)}
                                >
                                    {/* Left accent bar on hover */}
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary scale-y-0 group-hover:scale-y-100 transition-transform origin-center"></div>

                                    <div className="flex items-center gap-4">
                                        {/* Avatar */}
                                        <div className="relative">
                                            {patient.avatar_url ? (
                                                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-cover bg-center ring-2 ring-white dark:ring-slate-800 shadow-sm" style={{ backgroundImage: `url('${patient.avatar_url}')` }}></div>
                                            ) : (
                                                <div className={`h-10 w-10 md:h-12 md:w-12 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-300 font-bold text-sm md:text-base ring-2 ring-white dark:ring-slate-800 shadow-sm ${tagColor ? tagColor.bg : 'bg-slate-100 dark:bg-slate-700'}`}>
                                                    <span className={tagColor ? tagColor.text : ''}>{patient.initials}</span>
                                                </div>
                                            )}
                                            {/* Status Dot */}
                                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${getStatusDotColor(dose.status)} shadow-sm`}></div>
                                        </div>

                                        {/* Info */}
                                        <div className="flex flex-col">
                                            <span className="text-sm md:text-base font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors line-clamp-1">
                                                {patient.name}
                                            </span>
                                            {/* Badge */}
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-lg whitespace-nowrap ${badgeStyle}`}>
                                                    {tagDef ? tagDef.name : dose.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Date */}
                                    <div className="flex flex-col items-end pl-2">
                                        <span className="text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md whitespace-nowrap border border-slate-100 dark:border-slate-700">
                                            {day}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

interface DashboardPageProps {
    onViewPatient: (patientId: string) => void;
    onAdministerDose: (patient: Patient) => void;
    onAddPatient: () => void;
    setView: (view: View) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ onViewPatient, onAdministerDose, onAddPatient, setView }) => {
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
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Protocolo Tirzepatida • {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <button
                    onClick={onAddPatient}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 active:scale-95 active:translate-y-0"
                >
                    <span className="material-symbols-outlined text-[20px]">add_circle</span>
                    Novo Paciente
                </button>
            </div>



            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Pacientes', view: 'patients', icon: 'group', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', ring: 'group-hover:ring-blue-500/50', gradient: 'from-blue-500/5 to-blue-600/10' },
                    { label: 'Agenda', view: 'schedule', icon: 'calendar_today', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', ring: 'group-hover:ring-emerald-500/50', gradient: 'from-emerald-500/5 to-emerald-600/10' },
                    { label: 'Medicações', view: 'medications', icon: 'medication', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20', ring: 'group-hover:ring-violet-500/50', gradient: 'from-violet-500/5 to-violet-600/10' },
                    { label: 'Financeiro', view: 'financials', icon: 'payments', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', ring: 'group-hover:ring-amber-500/50', gradient: 'from-amber-500/5 to-amber-600/10' },
                ].map((action) => (
                    <button
                        key={action.view}
                        onClick={() => setView(action.view as View)}
                        className={`group relative flex flex-col justify-between p-5 h-32 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden ring-1 ring-transparent ${action.ring}`}
                    >
                        <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                        <div className={`absolute -right-4 -bottom-4 opacity-0 group-hover:opacity-10 transition-all duration-500 scale-150 rotate-12`}>
                            <span className={`material-symbols-outlined text-8xl ${action.color}`}>{action.icon}</span>
                        </div>

                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${action.bg} ${action.color} shadow-sm group-hover:scale-110 transition-transform duration-300 relative z-10`}>
                            <span className="material-symbols-outlined text-2xl">{action.icon}</span>
                        </div>

                        <div className="text-left relative z-10">
                            <span className="block font-bold text-slate-700 dark:text-slate-100 text-lg tracking-tight group-hover:translate-x-1 transition-transform">{action.label}</span>
                        </div>
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Doses Hoje" value={stats.dosesToday} unit="pacientes" change="+0%" changeType="positive" icon="vaccines" theme="primary" />
                <StatCard title="Em Atraso" value={stats.overduePayments} unit="registros" actionText={stats.overduePayments !== '0' ? "Ação Necessária" : undefined} icon="event_busy" theme="danger" />
                <StatCard title="Receita (Mês)" value={stats.estimatedRevenue} unit="líquido" change="+0%" changeType="positive" icon="payments" theme="success" />
            </div>

            {/* Upcoming Doses Table - Modern & Minimal */}
            <div className="lg:col-span-2 min-h-[400px]">
                <UpcomingDosesTable onViewPatient={onViewPatient} onAdministerDose={onAdministerDose} setView={setView} />
            </div>

            <div className="mt-4 rounded-xl bg-blue-50 dark:bg-slate-800/50 border border-blue-100 dark:border-slate-700 p-4 flex gap-3 items-start">
                <span className="material-symbols-outlined text-blue-500 shrink-0 mt-0.5">info</span>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Aviso Legal:</span>
                    Esta ferramenta auxilia no acompanhamento clínico, mas não substitui o julgamento médico profissional. Confirme as alergias do paciente e a dosagem correta antes da administração de qualquer medicamento. O uso deste software implica na aceitação dos termos de responsabilidade clínica.
                </div>
            </div>
        </div >
    );
};

export default DashboardPage;
