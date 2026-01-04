import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Patient, Appointment } from '../types';
import NewAppointmentModal from './NewAppointmentModal';
import EditMedicationStepModal from './EditMedicationStepModal';
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
    status: 'Applied' | 'Scheduled' | 'Delayed' | 'Skipped' | 'Current' | 'Cancelado' | 'Concluído';
    dosage?: string;
    isCancelled?: boolean; // For forecast/steps that were cancelled

    journeyStatus?: string;
    // Additional fields for mapping back to MedicationStep
    originalDate?: Date; // To help reconstruction if needed
    order_index?: number;
    details?: string;
    progress?: number;
    current_week?: number;
    total_weeks?: number;
    is_skipped?: boolean;
}

const CalendarHeader: React.FC<{
    currentDate: Date;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    onToday: () => void;
    onNewAppointment: () => void;
}> = React.memo(({ currentDate, onPrevMonth, onNextMonth, onToday, onNewAppointment }) => (
    <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
            <button onClick={onPrevMonth} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <span className="material-symbols-outlined text-xl text-slate-600 dark:text-slate-400">chevron_left</span>
            </button>
            <div className="min-w-[200px] text-center px-2">
                <h2 className="flex items-baseline justify-center gap-2">
                    <span className="text-lg md:text-xl font-bold text-slate-900 dark:text-white capitalize">
                        {currentDate.toLocaleString('pt-BR', { month: 'long' })}
                    </span>
                    <span className="text-sm md:text-base font-medium text-slate-500 dark:text-slate-400">
                        {currentDate.getFullYear()}
                    </span>
                </h2>
            </div>
            <button onClick={onNextMonth} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <span className="material-symbols-outlined text-xl text-slate-600 dark:text-slate-400">chevron_right</span>
            </button>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={onToday} className="px-3 py-1.5 text-xs md:text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                Hoje
            </button>
            <button onClick={onNewAppointment} className="px-3 py-1.5 text-xs md:text-sm font-medium text-white bg-primary hover:bg-blue-600 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm">
                <span className="material-symbols-outlined text-sm">add</span>
                <span className="hidden md:inline">Novo Agendamento</span>
                <span className="md:hidden">Novo</span>
            </button>
        </div>
    </div>
));

// Appointment Card Component with Tag Colors - Minimalist Design
const AppointmentListItem: React.FC<{
    event: CalendarEvent;
    tagMap: TagMap;

    onViewPatient: (patientId: string) => void;
    onEdit?: (event: CalendarEvent) => void;
    onDelete?: (event: CalendarEvent) => void;
    onStatusChange?: (event: CalendarEvent, status: string) => void;
}> = React.memo(({ event, tagMap, onViewPatient, onEdit, onDelete, onStatusChange }) => {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const firstTagId = event.patientTags?.[0];
    const tagData = firstTagId ? tagMap[firstTagId] : null;
    const tagColorName = tagData?.color || 'Slate';

    const tagColorData = TAG_COLORS.find(c => c.name === tagColorName) || TAG_COLORS[TAG_COLORS.length - 1];

    return (
        <div className="flex flex-col">
            {/* Main Card */}
            <div
                onClick={() => {
                    if (!showMenu) {
                        onViewPatient(event.patientId);
                    }
                }}
                className={`
                    relative flex items-center gap-3 p-3 md:p-4 transition-all cursor-pointer group overflow-hidden
                    ${showMenu ? 'rounded-t-lg' : 'rounded-lg'}
                    ${event.isCancelled
                        ? 'bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-600 opacity-60'
                        : event.type === 'forecast'
                            ? 'bg-white dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 hover:shadow-md hover:border-slate-400'
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600'
                    }
                    ${showMenu ? 'border-b-0' : ''}
                `}
            >
                {/* Colored Left Accent Bar */}
                <div
                    className={`absolute left-0 top-0 bottom-0 w-1 ${event.isCancelled ? 'opacity-40' : ''}`}
                    style={{
                        backgroundColor: tagColorData.hex,
                        boxShadow: event.isCancelled ? 'none' : `2px 0 8px ${tagColorData.hex}40`
                    }}
                />

                {/* Avatar or Initial Badge */}
                <div className="ml-3 flex-shrink-0">
                    {event.patientAvatar ? (
                        <img
                            src={event.patientAvatar}
                            alt={event.patientName}
                            className={`w-10 h-10 md:w-12 md:h-12 rounded-full object-cover ${event.isCancelled ? 'opacity-50 grayscale' : ''}`}
                        />
                    ) : (
                        <div
                            className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-sm md:text-base font-bold text-white shadow-md ${event.isCancelled ? 'opacity-50' : ''}`}
                            style={{ backgroundColor: tagColorData.hex }}
                        >
                            {event.patientInitials}
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm md:text-base truncate ${event.isCancelled ? 'line-through text-slate-400 dark:text-slate-600' : 'text-slate-900 dark:text-white'}`}>
                        {event.patientName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs md:text-sm text-slate-500 dark:text-slate-400">{event.dosage || 'Sem dosagem'}</span>
                        {tagData && (
                            <span
                                className={`text-[10px] md:text-xs px-2 py-0.5 rounded-full font-semibold text-white shadow-sm ${event.isCancelled ? 'opacity-50' : ''}`}
                                style={{ backgroundColor: tagColorData.hex }}
                            >
                                {tagData.name}
                            </span>
                        )}
                        {event.type === 'forecast' && !event.isCancelled && (
                            <span className="text-[10px] md:text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold">
                                Previsto
                            </span>
                        )}
                    </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {event.isCancelled ? (
                        <div className="flex items-center gap-1 text-slate-400 dark:text-slate-600">
                            <span className="material-symbols-outlined text-lg md:text-xl">cancel</span>
                        </div>
                    ) : event.status === 'Applied' || event.status === 'Concluído' ? (
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <span className="material-symbols-outlined text-lg md:text-xl">check_circle</span>
                        </div>
                    ) : event.status === 'Current' || event.status === 'Atual' ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
                            Atual
                        </span>
                    ) : null}

                    {/* Toggle Actions Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(!showMenu);
                        }}
                        className={`p-2 rounded-full transition-all ${showMenu
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                    >
                        <span className="material-symbols-outlined text-lg transition-transform duration-200" style={{ transform: showMenu ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                            {showMenu ? 'expand_less' : 'more_vert'}
                        </span>
                    </button>
                </div>
            </div>

            {/* Accordion Actions Panel */}
            <div
                className={`
                    overflow-hidden transition-all duration-200 ease-out
                    ${showMenu ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}
                `}
            >
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-t-0 border-slate-200 dark:border-slate-700 rounded-b-lg p-2 flex flex-wrap gap-2">
                    {/* View Patient */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onViewPatient(event.patientId); setShowMenu(false); }}
                        className="flex-1 min-w-[100px] py-2.5 px-3 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-900/20 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                    >
                        <span className="material-symbols-outlined text-lg">person</span>
                        Ver Paciente
                    </button>

                    {/* Edit - Only for forecasts */}
                    {onEdit && event.type === 'forecast' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(event); setShowMenu(false); }}
                            className="flex-1 min-w-[80px] py-2.5 px-3 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-amber-50 hover:border-amber-300 dark:hover:bg-amber-900/20 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                        >
                            <span className="material-symbols-outlined text-lg">edit</span>
                            Editar
                        </button>
                    )}

                    {/* Mark as Complete */}
                    {onStatusChange && event.status !== 'Applied' && event.status !== 'Concluído' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onStatusChange(event, 'Concluído'); setShowMenu(false); }}
                            className="flex-1 min-w-[100px] py-2.5 px-3 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 text-sm font-medium shadow-sm"
                        >
                            <span className="material-symbols-outlined text-lg">check_circle</span>
                            Concluir
                        </button>
                    )}

                    {/* Delete */}
                    {onDelete && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(event); setShowMenu(false); }}
                            className="py-2.5 px-3 rounded-lg bg-white dark:bg-slate-700 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                        >
                            <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
});

const SchedulePage: React.FC<{ onViewPatient: (patientId: string) => void }> = ({ onViewPatient }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date()); // Start with today selected
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [tagMap, setTagMap] = useState<TagMap>({});
    const [loading, setLoading] = useState(true);
    const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);

    // Edit Flow State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingStep, setEditingStep] = useState<any | null>(null); // Simplified type for internal use
    const [editingPatientId, setEditingPatientId] = useState<string | null>(null);

    const isMounted = React.useRef(true);
    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        // PERFORMANCE: Batch fetching
        const loadData = async () => {
            if (isMounted.current) setLoading(true);
            await fetchTags();
            if (isMounted.current) await fetchEvents();
            if (isMounted.current) setLoading(false);
        };
        loadData();
    }, [currentDate]);

    const fetchTags = async () => {
        const { data, error } = await supabase.from('clinic_tags').select('id, name, color');
        if (!error && data) {
            const map: TagMap = {};
            data.forEach(tag => {
                map[tag.id] = { name: tag.name, color: tag.color };
            });
            setTagMap(map);
        } else {
            console.error('Error fetching tags:', error);
        }
    };

    const fetchEvents = async () => {
        // Extend range to include visible days from adjacent months (typically 6 weeks max = 42 days)
        // Start 7 days before month start, end 14 days after month end to be safe
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        const fetchStartDate = new Date(startOfMonth);
        fetchStartDate.setDate(fetchStartDate.getDate() - 7);

        const fetchEndDate = new Date(endOfMonth);
        fetchEndDate.setDate(fetchEndDate.getDate() + 14);

        // PERFORMANCE: Single Query for patients to avoid N+1 if possible, but structure requires iteration usually.
        // Optimizing: Fetch ONLY needed fields.
        const { data: patients, error: patientsError } = await supabase
            .from('patients')
            .select('id, name, avatar_url, tags');

        if (patientsError) {
            console.error('Error fetching patients:', patientsError);
            setLoading(false);
            return;
        }

        if (!patients || patients.length === 0) {
            setEvents([]);
            setLoading(false);
            return;
        }

        const allEvents: CalendarEvent[] = [];

        // Distribuir requisições em paralelo com segurança
        const promises = patients.map(async (patient) => {
            if (!patient) return []; // Safety check

            const patientEvents: CalendarEvent[] = [];

            try {
                // Fetch injections
                const { data: injections } = await supabase
                    .from('injections')
                    .select('id, applied_at, created_at, dosage, status')
                    .eq('patient_id', patient.id)
                    .gte('applied_at', fetchStartDate.toISOString().split('T')[0])
                    .lte('applied_at', fetchEndDate.toISOString().split('T')[0]);

                if (injections) {
                    injections.forEach(inj => {
                        const dateSource = inj.applied_at || inj.created_at;
                        // Skip invalid dates
                        if (!dateSource) return;

                        let eventDate: Date;
                        try {
                            if (typeof dateSource === 'string') {
                                const datePart = dateSource.split('T')[0];
                                const [year, month, day] = datePart.split('-').map(Number);
                                eventDate = new Date(year, month - 1, day, 12, 0, 0);
                            } else {
                                eventDate = new Date(dateSource);
                            }

                            // Check valid date
                            if (isNaN(eventDate.getTime())) return;

                            patientEvents.push({
                                id: inj.id,
                                date: eventDate,
                                patientId: patient.id,
                                patientName: patient.name || 'Paciente',
                                patientInitials: patient.name ? patient.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : '?',
                                patientAvatar: patient.avatar_url,
                                patientTags: patient.tags || [],
                                type: 'injection',
                                status: inj.status || 'Scheduled',
                                dosage: inj.dosage ? `${inj.dosage} mg` : undefined
                            });
                        } catch (e) {
                            // Ignore malformed date
                        }
                    });
                }

                // Fetch medication steps
                const { data: steps } = await supabase
                    .from('medication_steps')
                    .select('id, patient_id, date, dosage, status, details, progress, current_week, total_weeks, is_skipped, order_index')
                    .eq('patient_id', patient.id)
                    .gte('date', fetchStartDate.toISOString().split('T')[0])
                    .lte('date', fetchEndDate.toISOString().split('T')[0]);

                if (steps) {
                    steps.forEach(step => {
                        if (!step.date) return;

                        let stepDate: Date;
                        try {
                            if (typeof step.date === 'string') {
                                const datePart = step.date.split('T')[0];
                                const [year, month, day] = datePart.split('-').map(Number);
                                stepDate = new Date(year, month - 1, day, 12, 0, 0);
                            } else {
                                stepDate = new Date(step.date);
                            }

                            if (isNaN(stepDate.getTime())) return;

                            const isCancelled = step.is_skipped === true || step.status === 'Cancelado';
                            const displayStatus = isCancelled ? 'Cancelado' : (step.status || 'Scheduled');

                            patientEvents.push({
                                id: step.id,
                                date: stepDate,
                                patientId: patient.id,
                                patientName: patient.name || 'Paciente',
                                patientInitials: patient.name ? patient.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : '?',
                                patientAvatar: patient.avatar_url,
                                patientTags: patient.tags || [],
                                type: 'forecast',
                                status: displayStatus as any,
                                dosage: step.dosage ? `${step.dosage} mg` : undefined,
                                isCancelled: isCancelled,
                                journeyStatus: step.status,
                                details: step.details,
                                progress: step.progress,
                                current_week: step.current_week,
                                total_weeks: step.total_weeks,
                                is_skipped: step.is_skipped,
                                order_index: step.order_index
                            });
                        } catch (e) {
                            // Ignore faulty step
                        }
                    });
                }
            } catch (err) {
                console.error(`Error processing events for patient ${patient.id}:`, err);
            }
            return patientEvents;
        });

        const results = await Promise.all(promises);
        // Flatten with safety
        results.forEach(pEvents => {
            if (Array.isArray(pEvents)) {
                allEvents.push(...pEvents);
            }
        });

        setEvents(allEvents);
    };

    const handlePrevMonth = useCallback(() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)), []);
    const handleNextMonth = useCallback(() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)), []);


    const handleToday = useCallback(() => {
        const today = new Date();
        setCurrentDate(today);
        setSelectedDate(today);
        setTimeout(() => {
            document.getElementById('appointment-list')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }, []);

    const isToday = useCallback((date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    }, []);

    const isSameDay = useCallback((date1: Date | null, date2: Date) => {
        if (!date1) return false;
        return date1.getDate() === date2.getDate() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getFullYear() === date2.getFullYear();
    }, []);

    const handleDayClick = useCallback((date: Date, hasEvents: boolean) => {
        setSelectedDate(prev => {
            if (isSameDay(prev, date)) return null;
            return date;
        });
        // Scroll logic separated to avoid side effects in render/callback if possible, but ok here for interaction
        setTimeout(() => {
            document.getElementById('appointment-list')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }, [isSameDay]);

    const handleEditEvent = useCallback((event: CalendarEvent) => {
        if (event.type !== 'forecast') return;

        const step = {
            id: event.id,
            dosage: event.dosage || '',
            status: event.status as any,
            details: (event as any).details || '',
            date: event.date.toISOString().split('T')[0],
            progress: (event as any).progress,
            current_week: (event as any).current_week,
            total_weeks: (event as any).total_weeks,
            is_skipped: (event as any).is_skipped,
            order_index: (event as any).order_index
        };

        setEditingStep(step);
        setEditingPatientId(event.patientId);
        setIsEditModalOpen(true);
    }, []);

    const handleDeleteEvent = useCallback(async (event: CalendarEvent) => {
        if (!confirm('Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.')) return;

        const table = event.type === 'forecast' ? 'medication_steps' : 'injections';

        try {
            const { error } = await supabase
                .from(table)
                .delete()
                .eq('id', event.id);

            if (error) throw error;
            fetchEvents(); // Re-fetch to update UI
        } catch (err) {
            console.error('Error deleting event:', err);
            alert('Erro ao excluir agendamento.');
        }
    }, [fetchEvents]); // Depend on fetchEvents to refresh

    const handleStatusChangeEvent = useCallback(async (event: CalendarEvent, newStatus: string) => {
        const table = event.type === 'forecast' ? 'medication_steps' : 'injections';

        try {
            const { error } = await supabase
                .from(table)
                .update({ status: newStatus })
                .eq('id', event.id);

            if (error) throw error;
            fetchEvents();
        } catch (err) {
            console.error('Error updating status:', err);
            alert('Erro ao atualizar status.');
        }
    }, [fetchEvents]);

    // PERFORMANCE: Memoized Helper for Tag Colors
    // This was the source of lag: excessive console logging and recalculation inside render loops
    const getTagColor = useCallback((tagId: string | undefined) => {
        if (!tagId) return '#94a3b8';
        const tag = tagMap[tagId];
        if (!tag) return '#94a3b8';
        const colorData = TAG_COLORS.find(c => c.name === tag.color);
        return colorData?.hex || '#94a3b8';
    }, [tagMap]);

    const getDateKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

    // PERFORMANCE: Memoize the events grouping
    const eventsByDay = useMemo(() => {
        const map: { [key: string]: CalendarEvent[] } = {};
        events.forEach(event => {
            const key = getDateKey(event.date);
            if (!map[key]) map[key] = [];
            map[key].push(event);
        });

        // Filter duplicates logic
        Object.keys(map).forEach(key => {
            const dayEvents = map[key];
            const patientsWithInjection = new Set(
                dayEvents
                    .filter(e => e.type === 'injection')
                    .map(e => e.patientId)
            );

            map[key] = dayEvents.filter(event => {
                if (event.type === 'injection') return true;
                if (event.type === 'forecast' && patientsWithInjection.has(event.patientId)) {
                    return false;
                }
                return true;
            });
        });

        return map;
    }, [events]); // Only recalculate if events change

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

            {/* Calendar Grid - Minimalist Design */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                    {WEEKDAYS.map(day => (
                        <div key={day} className="text-center py-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Days */}
                <div className={`grid grid-cols-7 ${loading ? 'opacity-50' : 'opacity-100'} transition-opacity`}>
                    {calendarDays.map(({ date, isCurrentMonth }, index) => {
                        const dayKey = getDateKey(date);
                        const dayEvents = eventsByDay[dayKey] || [];
                        const hasEvents = dayEvents.length > 0;
                        const isSelected = isSelectedDay(selectedDate, date); // Create helper for cleaner render
                        const isTodayDay = isToday(date);

                        // PERFORMANCE: Calculate colors inline efficiently or use Memo if complex
                        // Basic set logic is fast enough here if console logs are removed
                        const uniqueColors = (() => {
                            if (!hasEvents) return [];
                            const colorSet = new Set<string>();
                            let count = 0;
                            for (const ev of dayEvents) {
                                if (count >= 3) break; // Limit processing
                                const color = getTagColor(ev.patientTags?.[0]);
                                if (!colorSet.has(color)) {
                                    colorSet.add(color);
                                    count++;
                                }
                            }
                            return Array.from(colorSet).slice(0, 3);
                        })();

                        return (
                            <div
                                key={index}
                                onClick={() => handleDayClick(date, isCurrentMonth)}
                                className={`
                                relative min-h-[44px] md:min-h-[60px] p-1 md:p-2 flex flex-col items-center justify-center
                                border-r border-b border-slate-100 dark:border-slate-700/30
                                transition-all cursor-pointer
                                ${!isCurrentMonth ? 'bg-slate-50/30 dark:bg-slate-900/10' : 'bg-white dark:bg-slate-800'}
                                ${hasEvents && isCurrentMonth ? 'hover:bg-slate-50 dark:hover:bg-slate-700/20' : ''}
                                ${isSelected ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}
                                ${index % 7 === 6 ? 'border-r-0' : ''}
                            `}
                            >
                                {/* Day Number */}
                                <time
                                    dateTime={date.toISOString()}
                                    className={`
                                    text-sm md:text-base font-medium mb-auto
                                    flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full
                                    transition-all
                                    ${isTodayDay ? 'bg-primary text-white font-semibold' : ''}
                                    ${isSelected && !isTodayDay ? 'ring-2 ring-primary ring-inset text-primary font-semibold' : ''}
                                    ${!isTodayDay && !isSelected && isCurrentMonth ? 'text-slate-700 dark:text-slate-200' : ''}
                                    ${!isTodayDay && !isSelected && !isCurrentMonth ? 'text-slate-400 dark:text-slate-600' : ''}
                                `}
                                >
                                    {date.getDate()}
                                </time>

                                {/* Colored Dots for Events */}
                                {hasEvents && (
                                    <div className="flex items-center justify-center gap-1 mt-auto mb-1">
                                        {uniqueColors.map((color, idx) => (
                                            <div
                                                key={idx}
                                                className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full shadow-sm"
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

            {/* Appointment List - Minimalist Design */}
            {selectedDate && (
                <div id="appointment-list" className="flex-1 overflow-y-auto mt-4 md:mt-6 animate-in slide-in-from-top-2 duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 md:p-5">
                        <div className="flex items-center justify-between mb-3 md:mb-4">
                            <h3 className="text-sm md:text-base font-semibold text-slate-900 dark:text-white">
                                {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </h3>
                            <button
                                onClick={() => setSelectedDate(null)}
                                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                <span className="material-symbols-outlined text-lg text-slate-500">close</span>
                            </button>
                        </div>

                        {selectedDayEvents.length > 0 ? (
                            <>
                                <div className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mb-3">
                                    {selectedDayEvents.length} {selectedDayEvents.length === 1 ? 'agendamento' : 'agendamentos'}
                                </div>

                                <div className="space-y-2">
                                    {selectedDayEvents.map(event => (
                                        <AppointmentListItem
                                            key={event.id}
                                            event={event}
                                            tagMap={tagMap}
                                            onViewPatient={onViewPatient}
                                            onEdit={handleEditEvent}
                                            onDelete={handleDeleteEvent}
                                            onStatusChange={handleStatusChangeEvent}
                                        />
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 md:py-12 text-center">
                                <div className="w-16 h-16 md:w-20 md:h-20 mb-3 md:mb-4 rounded-full bg-slate-100 dark:bg-slate-700/30 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-3xl md:text-4xl text-slate-400 dark:text-slate-500">
                                        event_available
                                    </span>
                                </div>
                                <h4 className="text-base md:text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Nenhum agendamento
                                </h4>
                                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-4">
                                    {isToday(selectedDate)
                                        ? "Você está livre hoje! Aproveite para descansar ou planejar novos atendimentos."
                                        : "Não há agendamentos para este dia."}
                                </p>
                                <button
                                    onClick={() => setIsNewAppointmentModalOpen(true)}
                                    className="px-4 py-2 bg-primary hover:bg-blue-600 text-white text-sm rounded-lg font-medium transition-colors flex items-center gap-1.5"
                                >
                                    <span className="material-symbols-outlined text-base">add</span>
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

            {editingStep && editingPatientId && (
                <EditMedicationStepModal
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setEditingStep(null);
                        setEditingPatientId(null);
                    }}
                    patientId={editingPatientId}
                    step={editingStep}
                    onSave={() => {
                        fetchEvents();
                        setIsEditModalOpen(false);
                        setEditingStep(null);
                        setEditingPatientId(null);
                    }}
                />
            )}
        </div>
    );
};

// Helper to avoid recreating functions in render loop
function isSelectedDay(selected: Date | null, current: Date) {
    if (!selected) return false;
    return selected.getDate() === current.getDate() &&
        selected.getMonth() === current.getMonth() &&
        selected.getFullYear() === current.getFullYear();
}

export default React.memo(SchedulePage);
