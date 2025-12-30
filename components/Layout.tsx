
import React, { useState, useRef, useEffect } from 'react';
import type { View } from '../App';
import { supabase } from '../lib/supabase';
import MessagingModal from './MessagingModal';
import AddUserModal from './AddUserModal';
import { User } from '../types';

interface Notification {
    id: string;
    title: string;
    message: string;
    time: string;
    read: boolean;
    type: 'dose' | 'schedule' | 'alert' | 'info';
}

const mockNotifications: Notification[] = [
    { id: '1', title: 'Dose Atrasada', message: 'Paciente Ana Silva está aguardando dose de 2.5mg', time: '5 min atrás', read: false, type: 'alert' },
    { id: '2', title: 'Novo Agendamento', message: 'Carlos Souza agendou consulta para amanhã às 10:00', time: '15 min atrás', read: false, type: 'schedule' },
    { id: '3', title: 'Estoque Baixo', message: 'Tirzepatida 5.0mg com apenas 8 frascos', time: '1 hora atrás', read: false, type: 'alert' },
    { id: '4', title: 'Dose Aplicada', message: 'Mariana Costa recebeu dose de 10.0mg com sucesso', time: '2 horas atrás', read: true, type: 'dose' },
    { id: '5', title: 'Lembrete', message: 'Reunião de equipe às 16:00', time: '3 horas atrás', read: true, type: 'info' },
];

interface LayoutProps {
    view: View;
    setView: (view: View) => void;
    onOpenGlobalDose: () => void;
    children: React.ReactNode;
    onViewPatient?: (patientId: string) => void; // Add patient navigation callback
    userRole?: string | null; // Added userRole
}

interface SearchPatient {
    id: string;
    name: string;
    initials: string;
    avatar_url?: string;
    tags?: string[];
}

const SearchDropdown: React.FC<{
    query: string;
    results: SearchPatient[];
    isOpen: boolean;
    onClose: () => void;
    onSelectPatient: (patientId: string) => void;
}> = ({ query, results, isOpen, onClose, onSelectPatient }) => {
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    if (!isOpen || query.length < 2) return null;

    return (
        <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 max-h-96 overflow-y-auto">
            {results.length === 0 ? (
                <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                    <span className="material-symbols-outlined text-3xl mb-2">person_search</span>
                    <p className="text-sm">Nenhum paciente encontrado</p>
                </div>
            ) : (
                <ul>
                    {results.map((patient) => (
                        <li
                            key={patient.id}
                            onClick={() => {
                                onSelectPatient(patient.id);
                                onClose();
                            }}
                            className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                                    {patient.initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{patient.name}</p>
                                    {patient.tags && patient.tags.length > 0 && (
                                        <div className="flex gap-1 mt-1">
                                            {patient.tags.slice(0, 2).map((tag, idx) => (
                                                <span key={idx} className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const PatientSearch: React.FC<{
    onSelectPatient: (patientId: string) => void,
    placeholder?: string,
    className?: string
}> = ({ onSelectPatient, placeholder = "Buscar paciente...", className = "" }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchPatient[]>([]);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // Debounce search
    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            setIsSearchOpen(false);
            return;
        }

        const timeoutId = setTimeout(async () => {
            setIsSearching(true);
            const { data, error } = await supabase
                .from('patients')
                .select('id, name, initials, avatar_url, tags')
                .ilike('name', `%${searchQuery}%`)
                .limit(5);

            if (!error && data) {
                setSearchResults(data as SearchPatient[]);
                setIsSearchOpen(true);
            }
            setIsSearching(false);
        }, 300); // 300ms debounce

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    return (
        <div className={`relative ${className}`}>
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
            </div>
            <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setIsSearchOpen(true)}
                className="block w-full rounded-full border-0 bg-slate-100 dark:bg-slate-800 py-2 pl-10 pr-4 text-slate-900 dark:text-white ring-1 ring-inset ring-transparent placeholder:text-slate-400 focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-slate-900 sm:text-sm sm:leading-6 transition-all"
                placeholder={placeholder}
            />
            {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                </div>
            )}
            <SearchDropdown
                query={searchQuery}
                results={searchResults}
                isOpen={isSearchOpen}
                onClose={() => {
                    setIsSearchOpen(false);
                    setSearchQuery('');
                }}
                onSelectPatient={onSelectPatient}
            />
        </div>
    );
};

const NavLink: React.FC<{
    view: View;
    targetView: View;
    setView: (view: View) => void;
    icon: string;
    label: string;
    isFilled?: boolean;
}> = ({ view, targetView, setView, icon, label, isFilled }) => {
    const isActive = view === targetView || (view === 'patientProfile' && targetView === 'patients');
    return (
        <a href="#" onClick={(e) => { e.preventDefault(); setView(targetView); }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive
                ? 'bg-primary/10 text-primary'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}>
            <span className={`material-symbols-outlined text-[24px] ${isFilled && isActive ? 'fill-1' : ''}`}>{icon}</span>
            <span className="text-sm font-medium">{label}</span>
        </a>
    );
};

const Sidebar: React.FC<{ view: View, setView: (view: View) => void }> = ({ view, setView }) => {
    return (
        <aside className="w-64 hidden md:flex flex-col bg-surface-light dark:bg-surface-dark border-r border-slate-200 dark:border-slate-700 h-full flex-shrink-0 z-20">
            <div className="flex flex-col h-full justify-between p-4">
                <div className="flex flex-col gap-6">
                    <div className="px-2 pt-2 flex items-center gap-3">
                        <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary">
                            <span className="material-symbols-outlined text-2xl">local_hospital</span>
                        </div>
                        <h1 className="text-slate-900 dark:text-white text-xl font-bold tracking-tight">MediTrack</h1>
                    </div>

                    <div className="flex flex-col gap-1">
                        <NavLink view={view} targetView="dashboard" setView={setView} icon="grid_view" label="Dashboard" isFilled />
                        <NavLink view={view} targetView="patients" setView={setView} icon="group" label="Pacientes" isFilled />
                        <NavLink view={view} targetView="schedule" setView={setView} icon="calendar_month" label="Agenda" isFilled />
                        <NavLink view={view} targetView="medications" setView={setView} icon="medication" label="Medicamentos" isFilled />
                        <NavLink view={view} targetView="financials" setView={setView} icon="attach_money" label="Financeiro" />
                    </div>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                    <div className="flex flex-col gap-1">
                        <NavLink view={view} targetView="settings" setView={setView} icon="settings" label="Configurações" isFilled />
                    </div>
                </div>
            </div>
        </aside>
    );
};

// ... MobileSidebar (keep similar but omit for brevity in 'write_to_file' if not changing, but I must provide full file or at least the part I'm replacing. 
// I will provide the FULL file to be safe, assuming MobileSidebar basically mirrors Sidebar logic)

const MobileSidebar: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    view: View;
    setView: (view: View) => void;
}> = ({ isOpen, onClose, view, setView }) => {
    // ... same content potentially
    // Since I don't see MobileSidebar in valid view_file but I can infer it's similar...
    // Actually, let's keep it defined here.
    return (
        <>
            {isOpen && <div className="fixed inset-0 bg-slate-900/50 z-40 md:hidden" onClick={onClose}></div>}
            <div className={`fixed inset-y-0 left-0 w-64 bg-surface-light dark:bg-surface-dark z-50 transform transition-transform duration-300 md:hidden flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-lg text-primary">MediTrack</span>
                    <button onClick={onClose}><span className="material-symbols-outlined">close</span></button>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    <NavLink view={view} targetView="dashboard" setView={(v) => { setView(v); onClose(); }} icon="grid_view" label="Dashboard" isFilled />
                    <NavLink view={view} targetView="patients" setView={(v) => { setView(v); onClose(); }} icon="group" label="Pacientes" isFilled />
                    <NavLink view={view} targetView="schedule" setView={(v) => { setView(v); onClose(); }} icon="calendar_month" label="Agenda" isFilled />
                    <NavLink view={view} targetView="medications" setView={(v) => { setView(v); onClose(); }} icon="medication" label="Medicamentos" isFilled />
                    <NavLink view={view} targetView="financials" setView={(v) => { setView(v); onClose(); }} icon="attach_money" label="Financeiro" />
                    <div className="h-px bg-slate-200 dark:bg-slate-700 my-2"></div>
                    <NavLink view={view} targetView="settings" setView={(v) => { setView(v); onClose(); }} icon="settings" label="Configurações" isFilled />
                </nav>
            </div>
        </>
    );
}


const NotificationDropdown: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    notifications: Notification[];
    onMarkAllRead: () => void;
}> = ({ isOpen, onClose, notifications, onMarkAllRead }) => {
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div ref={dropdownRef} className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 origin-top-right animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-white">Notificações</h3>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {notifications.filter(n => !n.read).length}
                    </span>
                </div>
                {notifications.some(n => !n.read) && (
                    <button onClick={onMarkAllRead} className="text-xs font-medium text-primary hover:text-blue-700 transition-colors">
                        Marcar todas como lidas
                    </button>
                )}
            </div>
            <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                        <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">notifications_off</span>
                        <p>Nenhuma notificação nova</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                        {notifications.map((notification) => (
                            <li key={notification.id} className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer ${!notification.read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                                <div className="flex gap-3">
                                    <div className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${!notification.read ? 'bg-primary' : 'bg-transparent'}`}></div>
                                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${notification.type === 'alert' ? 'bg-red-100 text-red-600' :
                                        notification.type === 'schedule' ? 'bg-purple-100 text-purple-600' :
                                            notification.type === 'dose' ? 'bg-green-100 text-green-600' :
                                                'bg-blue-100 text-blue-600'
                                        }`}>
                                        <span className="material-symbols-outlined text-sm">
                                            {notification.type === 'alert' ? 'warning' :
                                                notification.type === 'schedule' ? 'event' :
                                                    notification.type === 'dose' ? 'vaccines' : 'info'}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm ${!notification.read ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                                            {notification.title}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notification.message}</p>
                                        <p className="text-[10px] text-slate-400 mt-1.5">{notification.time}</p>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <div className="p-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                <button className="w-full py-2 text-xs font-medium text-slate-500 hover:text-primary transition-colors">
                    Ver histórico completo
                </button>
            </div>
        </div>
    );
}

const NotificationButton: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

    // Auto-close logic should be in parent or handled via overlay, but simplifying for now

    const handleMarkAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-500 hover:text-primary dark:text-slate-400 transition-colors"
            >
                <span className="material-symbols-outlined">notifications</span>
                {notifications.some(n => !n.read) && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                )}
            </button>
            <NotificationDropdown
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                notifications={notifications}
                onMarkAllRead={handleMarkAllRead}
            />
        </div>
    );
};

const DashboardHeader: React.FC<{
    view: View,
    setView: (view: View) => void,
    onOpenGlobalDose: () => void,
    onViewPatient?: (patientId: string) => void,
    onOpenMessaging: () => void,
    currentUser: User | null,
    onProfileClick: () => void
}> = ({ view, setView, onOpenGlobalDose, onViewPatient, onOpenMessaging, currentUser, onProfileClick }) => (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#0f1723]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
                        <span className="material-symbols-outlined">local_hospital</span>
                    </div>
                    <h1 className="text-slate-900 dark:text-white text-lg font-bold tracking-tight hidden md:block">MediTrack</h1>
                </div>

                <div className="flex-1 max-w-xl mx-auto px-8 hidden md:block">
                    {onViewPatient && (
                        <PatientSearch
                            onSelectPatient={onViewPatient}
                            className="w-full"
                        />
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={onOpenGlobalDose}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-full text-xs font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95 group"
                    >
                        <span className="material-symbols-outlined text-lg group-hover:rotate-12 transition-transform">vaccines</span>
                        <span className="hidden sm:inline">Aplicar Dose</span>
                    </button>

                    <NotificationButton />
                    <button onClick={onOpenMessaging} className="p-2 text-slate-500 hover:text-primary dark:text-slate-400 transition-colors">
                        <span className="material-symbols-outlined">chat_bubble</span>
                    </button>
                    <button onClick={() => setView('settings')} className="p-2 text-slate-500 hover:text-primary dark:text-slate-400 transition-colors">
                        <span className="material-symbols-outlined">settings</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <div
                            className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden ring-2 ring-white dark:ring-slate-800 cursor-pointer bg-cover bg-center transition-transform hover:scale-110 active:scale-95"
                            style={{ backgroundImage: `url('${currentUser?.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"}')` }}
                            onClick={onProfileClick}
                        >
                            {!currentUser?.avatarUrl && <span className="flex w-full h-full items-center justify-center text-xs font-bold">{currentUser?.initials || 'U'}</span>}
                        </div>
                        <button
                            onClick={() => supabase.auth.signOut()}
                            className="p-2 text-slate-500 hover:text-red-500 transition-colors"
                            title="Sair"
                        >
                            <span className="material-symbols-outlined">logout</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </header>
);

const AppHeader: React.FC<{ onOpenGlobalDose: () => void, onToggleSidebar: () => void, onViewPatient?: (patientId: string) => void, onOpenMessaging: () => void }> = ({ onOpenGlobalDose, onToggleSidebar, onViewPatient, onOpenMessaging }) => (
    <header className="flex items-center justify-between whitespace-nowrap bg-surface-light dark:bg-surface-dark border-b border-slate-200 dark:border-slate-700 px-8 py-4 z-10">
        <button onClick={onToggleSidebar} className="md:hidden mr-4 text-slate-500 hover:text-primary transition-colors">
            <span className="material-symbols-outlined">menu</span>
        </button>
        <div className="flex flex-1 max-w-md">
            <div className="relative w-full">
                {onViewPatient ? (
                    <PatientSearch
                        onSelectPatient={onViewPatient}
                        placeholder="Buscar pacientes..."
                    />
                ) : (
                    <>
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <span className="material-symbols-outlined text-slate-400">search</span>
                        </div>
                        <input className="block w-full p-2.5 pl-10 text-sm text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-primary placeholder-slate-400" placeholder="Buscar pacientes, agendamentos..." type="text" />
                    </>
                )}
            </div>
        </div>
        <div className="flex items-center gap-4 ml-4">
            <button
                onClick={onOpenGlobalDose}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold transition-all border border-primary/20 group"
            >
                <span className="material-symbols-outlined text-lg group-hover:scale-110 transition-transform">vaccines</span>
                <span className="hidden lg:inline">Aplicar Medicação</span>
            </button>
            <NotificationButton />
            <button onClick={onOpenMessaging} className="p-2 text-slate-500 hover:text-primary transition-colors">
                <span className="material-symbols-outlined">chat_bubble</span>
            </button>
        </div>
    </header>
);

const AppHeaderSimple: React.FC = () => (
    <header className="flex items-center justify-between whitespace-nowrap bg-surface-light dark:bg-surface-dark border-b border-slate-200 dark:border-slate-700 px-8 py-4 z-10">
        <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
                <span className="material-symbols-outlined">local_hospital</span>
            </div>
            <h1 className="text-slate-900 dark:text-white text-lg font-bold tracking-tight">MediTrack</h1>
        </div>

        <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden ring-2 ring-white dark:ring-slate-800 cursor-pointer bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCBjkgvInMz37mw8dT1u6lWFYCKQusa46cpXGNMgvMjOvHHeOKsAkIPhVn7QWyDUsmCjlJqWMM5Dan6hj-WB5-UsB-nSUk55yQdHuI55XKDq_wBHpiUFOEkJ0r3e-7F0KIItgsH-145evCGSIixYGGlGIuXnkuwdQdVG6sL8MJ0o-F74jTzn_VBqX6RbJSGUzyMBWh5gOl41XjqUp1bP6yAnocUsQbNXTwRnuRVRQGrjAXwvwMubCvaFtA9h1c6NZ-TBQ17By7H_Fw')" }}>
            </div>
            <button
                onClick={() => supabase.auth.signOut()}
                className="p-2 text-slate-500 hover:text-red-500 transition-colors"
                title="Sair"
            >
                <span className="material-symbols-outlined">logout</span>
            </button>
        </div>
    </header>
);

const Layout: React.FC<LayoutProps> = ({ view, setView, onOpenGlobalDose, children, onViewPatient, userRole }) => {
    const isDashboard = view === 'dashboard';
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isMessagingOpen, setIsMessagingOpen] = useState(false);

    // User Profile State
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    const fetchCurrentUser = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                let profileData = null;

                // 1. Try Fetching from DB
                try {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single();

                    if (!error && data) {
                        profileData = data;
                    }
                } catch (dbErr) {
                    console.warn("DB Profile fetch failed, trying local storage", dbErr);
                }

                // 2. Fallback to LocalStorage if DB failed or returned null
                if (!profileData) {
                    const stored = localStorage.getItem('meditrack_profiles');
                    if (stored) {
                        try {
                            const profiles = JSON.parse(stored);
                            // Try matching by ID first
                            profileData = profiles.find((p: any) => p.id === user.id);

                            // If not found by ID, try Email (common in fallback scenarios with random IDs)
                            if (!profileData && user.email) {
                                profileData = profiles.find((p: any) => p.email?.toLowerCase() === user.email?.toLowerCase());
                            }
                        } catch (parseErr) {
                            console.error("Error parsing local profiles", parseErr);
                        }
                    }
                }

                // 3. Set User State
                if (profileData) {
                    setCurrentUser({
                        id: profileData.id, // Use profile ID (or user.id if strict)
                        name: profileData.name,
                        email: profileData.email || user.email!,
                        role: profileData.role,
                        status: profileData.status || 'Active',
                        avatarUrl: profileData.avatar_url || profileData.avatarUrl, // Support both snake_case and camelCase
                        initials: profileData.initials || (profileData.name ? profileData.name.substring(0, 2).toUpperCase() : 'U')
                    });
                } else {
                    // Minimal Fallback from Auth Metadata
                    setCurrentUser({
                        id: user.id,
                        name: user.user_metadata?.name || 'Usuário',
                        email: user.email!,
                        role: 'Staff',
                        status: 'Active',
                        avatarUrl: user.user_metadata?.avatar_url || null,
                        initials: user.user_metadata?.name ? user.user_metadata.name.substring(0, 2).toUpperCase() : 'U'
                    });
                }
            }
        } catch (err) {
            console.error("Error fetching current user", err);
        }
    };

    useEffect(() => {
        fetchCurrentUser();
    }, []);

    const handleProfileClick = () => {
        setIsProfileModalOpen(true);
    };

    // PATIENT VIEW: Simplified Layout
    if (userRole === 'Patient') {
        return (
            <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display min-h-screen flex flex-col">
                <AppHeaderSimple />
                <main className="flex-1 overflow-y-auto p-6 md:p-8 relative max-w-7xl mx-auto w-full">
                    {children}
                </main>
            </div>
        );
    }

    // DASHBOARD VIEW
    if (isDashboard) {
        return (
            <div className="text-slate-900 dark:text-white min-h-screen flex flex-col font-display">
                <DashboardHeader
                    view={view}
                    setView={setView}
                    onOpenGlobalDose={onOpenGlobalDose}
                    onViewPatient={onViewPatient}
                    onOpenMessaging={() => setIsMessagingOpen(true)}
                    currentUser={currentUser}
                    onProfileClick={handleProfileClick}
                />
                <MessagingModal isOpen={isMessagingOpen} onClose={() => setIsMessagingOpen(false)} />
                <AddUserModal
                    isOpen={isProfileModalOpen}
                    onClose={() => setIsProfileModalOpen(false)}
                    onSuccess={() => {
                        fetchCurrentUser(); // Refresh header
                        setIsProfileModalOpen(false);
                    }}
                    userToEdit={currentUser}
                    readOnlyRole={true} // LOCK ROLE
                />
                <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {children}
                </main>
            </div>
        );
    }

    // DEFAULT MANAGEMENT VIEW
    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display h-screen overflow-hidden flex">
            <Sidebar view={view} setView={setView} />
            <MobileSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                view={view}
                setView={setView}
            />
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
                <AppHeader onOpenGlobalDose={onOpenGlobalDose} onToggleSidebar={() => setIsSidebarOpen(true)} onViewPatient={onViewPatient} onOpenMessaging={() => setIsMessagingOpen(true)} />
                <MessagingModal isOpen={isMessagingOpen} onClose={() => setIsMessagingOpen(false)} />
                <AddUserModal
                    isOpen={isProfileModalOpen}
                    onClose={() => setIsProfileModalOpen(false)}
                    onSuccess={() => {
                        fetchCurrentUser(); // Refresh header
                        setIsProfileModalOpen(false);
                    }}
                    userToEdit={currentUser}
                    readOnlyRole={true} // LOCK ROLE
                />
                <main className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark p-6 md:p-8 relative">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
