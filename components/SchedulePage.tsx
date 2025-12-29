import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Patient, Appointment } from '../types';
import NewAppointmentModal from './NewAppointmentModal';
import { TAG_COLORS } from './TagManagerModal';

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
    journeyStatus?: string;
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

// Appointment Card Component with Tag Colors
const AppointmentListItem: React.FC<{
    event: CalendarEvent;
    tagMap: TagMap;
    onViewPatient: (patientId: string) => void;
}> = ({ event, tagMap, onViewPatient }) => {
    const firstTagId = event.patientTags?.[0];
    const tagData = firstTagId ? tagMap[firstTagId] : null;
    const tagColorName = tagData?.color || 'Slate';

    const tagColorData = TAG_COLORS.find(c => c.name === tagColorName) || TAG_COLORS[TAG_COLORS.length - 1];

    return (
        <div
            onClick={() => onViewPatient(event.patientId)}
            className="relative flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group overflow-hidden"
        >
            {/* Colored Left Border */}
            <div
                className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl"
                style={{ backgroundColor: tagColorData.hex }}
            />

            {/* Avatar or Initial Badge with Tag Color */}
            {event.patientAvatar ? (
                <div className="relative flex-shrink-0">
                    <img src={event.patientAvatar} alt={event.patientName} className="w-12 h-12 rounded-full object-cover ring-2 ring-offset-2" style={{ ringColor: tagColorData.hex }} />
                </div>
            ) : (
                <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold shadow-sm flex-shrink-0"
                    style={{
                        backgroundColor: tagColorData.hex,
                        color: '#fff'
                    }}
                >
                    {event.patientInitials}
                </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="font-bold text-base text-slate-900 dark:text-white truncate mb-1">{event.patientName}</p>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-slate-600 dark:text-slate-400">{event.dosage || 'Sem dosagem'}</span>
                    {tagData && (
                        <span
                            className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{
                                backgroundColor: `${tagColorData.hex}20`,
                                color: tagColorData.hex,
                                border: `1px solid ${tagColorData.hex}40`
                            }}
                        >
                            {tagData.name}
                        </span>
                    )}
                </div>
            </div>

            {/* Status Icons */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
                {event.status === 'Applied' && (
                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <span className="material-symbols-outlined text-xl">check_circle</span>
                        <span className="text-xs font-semibold">Aplicado</span>
                    </div>
                )}
                {event.status === 'Current' && (
                    <span className="text-xs px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold">
                        Atual
                    </span>
                )}
            </div>
        </div>
    );
};

const SchedulePage: React.FC<{ onViewPatient: (patientId: string) => void }> = ({ onViewPatient }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [tagMap, setTagMap] = useState<TagMap>({});
    const [loading, setLoading] = useState(true);
    const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);

    useEffect(() => {
        fetchEvents();
        fetchTags();
    }, [currentDate]);

    const fetchTags = async () => {
        const { data, error } = await supabase.from('tags').select('id, name, color');
        if (!error && data) {
            const map: TagMap = {};
            data.forEach(tag => {
                map[tag.id] = { name: tag.name, color: tag.color };
            });
            setTagMap(map);
        }
    };

    const fetchEvents = async () => {
        setLoading(true);
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        const { data: patients, error: patientsError } = await supabase
            .from('patients')
            .select('id, name, avatar_url, tags');

        if (patientsError || !patients) {
            setLoading(false);
            return;
        }

        const allEvents: CalendarEvent[] = [];

        for (const patient of patients) {
            const { data: injections } = await supabase
                .from('injections')
                .select('id, date, dosage, status')
                .eq('patient_id', patient.id)
                .gte('date', startOfMonth.toISOString())
                .lte('date', endOfMonth.toISOString());

            if (injections) {
                injections.forEach(inj => {
                    const initials = patient.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                    allEvents.push({
                        id: inj.id,
                        date: new Date(inj.date),
                        patientId: patient.id,
                        patientName: patient.name,
                        patientInitials: initials,
                        patientAvatar: patient.avatar_url,
                        patientTags: patient.tags,
                        type: 'injection',
                        status: inj.status || 'Scheduled',
                        dosage: inj.dosage ? `${inj.dosage} mg` : undefined
                    });
                });
            }

            const { data: steps } = await supabase
                .from('medication_steps')
                .select('id, patient_id, step_date, dosage, status')
                .eq('patient_id', patient.id)
                .gte('step_date', startOfMonth.toISOString())
                .lte('step_date', endOfMonth.toISOString());

            if (steps) {
                steps.forEach(step => {
                    const initials = patient.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                    allEvents.push({
                        id: step.id,
                        date: new Date(step.step_date),
                        patientId: patient.id,
                        patientName: patient.name,
                        patientInitials: initials,
                        patientAvatar: patient.avatar_url,
                        patientTags: patient.tags,
                        type: 'forecast',
                        status: step.status || 'Scheduled',
                        dosage: step.dosage ? `${step.dosage} mg` : undefined,
                        journeyStatus: step.status
                    });
                });
            }
        }

        setEvents(allEvents);
        setLoading(false);
    };

    const handlePrevMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    const handleToday = () => {
        const today = new Date();
        setCurrentDate(today);
        setSelectedDate(today);
        setTimeout(() => {
            document.getElementById('appointment-list')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    const isSameDay = (date1: Date | null, date2: Date) => {
        if (!date1) return false;
        return date1.getDate() === date2.getDate() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getFullYear() === date2.getFullYear();
    };

    const handleDayClick = (date: Date, hasEvents: boolean) => {
        if (isSameDay(selectedDate, date)) {
            setSelectedDate(null);
        } else {
            setSelectedDate(date);
            setTimeout(() => {
                document.getElementById('appointment-list')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        }
    };

    const getTagColor = (tagId: string | undefined) => {
        if (!tagId) return '#94a3b8';
        const tag = tagMap[tagId];
        if (!tag) return '#94a3b8';
        const colorData = TAG_COLORS.find(c => c.name === tag.color);
        return colorData?.hex || '#94a3b8';
    };

    const getUniqueDotColors = (events: CalendarEvent[]) => {
        const colorSet = new Set<string>();
        events.forEach(ev => {
            const tagId = ev.patientTags?.[0];
            const color = getTagColor(tagId);
            colorSet.add(color);
        });
        return Array.from(colorSet).slice(0, 3);
    };

    const getDateKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

    const eventsByDay = useMemo(() => {
        const map: { [key: string]: CalendarEvent[] } = {};
        events.forEach(event => {
            const key = getDateKey(event.date);
            if (!map[key]) map[key] = [];
            map[key].push(event);
        });
        return map;
    }, [events]);

    const calendarDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startingDayOfWeek = firstDay.getDay();
        const daysInMonth = lastDay.getDate();

        const days: { date: Date; isCurrentMonth: boolean }[] = [];

        for (let i = 0; i < startingDayOfWeek; i++) {
            const prevMonthDay = new Date(year, month, -startingDayOfWeek + i + 1);
            days.push({ date: prevMonthDay, isCurrentMonth: false });
        }

        for (let day = 1; day <= daysInMonth; day++) {
            days.push({ date: new Date(year, month, day), isCurrentMonth: true });
        }

        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
        }

        return days;
    }, [currentDate]);

    const selectedDayEvents = useMemo(() => {
        if (!selectedDate) return [];
        const key = getDateKey(selectedDate);
        return eventsByDay[key] || [];
    }, [selectedDate, eventsByDay]);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <CalendarHeader
                currentDate={currentDate}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
                onToday={handleToday}
                onNewAppointment={() => setIsNewAppointmentModalOpen(true)}
            />

            {/* Calendar Grid - Compact and Fixed */}
            <div className="flex-shrink-0 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
                    {WEEKDAYS.map(day => (
                        <div key={day} className="text-center py-2 text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Days - Compact Layout */}
                <div className={`grid grid-cols-7 ${loading ? 'opacity-50' : 'opacity-100'} transition-opacity`}>
                    {calendarDays.map(({ date, isCurrentMonth }, index) => {
                        const dayKey = getDateKey(date);
                        const dayEvents = eventsByDay[dayKey] || [];
                        const hasEvents = dayEvents.length > 0;
                        const isSelected = isSameDay(selectedDate, date);
                        const isTodayDay = isToday(date);
                        const uniqueColors = getUniqueDotColors(dayEvents);

                        return (
                            <div
                                key={index}
                                onClick={() => handleDayClick(date, isCurrentMonth)}
                                className={`
                                    relative min-h-[50px] sm:min-h-[60px] p-1.5 sm:p-2 flex flex-col items-center justify-start
                                    border-r border-b border-slate-100 dark:border-slate-700/50
                                    transition-all cursor-pointer
                                    ${!isCurrentMonth ? 'bg-slate-50/50 dark:bg-slate-900/20' : 'bg-white dark:bg-slate-800'}
                                    ${hasEvents && isCurrentMonth ? 'hover:bg-blue-50/50 dark:hover:bg-blue-900/10' : ''}
                                    ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-inset ring-primary' : ''}
                                `}
                            >
                                {/* Day Number - Large and Bold */}
                                <time
                                    dateTime={date.toISOString()}
                                    className={`
                                        text-base sm:text-lg font-bold mb-0.5
                                        flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full
                                        transition-all
                                        ${isTodayDay ? 'bg-primary text-white scale-110' : ''}
                                        ${isSelected && !isTodayDay ? 'bg-primary/10 text-primary ring-2 ring-primary/30' : ''}
                                        ${!isTodayDay && !isSelected && isCurrentMonth ? 'text-slate-800 dark:text-slate-200' : ''}
                                        ${!isTodayDay && !isSelected && !isCurrentMonth ? 'text-slate-400 dark:text-slate-600' : ''}
                                    `}
                                >
                                    {date.getDate()}
                                </time>

                                {/* Event Dots - Compact */}
                                {hasEvents && isCurrentMonth && (
                                    <div className="flex items-center justify-center gap-0.5 mt-auto">
                                        {uniqueColors.map((color, idx) => (
                                            <div
                                                key={idx}
                                                className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full"
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Appointment List Slider - Scrollable */}
            {selectedDate && (
                <div id="appointment-list" className="flex-1 overflow-y-auto mt-6 animate-in slide-in-from-top-4 duration-300">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </h3>
                            <button
                                onClick={() => setSelectedDate(null)}
                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                <span className="material-symbols-outlined text-slate-500">close</span>
                            </button>
                        </div>

                        {selectedDayEvents.length > 0 ? (
                            <>
                                <div className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                    {selectedDayEvents.length} {selectedDayEvents.length === 1 ? 'agendamento' : 'agendamentos'}
                                </div>

                                <div className="space-y-2">
                                    {selectedDayEvents.map(event => (
                                        <AppointmentListItem
                                            key={event.id}
                                            event={event}
                                            tagMap={tagMap}
                                            onViewPatient={onViewPatient}
                                        />
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-20 h-20 mb-4 rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-5xl text-blue-500 dark:text-blue-400">
                                        event_available
                                    </span>
                                </div>
                                <h4 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    Nenhum agendamento
                                </h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                                    {isToday(selectedDate)
                                        ? "Você está livre hoje! Aproveite para descansar ou planejar novos atendimentos."
                                        : "Não há agendamentos para este dia. Que tal aproveitar para organizar sua agenda?"}
                                </p>
                                <button
                                    onClick={() => setIsNewAppointmentModalOpen(true)}
                                    className="mt-6 px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-lg">add</span>
                                    Novo Agendamento
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <NewAppointmentModal
                isOpen={isNewAppointmentModalOpen}
                onClose={() => setIsNewAppointmentModalOpen(false)}
                onSuccess={() => fetchEvents()}
            />
        </div>
    );
};

export default SchedulePage;
