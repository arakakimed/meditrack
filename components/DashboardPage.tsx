import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Patient } from '../types';
import AddPatientModal from './AddPatientModal';
import GlobalRegisterDoseModal from './GlobalRegisterDoseModal';
import { TAG_COLORS } from './TagManagerModal';

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

    useEffect(() => { fetchDashboardData(); }, []);

    const getTagInfo = (tagId: string) => {
        const tagInfo = allClinicTags.find(t => t.id === tagId);
        if (!tagInfo) return null;
        return TAG_COLORS.find(c => c.name === tagInfo.color) || TAG_COLORS[4];
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 pb-24">
            {/* Header - AJUSTE O NOME AQUI */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Olá, Dr. Renan Arakaki</h1>
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
                                <button onClick={() => { setShowActionMenu(false); setPatientSearchTerm(''); setIsPatientSelectorOpen(true); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 text-slate-700 font-medium text-sm border-t border-slate-100"><span className="material-symbols-outlined text-emerald-600">vaccines</span> Registrar Dose</button>
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
                            const tagStyle = firstTagId ? getTagInfo(firstTagId) : TAG_COLORS[11];
                            const tagData = allClinicTags.find(t => t.id === firstTagId);

                            return (
                                <div
                                    key={item.id}
                                    className={`p-4 flex items-center justify-between border-l-4 bg-white rounded-r-2xl shadow-sm hover:shadow-md transition-all cursor-pointer ${tagStyle?.border.replace('border-', 'border-l-')}`}
                                    onClick={() => p && onViewPatient(p as any)}
                                >
                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-blue-600 font-bold overflow-hidden border border-slate-200 flex-shrink-0">
                                            {p?.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" /> : (p?.initials || '?')}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-bold text-slate-900 text-sm truncate">{p?.name || 'Paciente'}</h4>

                                            {/* TAG, DATA E MG NA MESMA LINHA */}
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                {tagData && (
                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase shadow-sm ${tagStyle?.bg} ${tagStyle?.text} ${tagStyle?.border}`}>
                                                        {tagData.name}
                                                    </span>
                                                )}
                                                <span className="text-xs text-slate-400 font-medium">
                                                    • {new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} • {item.dosage}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`material-symbols-outlined ${tagStyle?.text} opacity-20`}>chevron_right</span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Modal de Busca de Paciente */}
            {isPatientSelectorOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-900">Registrar Dose</h3>
                            <button onClick={() => setIsPatientSelectorOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar paciente..."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl mb-4 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                            value={patientSearchTerm}
                            onChange={(e) => setPatientSearchTerm(e.target.value)}
                            autoFocus
                        />
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                            {patientSearchResults.map(p => (
                                <button key={p.id} onClick={() => { setSelectedPatientForDose(p); setIsPatientSelectorOpen(false); setIsDoseModalOpen(true); }} className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 rounded-xl transition-all text-left border border-transparent hover:border-blue-100">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">{p.initials}</div>
                                    <div className="flex-1 font-bold text-slate-900">{p.name}</div>
                                    <span className="material-symbols-outlined text-slate-300 group-hover:text-blue-500">add_circle</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {isDoseModalOpen && selectedPatientForDose && (
                <GlobalRegisterDoseModal
                    isOpen={isDoseModalOpen}
                    onClose={() => { setIsDoseModalOpen(false); setSelectedPatientForDose(null); }}
                    onSuccess={() => { fetchDashboardData(); setIsDoseModalOpen(false); setSelectedPatientForDose(null); }}
                    initialPatient={selectedPatientForDose}
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