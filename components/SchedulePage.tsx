import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Patient, Appointment } from '../types';
import NewAppointmentModal from './NewAppointmentModal';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface TagMap {
    [id: string]: { name: string; color: string };
}

interface CalendarEvent {
    id: string;
    date: Date;
    patientId: string;
    patientName: string;
    patientInitials: string;
    patientAvatar?: string;
    patientTags?: string[];
    type: 'injection' | 'forecast';
    status: 'Applied' | 'Scheduled' | 'Delayed' | 'Skipped' | 'Current';
    dosage?: string;
    journeyStatus?: string; // To store original status like 'Atual'
}

const CalendarHeader: React.FC<{
    currentDate: Date;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    onToday: () => void;
    onNewAppointment: () => void;
}> = ({ currentDate, onPrevMonth, onNextMonth, onToday, onNewAppointment }) => (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
            <button onClick={onPrevMonth} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white w-56 text-center capitalize">
                {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
            </h2>
            <button onClick={onNextMonth} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <span className="material-symbols-outlined">chevron_right</span>
            </button>
        </div>
        <div className="flex items-center gap-4">
            <button onClick={onToday} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                Hoje
            </button>
            <button onClick={onNewAppointment} className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-base">add</span>
                Novo Agendamento
            </button>
        </div>
    </div>
);

const AppointmentItem: React.FC<{ event: CalendarEvent, tagMap: TagMap, onViewPatient: (patientId: string) => void }> = ({ event, tagMap, onViewPatient }) => {
    // Determine status
    const isCurrent = event.status === 'Current';

    // Get Primary Tag Color
    const firstTagId = event.patientTags?.[0];
    const tagData = firstTagId ? tagMap[firstTagId] : null;
    const tagColor = tagData?.color?.toLowerCase() || 'slate';

    // Time formatting
    const time = event.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Helper for color styles
    const getColorClasses = (color: string) => {
        const map: Record<string, string> = {
            rose: 'bg-rose-50 border-rose-100 hover:border-rose-300 text-rose-900',
            pink: 'bg-pink-50 border-pink-100 hover:border-pink-300 text-pink-900',
            fuchsia: 'bg-fuchsia-50 border-fuchsia-100 hover:border-fuchsia-300 text-fuchsia-900',
            purple: 'bg-purple-50 border-purple-100 hover:border-purple-300 text-purple-900',
            violet: 'bg-violet-50 border-violet-100 hover:border-violet-300 text-violet-900',
            indigo: 'bg-indigo-50 border-indigo-100 hover:border-indigo-300 text-indigo-900',
            blue: 'bg-blue-50 border-blue-100 hover:border-blue-300 text-blue-900',
            sky: 'bg-sky-50 border-sky-100 hover:border-sky-300 text-sky-900',
            cyan: 'bg-cyan-50 border-cyan-100 hover:border-cyan-300 text-cyan-900',
            teal: 'bg-teal-50 border-teal-100 hover:border-teal-300 text-teal-900',
            emerald: 'bg-emerald-50 border-emerald-100 hover:border-emerald-300 text-emerald-900',
            green: 'bg-green-50 border-green-100 hover:border-green-300 text-green-900',
            lime: 'bg-lime-50 border-lime-100 hover:border-lime-300 text-lime-900',
            yellow: 'bg-yellow-50 border-yellow-100 hover:border-yellow-300 text-yellow-900',
            amber: 'bg-amber-50 border-amber-100 hover:border-amber-300 text-amber-900',
            orange: 'bg-orange-50 border-orange-100 hover:border-orange-300 text-orange-900',
            red: 'bg-red-50 border-red-100 hover:border-red-300 text-red-900',
            slate: 'bg-slate-50 border-slate-100 hover:border-slate-300 text-slate-900',
            gray: 'bg-gray-50 border-gray-100 hover:border-gray-300 text-gray-900',
            zinc: 'bg-zinc-50 border-zinc-100 hover:border-zinc-300 text-zinc-900',
            neutral: 'bg-neutral-50 border-neutral-100 hover:border-neutral-300 text-neutral-900',
            stone: 'bg-stone-50 border-stone-100 hover:border-stone-300 text-stone-900',
        };
        return map[color] || map['slate'];
    };

    const colorClass = getColorClasses(tagColor);

    return (
        <div
            onClick={() => onViewPatient(event.patientId)}
            className={`
                group flex items-center gap-2 p-2 mb-1.5 rounded-lg border transition-all cursor-pointer shadow-sm
                ${colorClass}
                ${isCurrent ? 'ring-1 ring-blue-400 ring-offset-1' : ''}
            `}
        >
            {/* Avatar removed per user request */}

            {/* Info */}
            <div className="flex items-center justify-between min-w-0 flex-1">
                <span className="text-[11px] font-bold leading-tight truncate opacity-90">
                    {event.patientName}
                </span>
                {event.status === 'Applied' && (
                    <span className="material-symbols-outlined text-[14px] text-emerald-600 ml-1" title="Aplicada">
                        check_circle
                    </span>
                )}
            </div>
        </div>
    )
}

const SchedulePage: React.FC<{ onViewPatient: (patientId: string) => void }> = ({ onViewPatient }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);
    const [tagMap, setTagMap] = useState<TagMap>({});

    const fetchEvents = async () => {
        setLoading(true);
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        // Adjust buffers for calendar view (overflow days)
        startOfMonth.setDate(startOfMonth.getDate() - 7);
        endOfMonth.setDate(endOfMonth.getDate() + 14);

        try {
            const startStr = startOfMonth.toISOString();
            const endStr = endOfMonth.toISOString();

            // 0. Fetch Clinic Tags and build Map
            const { data: tagsData } = await supabase.from('clinic_tags').select('id, name, color');
            const newTagMap: TagMap = {};
            tagsData?.forEach((t: any) => {
                newTagMap[t.id] = { name: t.name, color: t.color };
            });
            setTagMap(newTagMap);

            // 1. Fetch Injections (Done/Skipped)
            const { data: injections } = await supabase
                .from('injections')
                .select(`
                    id, 
                    applied_at, 
                    created_at,
                    status, 
                    dosage,
                    patient:patients (id, name, initials, avatar_url, tags)
                `);

            // 2. Fetch Medication Steps (Forecast)
            const { data: steps } = await supabase
                .from('medication_steps')
                .select(`
                    id,
                    date,
                    status,
                    dosage,
                    patient:patients (id, name, initials, avatar_url, tags)
                `);

            const allEvents: CalendarEvent[] = [];
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Process Injections
            injections?.forEach((inj: any) => {
                // Fallback to created_at if applied_at is missing
                const dateSource = inj.applied_at || inj.created_at;
                if (!dateSource || !inj.patient) return;

                let dateObj: Date;
                // Robust parsing to force Local Timestamp at Noon (12:00:00)
                if (dateSource.includes('T')) {
                    const [y, m, d] = dateSource.split('T')[0].split('-').map(Number);
                    dateObj = new Date(y, m - 1, d, 12, 0, 0);
                } else if (dateSource.includes('-')) {
                    const [y, m, d] = dateSource.split('-').map(Number);
                    dateObj = new Date(y, m - 1, d, 12, 0, 0);
                } else {
                    dateObj = new Date(dateSource);
                    dateObj.setHours(12, 0, 0, 0);
                }

                // Fix: Check for 'Applied' (DB value) not 'Aplicada' (UI value)
                const status = (inj.status === 'Applied' || inj.status === 'Aplicada') ? 'Applied' : 'Skipped';

                allEvents.push({
                    id: inj.id,
                    date: dateObj,
                    patientId: inj.patient.id,
                    patientName: inj.patient.name,
                    patientInitials: inj.patient.initials,
                    patientAvatar: inj.patient.avatar_url,
                    patientTags: inj.patient.tags,
                    type: 'injection',
                    status: status,
                    dosage: inj.dosage
                });
            });

            // Process Forecast Steps
            steps?.forEach((step: any) => {
                // console.log('DEBUG: Processing step', step);
                if (!step.patient || !step.date) return;

                // Try parsing date - handle both YYYY-MM-DD and "dd de MMM" strings
                let dateObj: Date | null = null;
                const dateStr = step.date;

                if (dateStr.includes('-') && !dateStr.includes('de')) {
                    // ISO YYYY-MM-DD
                    const cleanDate = dateStr.split('T')[0];
                    const [y, m, d] = cleanDate.split('-').map(Number);
                    dateObj = new Date(y, m - 1, d, 12, 0, 0);
                } else if (dateStr.includes('de')) {
                    // "26 de dez." format
                    const parts = dateStr.split(' de ');
                    if (parts.length >= 2) {
                        const day = parseInt(parts[0]);
                        let monthStr = parts[1].toLowerCase().replace('.', '').trim();
                        // Map months
                        const monthMap: { [key: string]: number } = {
                            'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3, 'mai': 4, 'jun': 5,
                            'jul': 6, 'ago': 7, 'set': 8, 'out': 9, 'nov': 10, 'dez': 11
                        };
                        const month = monthMap[monthStr];
                        if (month !== undefined) {
                            const year = new Date().getFullYear(); // Assume current year
                            dateObj = new Date(year, month, day, 12, 0, 0);
                        }
                    }
                }

                if (!dateObj) {
                    console.warn('DEBUG: Invalid date format', step.date);
                    return;
                }

                if (!dateObj) return;

                // Check conflict: Is there already an injection for this patient on this date?
                // If status is 'Concluído', we skip it because it should be in the 'injections' list (History)
                if (step.status === 'Concluído') return;

                // Determine Status
                let status: 'Scheduled' | 'Delayed' | 'Current' = 'Scheduled';

                if (step.status === 'Atual') {
                    status = 'Current';
                } else if (dateObj < today) {
                    status = 'Delayed';
                }

                allEvents.push({
                    id: step.id,
                    date: dateObj,
                    patientId: step.patient.id,
                    patientName: step.patient.name,
                    patientInitials: step.patient.initials,
                    patientAvatar: step.patient.avatar_url,
                    patientTags: step.patient.tags,
                    type: 'forecast',
                    status: status,
                    dosage: step.dosage,
                    journeyStatus: step.status
                });
            });

            setEvents(allEvents);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, [currentDate]);

    const calendarDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const startDayOfWeek = firstDayOfMonth.getDay();
        const endDayOfWeek = lastDayOfMonth.getDay();

        const days = [];

        // Days from previous month
        for (let i = startDayOfWeek; i > 0; i--) {
            const date = new Date(year, month, 1 - i);
            days.push({ date, isCurrentMonth: false });
        }

        // Days from current month
        for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
            const date = new Date(year, month, i);
            days.push({ date, isCurrentMonth: true });
        }

        // Days from next month
        for (let i = 1; i < 7 - endDayOfWeek; i++) {
            const date = new Date(year, month + 1, i);
            days.push({ date, isCurrentMonth: false });
        }

        return days;
    }, [currentDate]);

    // Helper for consistent keys
    const getDateKey = (date: Date) => {
        return `${date.getFullYear()} -${String(date.getMonth() + 1).padStart(2, '0')} -${String(date.getDate()).padStart(2, '0')} `;
    };

    const eventsByDay = useMemo(() => {
        const grouped: { [key: string]: CalendarEvent[] } = {};
        events.forEach(ev => {
            const key = getDateKey(ev.date);
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(ev);
        });
        return grouped;
    }, [events]);

    const handlePrevMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    const handleToday = () => setCurrentDate(new Date());

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    return (
        <div className="h-full flex flex-col">
            <CalendarHeader
                currentDate={currentDate}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
                onToday={handleToday}
                onNewAppointment={() => setIsNewAppointmentModalOpen(true)}
            />

            <div className="grid grid-cols-7 bg-white dark:bg-surface-dark border-y border-x border-slate-200 dark:border-slate-700 rounded-t-lg">
                {WEEKDAYS.map(day => (
                    <div key={day} className="text-center p-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                        {day}
                    </div>
                ))}
            </div>

            <div className={`grid grid-cols-7 grid-rows-5 flex-1 border-b border-x border-slate-200 dark:border-slate-700 rounded-b-lg overflow-hidden transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                {calendarDays.map(({ date, isCurrentMonth }, index) => {
                    const dayEvents = eventsByDay[getDateKey(date)] || [];

                    return (
                        <div key={index} className={`relative p-2 border-r border-t border-slate-200 dark:border-slate-700 flex flex-col ${isCurrentMonth ? '' : 'bg-slate-50/50 dark:bg-slate-800/20'}`}>
                            <div className="flex justify-between items-center mb-1">
                                {dayEvents.length > 0 && isCurrentMonth && (
                                    <span className="text-[10px] font-bold text-slate-400">{dayEvents.length}</span>
                                )}
                                <time dateTime={date.toISOString()} className={`ml-auto text-xs font-semibold flex items-center justify-center size-6 rounded-full ${isToday(date) ? 'bg-primary text-white' : isCurrentMonth ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
                                    {date.getDate()}
                                </time>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-1 -mx-1 px-1 custom-scrollbar">
                                {dayEvents.map(ev => (
                                    <AppointmentItem
                                        key={ev.id}
                                        event={ev}
                                        tagMap={tagMap}
                                        onViewPatient={onViewPatient}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <NewAppointmentModal
                isOpen={isNewAppointmentModalOpen}
                onClose={() => setIsNewAppointmentModalOpen(false)}
                onSuccess={() => fetchEvents()}
            />
        </div>
    );
};

export default SchedulePage;
