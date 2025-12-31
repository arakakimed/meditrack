import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Patient } from '../types';
import AddPatientModal from './AddPatientModal';
import GlobalRegisterDoseModal from './GlobalRegisterDoseModal';

interface DashboardPageProps {
    onViewPatient: (patient: Patient) => void;
    onAdministerDose: (patient: Patient) => void;
    onAddPatient: () => void;
    setView: (view: any) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ setView, onViewPatient }) => {
    const [stats, setStats] = useState({
        totalPatients: 0,
        activePatients: 0,
        dosesToday: 0,
        delayedDoses: 0,
        monthlyRevenue: 0
    });
    const [todaysDoses, setTodaysDoses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Estados do Menu de Ação (+)
    const [showActionMenu, setShowActionMenu] = useState(false);
    const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);

    // Estados do Fluxo de Dose
    const [isPatientSelectorOpen, setIsPatientSelectorOpen] = useState(false);
    const [patientSearchTerm, setPatientSearchTerm] = useState('');
    const [patientSearchResults, setPatientSearchResults] = useState<Patient[]>([]);
    const [selectedPatientForDose, setSelectedPatientForDose] = useState<Patient | null>(null);
    const [isDoseModalOpen, setIsDoseModalOpen] = useState(false);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // Ajuste de Fuso Horário para garantir que "Hoje" é "Hoje no Brasil"
            const localDate = new Date();
            localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
            const today = localDate.toISOString().split('T')[0];

            const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

            // 1. Stats Básicos
            const { count: totalP } = await supabase.from('patients').select('*', { count: 'exact', head: true });

            // 2. Doses Hoje
            const { data: upcoming, error: upcomingError } = await supabase
                .from('medication_steps')
                .select('*, patients!inner(name, avatar_url, initials)') // !inner força trazer apenas se achar o paciente
                .eq('date', today)
                .neq('status', 'Concluído');

            if (upcomingError) console.error('Erro ao buscar doses:', upcomingError);

            // 3. Doses Atrasadas
            const { count: delayed } = await supabase
                .from('medication_steps')
                .select('*', { count: 'exact', head: true })
                .lt('date', today)
                .neq('status', 'Concluído');

            // 4. Receita Mês
            const { data: revenue } = await supabase
                .from('financial_records')
                .select('amount')
                .eq('status', 'Pago')
                .gte('created_at', firstDayOfMonth);

            const totalRevenue = revenue?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

            setStats({
                totalPatients: totalP || 0,
                activePatients: totalP || 0,
                dosesToday: upcoming?.length || 0,
                delayedDoses: delayed || 0,
                monthlyRevenue: totalRevenue
            });

            setTodaysDoses(upcoming || []);

        } catch (error) {
            console.error('Erro dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDashboardData(); }, []);

    // Busca de pacientes para o seletor
    useEffect(() => {
        const searchPatients = async () => {
            if (patientSearchTerm.length < 2) { setPatientSearchResults([]); return; }
            const { data } = await supabase.from('patients').select('*').ilike('name', `%${patientSearchTerm}%`).limit(5);
            if (data) setPatientSearchResults(data as any);
        };
        const timer = setTimeout(searchPatients, 300);
        return () => clearTimeout(timer);
    }, [patientSearchTerm]);

    const handleSelectPatient = (patient: Patient) => {
        setSelectedPatientForDose(patient);
        setIsPatientSelectorOpen(false);
        setIsDoseModalOpen(true);
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 pb-24">

            {/* Header com Botão + */}
            <div className="flex justify-between items-center relative">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Olá, Doutor(a)</h1>
                    <p className="text-slate-500 text-sm capitalize">
                        {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setShowActionMenu(!showActionMenu)}
                        className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 transition-all hover:scale-105 active:scale-95"
                    >
                        <span className="material-symbols-outlined text-3xl">add</span>
                    </button>

                    {/* Menu Flutuante */}
                    {showActionMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowActionMenu(false)}></div>
                            <div className="absolute right-0 top-14 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <button onClick={() => { setShowActionMenu(false); setIsAddPatientModalOpen(true); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-slate-700 dark:text-slate-200">
                                    <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><span className="material-symbols-outlined text-lg">person_add</span></div>
                                    <span className="font-medium text-sm">Novo Paciente</span>
                                </button>
                                <button onClick={() => { setShowActionMenu(false); setPatientSearchTerm(''); setIsPatientSelectorOpen(true); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-slate-700 dark:text-slate-200 border-t border-slate-100 dark:border-slate-700">
                                    <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><span className="material-symbols-outlined text-lg">vaccines</span></div>
                                    <span className="font-medium text-sm">Registrar Dose</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Menu Rápido (VOLTOU!) */}
            <div className="grid grid-cols-4 gap-3 md:gap-4">
                <QuickAction icon="group" label="Pacientes" color="blue" onClick={() => setView('patients')} />
                <QuickAction icon="calendar_today" label="Agenda" color="indigo" onClick={() => setView('schedule')} />
                <QuickAction icon="account_balance_wallet" label="Finanças" color="emerald" onClick={() => setView('financials')} />
                <QuickAction icon="inventory_2" label="Estoque" color="amber" onClick={() => setView('medications')} />
            </div>

            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard icon="vaccines" label="Doses Hoje" value={stats.dosesToday} color="blue" />
                <StatCard icon="warning" label="Em Atraso" value={stats.delayedDoses} color="rose" />
                <StatCard icon="attach_money" label="Receita Mês" value={stats.monthlyRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })} color="emerald" />
            </div>

            {/* Fila de Atendimento */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        Fila de Atendimento
                        {stats.dosesToday > 0 && <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">{stats.dosesToday}</span>}
                    </h2>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm divide-y divide-slate-100 dark:divide-slate-700">
                    {loading ? (
                        <div className="p-8 text-center text-slate-400">Carregando fila...</div>
                    ) : todaysDoses.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400">
                            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">event_available</span>
                            <p>Nenhuma dose agendada para hoje.</p>
                        </div>
                    ) : (
                        todaysDoses.map((item: any) => (
                            <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group cursor-pointer" onClick={() => {
                                const p = { id: item.patient_id, name: item.patients?.name, initials: item.patients?.initials, avatarUrl: item.patients?.avatar_url } as Patient;
                                onViewPatient(p); // Redireciona para o perfil usando a função do App.tsx
                            }}>
                                <div className="flex items-center gap-4">
                                    <div className="w-1.5 h-10 bg-blue-500 rounded-full"></div>
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold overflow-hidden border border-slate-200">
                                        {item.patients?.avatar_url ? <img src={item.patients.avatar_url} className="w-full h-full object-cover" /> : item.patients?.initials}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{item.patients?.name}</h4>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 uppercase border border-emerald-200">
                                                {item.dose_label || `${item.order_index}ª dose`}
                                            </span>
                                            <span className="text-xs text-slate-500">{item.dosage}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors">Ver Perfil</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* --- MODAIS DE AÇÃO --- */}

            {/* Modal de Seleção de Paciente */}
            {isPatientSelectorOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Selecione o Paciente</h3>
                            <button onClick={() => setIsPatientSelectorOpen(false)} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
                        </div>

                        <div className="relative mb-6">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined">search</span>
                            <input
                                type="text"
                                placeholder="Buscar por nome..."
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                value={patientSearchTerm}
                                onChange={(e) => setPatientSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {patientSearchResults.length > 0 ? (
                                patientSearchResults.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => handleSelectPatient(p)}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-xl transition-colors text-left group"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                            {p.initials}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white group-hover:text-blue-700">{p.name}</p>
                                            <p className="text-xs text-slate-500">CPF: {p.cpf || '---'}</p>
                                        </div>
                                        <span className="ml-auto material-symbols-outlined text-slate-300 group-hover:text-blue-500">add_circle</span>
                                    </button>
                                ))
                            ) : patientSearchTerm.length > 1 ? (
                                <div className="text-center py-4 text-slate-400">Nenhum paciente encontrado.</div>
                            ) : (
                                <div className="text-center py-4 text-slate-400 text-sm">Digite para buscar...</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isDoseModalOpen && selectedPatientForDose && (
                <GlobalRegisterDoseModal isOpen={isDoseModalOpen} onClose={() => { setIsDoseModalOpen(false); setSelectedPatientForDose(null); }} onSuccess={() => { fetchDashboardData(); setIsDoseModalOpen(false); setSelectedPatientForDose(null); }} initialPatient={selectedPatientForDose} />
            )}

            {isAddPatientModalOpen && <AddPatientModal isOpen={isAddPatientModalOpen} onClose={() => setIsAddPatientModalOpen(false)} onSuccess={() => { fetchDashboardData(); setIsAddPatientModalOpen(false); }} />}
        </div>
    );
};

const QuickAction: React.FC<{ icon: string, label: string, color: string, onClick: () => void }> = ({ icon, label, color, onClick }) => {
    const colors: any = { blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100', indigo: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100', emerald: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100', amber: 'bg-amber-50 text-amber-600 hover:bg-amber-100' };
    return (
        <button onClick={onClick} className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all hover:scale-105 active:scale-95 ${colors[color]}`}>
            <span className="material-symbols-outlined text-3xl">{icon}</span>
            <span className="text-[10px] md:text-xs font-bold uppercase">{label}</span>
        </button>
    );
};

const StatCard: React.FC<{ icon: string, label: string, value: string | number, color: string }> = ({ icon, label, value, color }) => {
    const bgColors: any = { blue: 'bg-blue-600 shadow-blue-500/30', rose: 'bg-rose-500 shadow-rose-500/30', emerald: 'bg-emerald-500 shadow-emerald-500/30' };
    const textColors: any = { blue: 'text-blue-100', rose: 'text-rose-100', emerald: 'text-emerald-100' };
    return (
        <div className={`${bgColors[color]} text-white p-5 rounded-2xl shadow-lg relative overflow-hidden group`}>
            <div className="relative z-10">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3 backdrop-blur-sm"><span className="material-symbols-outlined">{icon}</span></div>
                <p className={`${textColors[color]} text-xs font-bold uppercase tracking-wider`}>{label}</p>
                <h3 className="text-3xl font-black mt-0.5">{value}</h3>
            </div>
            <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-[100px] text-white opacity-10 group-hover:scale-110 transition-transform duration-500">{icon}</span>
        </div>
    );
};

export default DashboardPage;