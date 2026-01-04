import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Patient } from '../types';
import AddPatientModal from './AddPatientModal';
import GlobalRegisterDoseModal from './GlobalRegisterDoseModal';
import { TAG_COLORS } from './TagManagerModal';

// Utility function to convert HEX color to RGBA with transparency
const hexToRgba = (hex: string, alpha: number): string => {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Default color for items without tags
const DEFAULT_TAG_COLOR = TAG_COLORS.find(c => c.name === 'Slate') || TAG_COLORS[11];

interface DashboardPageProps {
    onViewPatient: (patient: Patient) => void;
    onAdministerDose: (patient: Patient) => void;
    onAddPatient: () => void;
    setView: (view: any) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ setView, onViewPatient, onAddPatient }) => {
    const [stats, setStats] = useState({
        totalPatients: 0,
        dosesToday: 0,
        delayedDoses: 0,
        monthlyRevenue: 0
    });
    const [todaysDoses, setTodaysDoses] = useState<any[]>([]);
    const [allClinicTags, setAllClinicTags] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [showActionMenu, setShowActionMenu] = useState(false);
    const [isPatientSelectorOpen, setIsPatientSelectorOpen] = useState(false);
    const [patientSearchTerm, setPatientSearchTerm] = useState('');
    const [patientSearchResults, setPatientSearchResults] = useState<Patient[]>([]);
    const [selectedPatientForDose, setSelectedPatientForDose] = useState<Patient | null>(null);
    const [isDoseModalOpen, setIsDoseModalOpen] = useState(false);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const now = new Date();
            const today = now.toISOString().split('T')[0];
            const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

            const { data: tagsData } = await supabase.from('clinic_tags').select('*');
            if (tagsData) setAllClinicTags(tagsData);

            const { count: totalP } = await supabase.from('patients').select('*', { count: 'exact', head: true });
            const { count: countToday } = await supabase.from('medication_steps').select('*', { count: 'exact', head: true }).eq('date', today).neq('status', 'Concluído');
            const { count: countDelayed } = await supabase.from('medication_steps').select('*', { count: 'exact', head: true }).lt('date', today).neq('status', 'Concluído');
            const { data: revenue } = await supabase.from('financial_records').select('amount').eq('status', 'Pago').gte('created_at', firstDayOfMonth);

            const totalRevenue = revenue?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

            setStats({
                totalPatients: totalP || 0,
                dosesToday: countToday || 0,
                delayedDoses: countDelayed || 0,
                monthlyRevenue: totalRevenue
            });

            const { data: queue, error: queueError } = await supabase
                .from('medication_steps')
                .select(`
                    id, date, dosage, order_index, status, patient_id,
                    patients (id, name, initials, avatar_url, tags, current_weight, height, initial_weight, target_weight, age, gender)
                `)
                .neq('status', 'Concluído')
                .order('date', { ascending: true })
                .limit(40);

            if (queueError) throw queueError;
            setTodaysDoses(queue || []);

        } catch (error) {
            console.error('Erro dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const [userName, setUserName] = useState('');
    const [userGender, setUserGender] = useState<string | null>(null);

    useEffect(() => { fetchDashboardData(); }, []);

    // Função para formatar o tratamento baseado no gênero
    const getHonorific = (gender: string | null): string => {
        if (!gender) return 'Dr(a)';

        const normalizedGender = gender.toLowerCase().trim();

        if (normalizedGender === 'female' || normalizedGender === 'feminino' || normalizedGender === 'f') {
            return 'Dra.';
        } else if (normalizedGender === 'male' || normalizedGender === 'masculino' || normalizedGender === 'm') {
            return 'Dr.';
        }

        return 'Dr(a)';  // Fallback para valores não reconhecidos
    };

    // Fetch User Name and Gender from profiles table
    useEffect(() => {
        const getUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('name, gender')
                    .eq('id', user.id)
                    .single();

                setUserName(profile?.name || '');
                setUserGender(profile?.gender || null);
            }
        };
        getUserData();
    }, []);

    const getTagInfo = (tagId: string) => {
        const tagInfo = allClinicTags.find(t => t.id === tagId);
        if (!tagInfo) return null;
        return TAG_COLORS.find(c => c.name === tagInfo.color) || TAG_COLORS[4];
    };

    // TIMEZONE-SAFE: Parse date string manually to avoid UTC conversion issues
    const formatSafeDate = (dateStr: string) => {
        if (!dateStr) return '';
        const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        const [year, month, day] = cleanDate.split('-').map(Number);
        if (!year || !month || !day) return dateStr;
        const d = new Date(year, month - 1, day);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    };

    // Formatar saudação completa
    const greeting = userName
        ? `Olá, ${getHonorific(userGender)} ${userName}`
        : `Olá, ${getHonorific(userGender)}`;

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 pb-24">
            {/* Header - SAUDAÇÃO PERSONALIZADA */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{greeting}</h1>
                    <p className="text-slate-500 text-sm capitalize">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
                <div className="relative">
                    <button onClick={() => setShowActionMenu(!showActionMenu)} className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg hover:scale-105 transition-all">
                        <span className="material-symbols-outlined text-3xl">add</span>
                    </button>
                    {showActionMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowActionMenu(false)}></div>
                            <div className="absolute right-0 top-14 w-56 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                                <button onClick={() => { setShowActionMenu(false); onAddPatient(); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 text-slate-700 font-medium text-sm"><span className="material-symbols-outlined text-blue-600">person_add</span> Novo Paciente</button>
                                <button onClick={() => { setShowActionMenu(false); setSelectedPatientForDose(null); setIsDoseModalOpen(true); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 text-slate-700 font-medium text-sm border-t border-slate-100"><span className="material-symbols-outlined text-emerald-600">vaccines</span> Registrar Dose</button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Menu de Ícones */}
            <div className="grid grid-cols-4 gap-4">
                <QuickAction icon="group" label="Pacientes" color="blue" onClick={() => setView('patients')} />
                <QuickAction icon="calendar_today" label="Agenda" color="indigo" onClick={() => setView('schedule')} />
                <QuickAction icon="account_balance_wallet" label="Finanças" color="emerald" onClick={() => setView('financials')} />
                <QuickAction icon="inventory_2" label="Estoque" color="amber" onClick={() => setView('medications')} />
            </div>

            {/* CARDS EM UMA LINHA (GRID 3 COLUNAS) */}
            <div className="grid grid-cols-3 gap-4">
                <StatCard icon="vaccines" label="Doses Hoje" value={stats.dosesToday} color="blue" />
                <StatCard icon="warning" label="Em Atraso" value={stats.delayedDoses} color="rose" />
                <StatCard icon="attach_money" label="Receita Mês" value={stats.monthlyRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })} color="emerald" />
            </div>

            {/* Fila de Atendimento NOVO LAYOUT */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">Fila de Atendimento <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">{todaysDoses.length}</span></h2>
                <div className="space-y-3">
                    {loading ? (
                        <div className="p-8 text-center text-slate-400 font-medium italic">Sincronizando fila...</div>
                    ) : todaysDoses.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-100 flex flex-col items-center"><span className="material-symbols-outlined text-4xl mb-2 opacity-50">event_available</span> Nenhuma dose pendente.</div>
                    ) : (
                        todaysDoses.map((item) => {
                            const p = item.patients;
                            const firstTagId = p?.tags?.[0];
                            const tagStyle = firstTagId ? getTagInfo(firstTagId) : DEFAULT_TAG_COLOR;
                            const tagData = allClinicTags.find(t => t.id === firstTagId);
                            const primaryHex = tagStyle?.hex || DEFAULT_TAG_COLOR.hex;

                            return (
                                <div
                                    key={item.id}
                                    className="relative p-4 pl-5 flex items-center justify-between rounded-2xl shadow-sm hover:shadow-lg transition-all cursor-pointer overflow-hidden"
                                    style={{
                                        backgroundColor: hexToRgba(primaryHex, 0.04),
                                        borderWidth: '1px',
                                        borderColor: hexToRgba(primaryHex, 0.2)
                                    }}
                                    onClick={() => p && onViewPatient(p as any)}
                                >
                                    {/* Dynamic colored left accent bar */}
                                    <div
                                        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                                        style={{ backgroundColor: primaryHex }}
                                    />

                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                        {/* Avatar with dynamic color */}
                                        <div
                                            className="w-12 h-12 rounded-full flex items-center justify-center font-bold overflow-hidden flex-shrink-0 shadow-sm"
                                            style={{
                                                backgroundColor: p?.avatar_url ? 'transparent' : hexToRgba(primaryHex, 0.15),
                                                color: primaryHex,
                                                border: `2px solid ${hexToRgba(primaryHex, 0.3)}`
                                            }}
                                        >
                                            {p?.avatar_url
                                                ? <img src={p.avatar_url} className="w-full h-full object-cover" alt="" />
                                                : (p?.initials || '?')
                                            }
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-bold text-slate-900 text-sm truncate">{p?.name || 'Paciente'}</h4>

                                            {/* TAG, DATA E MG NA MESMA LINHA */}
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                {tagData && (
                                                    <span
                                                        className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase shadow-sm"
                                                        style={{
                                                            backgroundColor: hexToRgba(primaryHex, 0.15),
                                                            color: primaryHex,
                                                            border: `1px solid ${hexToRgba(primaryHex, 0.3)}`
                                                        }}
                                                    >
                                                        {tagData.name}
                                                    </span>
                                                )}
                                                <span className="text-xs text-slate-400 font-medium">
                                                    • {formatSafeDate(item.date)} • {item.dosage}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ color: hexToRgba(primaryHex, 0.4) }}
                                    >
                                        chevron_right
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Modal Global de Registro de Dose - Abre diretamente sem pré-seleção */}
            {isDoseModalOpen && (
                <GlobalRegisterDoseModal
                    isOpen={isDoseModalOpen}
                    onClose={() => { setIsDoseModalOpen(false); setSelectedPatientForDose(null); }}
                    onSuccess={(newInjection) => {
                        setIsDoseModalOpen(false);
                        fetchDashboardData();
                        // Navegar para o perfil do paciente após sucesso
                        if (newInjection?.patient_id) {
                            // Buscar dados completos do paciente para navegação
                            supabase
                                .from('patients')
                                .select('*')
                                .eq('id', newInjection.patient_id)
                                .single()
                                .then(({ data: patientData }) => {
                                    if (patientData) {
                                        onViewPatient(patientData as Patient);
                                    }
                                });
                        }
                        setSelectedPatientForDose(null);
                    }}
                    initialPatient={selectedPatientForDose} // null quando aberto do header
                />
            )}
        </div>
    );
};

const QuickAction: React.FC<any> = ({ icon, label, color, onClick }) => {
    const colors: any = { blue: 'bg-blue-50 text-blue-600', indigo: 'bg-indigo-50 text-indigo-600', emerald: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600' };
    return <button onClick={onClick} className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all hover:scale-105 active:scale-95 ${colors[color]}`}><span className="material-symbols-outlined text-2xl">{icon}</span><span className="text-[10px] md:text-xs font-bold uppercase">{label}</span></button>;
};

const StatCard: React.FC<any> = ({ icon, label, value, color }) => {
    const bgColors: any = { blue: 'bg-blue-600 shadow-blue-500/30', rose: 'bg-rose-500 shadow-rose-500/30', emerald: 'bg-emerald-500 shadow-emerald-500/30' };
    return (
        <div className={`${bgColors[color]} text-white p-5 rounded-2xl shadow-lg relative overflow-hidden group flex flex-col items-center text-center`}>
            <div className="relative z-10">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-2 mx-auto backdrop-blur-sm"><span className="material-symbols-outlined">{icon}</span></div>
                <p className="text-white/80 text-[10px] font-bold uppercase tracking-wider leading-tight">{label}</p>
                <h3 className="text-2xl font-black truncate w-full">{value}</h3>
            </div>
            <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-[70px] text-white opacity-10 group-hover:scale-110 transition-transform duration-500">{icon}</span>
        </div>
    );
};

export default DashboardPage;