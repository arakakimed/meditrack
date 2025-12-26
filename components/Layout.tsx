
import React, { useState, useRef, useEffect } from 'react';
import type { View } from '../App';
import { supabase } from '../lib/supabase';

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
}

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
                    <div className="flex items-center gap-3 px-2 py-1">
                        <div className="size-8 text-primary">
                            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4 42.4379C4 42.4379 14.0962 36.0744 24 41.1692C35.0664 46.8624 44 42.2078 44 42.2078L44 7.01134C44 7.01134 35.068 11.6577 24.0031 5.96913C14.0971 0.876274 4 7.27094 4 7.27094L4 42.4379Z" fill="currentColor"></path>
                            </svg>
                        </div>
                        <h2 className="text-slate-900 dark:text-white text-lg font-bold tracking-tight">MediSlim Clinic</h2>
                    </div>
                    <nav className="flex flex-col gap-1">
                        <NavLink view={view} setView={setView} targetView="dashboard" icon="dashboard" label="Painel" />
                        <NavLink view={view} setView={setView} targetView="patients" icon="group" label="Pacientes" isFilled={true} />
                        <NavLink view={view} setView={setView} targetView="schedule" icon="calendar_today" label="Agenda" />
                        <NavLink view={view} setView={setView} targetView="medications" icon="medication" label="Medicações" />
                        <NavLink view={view} setView={setView} targetView="financials" icon="payments" label="Financeiro" />
                        <NavLink view={view} setView={setView} targetView="settings" icon="settings" label="Configurações" />
                    </nav>
                </div>                <div className="flex items-center justify-between p-3 mt-auto rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 bg-slate-200" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuC3NXmUohveOo6a47pxNaYAR57Lnr7R8pgrljSfdtnJoS7_tfCHPbMvf5-ax1OVU2l5jHdepws4E704Do88J__MBDMlYngmPscz4AIfx9P9EI3Nzs3pY2RLTenIsug3vSQsRSX5OwbrFBmfmKLu058WPyoYtm8ca2E4H6IvHxdx6JUSGUQeTWm2qk_tgrYKlhhk70N4DmYD7CskAtuwNlvweGbM2OCOZvs9WN7bV6w5SEbKtf8h3Gj572RkOKSvGdt_c_oPFSpCwYY")' }}></div>
                        <div className="flex flex-col min-w-0">
                            <h1 className="text-slate-900 dark:text-white text-sm font-medium truncate">Dr. Silva</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-xs truncate">Admin Clínica</p>
                        </div>
                    </div>
                    <button
                        onClick={() => supabase.auth.signOut()}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all opacity-0 group-hover:opacity-100"
                        title="Sair"
                    >
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                    </button>
                </div>
            </div>
        </aside>
    );
};

const HeaderNavLink: React.FC<{
    view: View;
    targetView: View;
    setView: (view: View) => void;
    label: string;
}> = ({ view, targetView, setView, label }) => {
    const isActive = view === targetView;
    return (
        <a
            href="#"
            onClick={(e) => { e.preventDefault(); setView(targetView); }}
            className={`text-sm font-medium transition-colors hover:text-primary ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
        >
            {label}
        </a>
    );
};

const NotificationDropdown: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    notifications: Notification[];
    onMarkAllRead: () => void;
}> = ({ isOpen, onClose, notifications, onMarkAllRead }) => {
    const dropdownRef = useRef<HTMLDivElement>(null);
    const unreadCount = notifications.filter(n => !n.read).length;

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

    const getTypeIcon = (type: Notification['type']) => {
        switch (type) {
            case 'dose': return 'vaccines';
            case 'schedule': return 'calendar_today';
            case 'alert': return 'warning';
            case 'info': return 'info';
        }
    };

    const getTypeColor = (type: Notification['type']) => {
        switch (type) {
            case 'dose': return 'text-green-500';
            case 'schedule': return 'text-blue-500';
            case 'alert': return 'text-amber-500';
            case 'info': return 'text-slate-400';
        }
    };

    if (!isOpen) return null;

    return (
        <div ref={dropdownRef} className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-white">Notificações</h3>
                    {unreadCount > 0 && (
                        <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">{unreadCount}</span>
                    )}
                </div>
                {unreadCount > 0 && (
                    <button onClick={onMarkAllRead} className="text-xs font-medium text-primary hover:underline">
                        Marcar todas como lidas
                    </button>
                )}
            </div>
            <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-500">
                        <span className="material-symbols-outlined text-4xl mb-2">notifications_off</span>
                        <p className="text-sm">Nenhuma notificação</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                        {notifications.map((notification) => (
                            <li key={notification.id} className={`px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors ${!notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                <div className="flex gap-3">
                                    <div className={`flex-shrink-0 size-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center ${getTypeColor(notification.type)}`}>
                                        <span className="material-symbols-outlined text-lg">{getTypeIcon(notification.type)}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className={`text-sm font-semibold truncate ${!notification.read ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                                {notification.title}
                                            </p>
                                            {!notification.read && (
                                                <span className="size-2 bg-primary rounded-full flex-shrink-0"></span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{notification.message}</p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{notification.time}</p>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <button className="w-full text-center text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                    Ver todas as notificações
                </button>
            </div>
        </div>
    );
};

const NotificationButton: React.FC<{ className?: string }> = ({ className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
    const unreadCount = notifications.filter(n => !n.read).length;

    const handleMarkAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2 text-slate-500 hover:text-primary dark:text-slate-400 transition-colors relative ${className}`}
            >
                <span className="material-symbols-outlined">notifications</span>
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 size-2.5 bg-red-500 rounded-full border-2 border-white dark:border-[#0f1723] animate-pulse"></span>
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

const DashboardHeader: React.FC<{ view: View, setView: (view: View) => void, onOpenGlobalDose: () => void }> = ({ view, setView, onOpenGlobalDose }) => (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#0f1723]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
                            <span className="material-symbols-outlined">local_hospital</span>
                        </div>
                        <h1 className="text-slate-900 dark:text-white text-lg font-bold tracking-tight hidden md:block">MediTrack</h1>
                    </div>
                    <nav className="hidden md:flex items-center gap-6">
                        <HeaderNavLink view={view} setView={setView} targetView="dashboard" label="Painel" />
                        <HeaderNavLink view={view} setView={setView} targetView="patients" label="Pacientes" />
                        <HeaderNavLink view={view} setView={setView} targetView="schedule" label="Agenda" />
                        <HeaderNavLink view={view} setView={setView} targetView="medications" label="Medicações" />
                        <HeaderNavLink view={view} setView={setView} targetView="financials" label="Financeiro" />
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={onOpenGlobalDose}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-full text-xs font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95 group"
                    >
                        <span className="material-symbols-outlined text-lg group-hover:rotate-12 transition-transform">vaccines</span>
                        <span className="hidden sm:inline">Aplicar Dose</span>
                    </button>
                    <div className="hidden md:flex relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
                        </div>
                        <input className="block w-full rounded-full border-0 bg-slate-100 dark:bg-slate-800 py-2 pl-10 pr-4 text-slate-900 dark:text-white ring-1 ring-inset ring-transparent placeholder:text-slate-400 focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-slate-900 sm:text-sm sm:leading-6 transition-all" placeholder="Buscar paciente..." type="text" />
                    </div>
                    <NotificationButton />
                    <button onClick={() => setView('settings')} className="p-2 text-slate-500 hover:text-primary dark:text-slate-400 transition-colors">
                        <span className="material-symbols-outlined">settings</span>
                    </button>
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
                </div>
            </div>
        </div>
    </header>
);

const AppHeader: React.FC<{ onOpenGlobalDose: () => void }> = ({ onOpenGlobalDose }) => (
    <header className="flex items-center justify-between whitespace-nowrap bg-surface-light dark:bg-surface-dark border-b border-slate-200 dark:border-slate-700 px-8 py-4 z-10">
        <button className="md:hidden mr-4 text-slate-500">
            <span className="material-symbols-outlined">menu</span>
        </button>
        <div className="flex flex-1 max-w-md">
            <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <span className="material-symbols-outlined text-slate-400">search</span>
                </div>
                <input className="block w-full p-2.5 pl-10 text-sm text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-primary placeholder-slate-400" placeholder="Buscar pacientes, agendamentos..." type="text" />
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
            <button className="p-2 text-slate-500 hover:text-primary transition-colors">
                <span className="material-symbols-outlined">chat_bubble</span>
            </button>
        </div>
    </header>
);

const Layout: React.FC<LayoutProps> = ({ view, setView, onOpenGlobalDose, children }) => {
    const isDashboard = view === 'dashboard';

    if (isDashboard) {
        return (
            <div className="text-slate-900 dark:text-white min-h-screen flex flex-col font-display">
                <DashboardHeader view={view} setView={setView} onOpenGlobalDose={onOpenGlobalDose} />
                <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {children}
                </main>
            </div>
        );
    }

    // Default layout with sidebar
    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display h-screen overflow-hidden flex">
            <Sidebar view={view} setView={setView} />
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
                <AppHeader onOpenGlobalDose={onOpenGlobalDose} />
                <main className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark p-6 md:p-8 relative">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
