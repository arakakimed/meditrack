import React, { useState, useMemo, useEffect } from 'react';
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
}> = ({ currentDate, onPrevMonth, onNextMonth, onToday, onNewAppointment }) => (
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
);

// Appointment Card Component with Tag Colors - Minimalist Design
const AppointmentListItem: React.FC<{
    event: CalendarEvent;
    tagMap: TagMap;

    onViewPatient: (patientId: string) => void;
    onEdit?: (event: CalendarEvent) => void;
    onDelete?: (event: CalendarEvent) => void;
    onStatusChange?: (event: CalendarEvent, status: string) => void;
}> = ({ event, tagMap, onViewPatient, onEdit, onDelete, onStatusChange }) => {
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

    const handleMenuAction = (action: () => void, e: React.MouseEvent) => {
        e.stopPropagation();
        setShowMenu(false);
        action();
    };
    const firstTagId = event.patientTags?.[0];
    const tagData = firstTagId ? tagMap[firstTagId] : null;
    const tagColorName = tagData?.color || 'Slate';

    const tagColorData = TAG_COLORS.find(c => c.name === tagColorName) || TAG_COLORS[TAG_COLORS.length - 1];

    return (
        <div
            onClick={() => {
                console.log('Patient card clicked! Patient ID:', event.patientId);
                onViewPatient(event.patientId);
            }}
            className={`
                relative flex items-center gap-3 p-3 md:p-4 rounded-lg transition-all cursor-pointer group overflow-hidden
                ${event.isCancelled
                    ? 'bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-600 opacity-60'
                    : event.type === 'forecast'
                        ? 'bg-white dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 hover:shadow-md hover:border-slate-400'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600'
                }
            `}
        >
            {/* Colored Left Accent Bar - Thicker and with shadow */}
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
                    {/* Forecast indicator */}
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
                        <span className="text-xs font-medium hidden md:inline">Cancelado</span>
                    </div>
                ) : event.status === 'Applied' || event.status === 'Concluído' ? (
                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <span className="material-symbols-outlined text-lg md:text-xl">check_circle</span>
                        <span className="text-xs font-medium hidden md:inline">Aplicado</span>
                    </div>
                ) : event.status === 'Current' || event.status === 'Atual' ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
                        Atual
                    </span>
                ) : event.type === 'forecast' ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">
                        Agendado
                    </span>
                ) : null}

                {/* Actions Menu Trigger */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(!showMenu);
                        }}
                        className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg">more_vert</span>
                    </button>

                    {/* Dropdown Menu */}
                    {showMenu && (
                        <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-100">
                            {onEdit && event.type === 'forecast' && (
                                <button
                                    onClick={(e) => handleMenuAction(() => onEdit(event), e)}
                                    className="w-full text-left px-3 py-2.5 text-xs md:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-base">edit</span>
                                    Editar
                                </button>
                            )}

                            {onStatusChange && event.status !== 'Applied' && event.status !== 'Concluído' && (
                                <button
                                    onClick={(e) => handleMenuAction(() => onStatusChange(event, 'Concluído'), e)}
                                    className="w-full text-left px-3 py-2.5 text-xs md:text-sm font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-base">check_circle</span>
                                    Marcar Concluído
                                </button>
                            )}

                            {onDelete && (
                                <button
                                    onClick={(e) => handleMenuAction(() => onDelete(event), e)}
                                    className="w-full text-left px-3 py-2.5 text-xs md:text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 border-t border-slate-100 dark:border-slate-700"
                                >
                                    <span className="material-symbols-outlined text-base">delete</span>
                                    Excluir
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

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

    useEffect(() => {
        fetchEvents();
        fetchTags();
    }, [currentDate]);

    const fetchTags = async () => {
        const { data, error } = await supabase.from('clinic_tags').select('id, name, color');
        if (!error && data) {
            console.log('Fetched tags from clinic_tags:', data);
            const map: TagMap = {};
            data.forEach(tag => {
                map[tag.id] = { name: tag.name, color: tag.color };
            });
            console.log('TagMap created:', map);
            setTagMap(map);
        } else {
            console.error('Error fetching tags:', error);
        }
    };

    const fetchEvents = async () => {
        setLoading(true);
        // Extend range to include visible days from adjacent months (typically 6 weeks max = 42 days)
        // Start 7 days before month start, end 14 days after month end to be safe
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        const fetchStartDate = new Date(startOfMonth);
        fetchStartDate.setDate(fetchStartDate.getDate() - 7);

        const fetchEndDate = new Date(endOfMonth);
        fetchEndDate.setDate(fetchEndDate.getDate() + 14);

        console.log('Fetching events for extended range:', {
            monthStart: startOfMonth.toLocaleDateString(),
            monthEnd: endOfMonth.toLocaleDateString(),
            fetchStart: fetchStartDate.toLocaleDateString(),
            fetchEnd: fetchEndDate.toLocaleDateString()
        });

        const { data: patients, error: patientsError } = await supabase
            .from('patients')
            .select('id, name, avatar_url, tags');

        if (patientsError || !patients) {
            console.error('Error fetching patients:', patientsError);
            setLoading(false);
            return;
        }

        console.log('Found patients:', patients.length);

        const allEvents: CalendarEvent[] = [];

        for (const patient of patients) {
            // Fetch injections using 'applied_at' or 'created_at' as date field
            const { data: injections, error: injectionsError } = await supabase
                .from('injections')
                .select('id, applied_at, created_at, dosage, status')
                .eq('patient_id', patient.id)
                .gte('applied_at', fetchStartDate.toISOString().split('T')[0])
                .lte('applied_at', fetchEndDate.toISOString().split('T')[0]);

            if (injectionsError) {
                console.error('Error fetching injections for patient:', patient.id, injectionsError);
            }

            if (injections && injections.length > 0) {
                console.log(`Found ${injections.length} injections for patient:`, patient.name);
                injections.forEach(inj => {
                    const initials = patient.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                    const dateSource = inj.applied_at || inj.created_at;

                    // Parse date as local date at noon (same logic as PatientProfilePage)
                    let eventDate: Date;
                    if (typeof dateSource === 'string') {
                        const datePart = dateSource.split('T')[0];
                        const [year, month, day] = datePart.split('-').map(Number);
                        eventDate = new Date(year, month - 1, day, 12, 0, 0);
                    } else {
                        eventDate = new Date(dateSource);
                    }

                    console.log(`Injection date: ${dateSource} -> Parsed as: ${eventDate.toLocaleDateString()}`);

                    allEvents.push({
                        id: inj.id,
                        date: eventDate,
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

            // Fetch medication steps with 'date' field
            const { data: steps, error: stepsError } = await supabase
                .from('medication_steps')
                .select('id, patient_id, date, dosage, status, details, progress, current_week, total_weeks, is_skipped, order_index')
                .eq('patient_id', patient.id)
                .gte('date', fetchStartDate.toISOString().split('T')[0])
                .lte('date', fetchEndDate.toISOString().split('T')[0]);

            if (stepsError) {
                console.error('Error fetching medication_steps for patient:', patient.id, stepsError);
            }

            if (steps && steps.length > 0) {
                console.log(`Found ${steps.length} medication steps for patient:`, patient.name);
                steps.forEach(step => {
                    const initials = patient.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

                    // Parse date as local date at noon
                    let stepDate: Date;
                    if (typeof step.date === 'string') {
                        const datePart = step.date.split('T')[0];
                        const [year, month, day] = datePart.split('-').map(Number);
                        stepDate = new Date(year, month - 1, day, 12, 0, 0);
                    } else {
                        stepDate = new Date(step.date);
                    }

                    console.log(`Step date: ${step.date} -> Parsed as: ${stepDate.toLocaleDateString()}`);

                    // Determine if cancelled based on is_skipped or status
                    const isCancelled = step.is_skipped === true || step.status === 'Cancelado';
                    const displayStatus = isCancelled ? 'Cancelado' : (step.status || 'Scheduled');

                    allEvents.push({
                        id: step.id,
                        date: stepDate,
                        patientId: patient.id,
                        patientName: patient.name,
                        patientInitials: initials,
                        patientAvatar: patient.avatar_url,
                        patientTags: patient.tags,
                        type: 'forecast',
                        status: displayStatus as any,
                        dosage: step.dosage ? `${step.dosage} mg` : undefined,
                        isCancelled: isCancelled,
                        journeyStatus: step.status,
                        // Mapping fields for edit
                        details: step.details,
                        progress: step.progress,
                        current_week: step.current_week,
                        total_weeks: step.total_weeks,
                        is_skipped: step.is_skipped,
                        order_index: step.order_index
                    });
                });
            }
        }

        console.log('Total events found:', allEvents.length);
        console.log('Events:', allEvents);
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

    const handleEditEvent = (event: CalendarEvent) => {
        if (event.type !== 'forecast') return; // Only editing forecast steps for now

        // Construct MedicationStep-like object
        const step = {
            id: event.id,
            dosage: event.dosage || '',
            status: event.status as any,
            details: (event as any).details || '', // Use mapped detail or fallback
            date: event.date.toISOString().split('T')[0], // Extract YYYY-MM-DD
            // If we had more fields in CalendarEvent we would map them here
            // We need to fetch or ensure we have all data. 
            // Luckily we added them to fetchEvents mapping above!
            // details mapped above
            progress: (event as any).progress,
            current_week: (event as any).current_week,
            total_weeks: (event as any).total_weeks,
            is_skipped: (event as any).is_skipped,
            order_index: (event as any).order_index
        };

        setEditingStep(step);
        setEditingPatientId(event.patientId);
        setIsEditModalOpen(true);
    };

    const handleDeleteEvent = async (event: CalendarEvent) => {
        if (!confirm('Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.')) return;

        const table = event.type === 'forecast' ? 'medication_steps' : 'injections';

        try {
            const { error } = await supabase
                .from(table)
                .delete()
                .eq('id', event.id);

            if (error) throw error;
            fetchEvents();
        } catch (err) {
            console.error('Error deleting event:', err);
            alert('Erro ao excluir agendamento.');
        }
    };

    const handleStatusChangeEvent = async (event: CalendarEvent, newStatus: string) => {
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
    };

    const getTagColor = (tagId: string | undefined) => {
        if (!tagId) {
            console.log('No tagId provided, returning default color');
            return '#94a3b8';
        }
        const tag = tagMap[tagId];
        if (!tag) {
            console.log('Tag not found in tagMap for ID:', tagId);
            return '#94a3b8';
        }
        const colorData = TAG_COLORS.find(c => c.name === tag.color);
        const hexColor = colorData?.hex || '#94a3b8';
        console.log(`Tag "${tag.name}" (${tag.color}) -> ${hexColor}`);
        return hexColor;
    };

    const getUniqueDotColors = (events: CalendarEvent[]) => {
        const colorSet = new Set<string>();
        console.log('Getting colors for events:', events.length);
        events.forEach(ev => {
            console.log('Event patient tags:', ev.patientTags);
            const tagId = ev.patientTags?.[0];
            const color = getTagColor(tagId);
            colorSet.add(color);
        });
        const uniqueColors = Array.from(colorSet).slice(0, 3);
        console.log('Unique colors for dots:', uniqueColors);
        return uniqueColors;
    };

    const getDateKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

    const eventsByDay = useMemo(() => {
        const map: { [key: string]: CalendarEvent[] } = {};
        events.forEach(event => {
            const key = getDateKey(event.date);
            if (!map[key]) map[key] = [];
            map[key].push(event);
        });

        // Filter duplicates: remove 'forecast' if 'injection' exists for same patient on same day
        Object.keys(map).forEach(key => {
            const dayEvents = map[key];
            // Get all patients who have an injection on this day
            const patientsWithInjection = new Set(
                dayEvents
                    .filter(e => e.type === 'injection')
                    .map(e => e.patientId)
            );

            // Filter out forecasts for patients who already have an injection
            map[key] = dayEvents.filter(event => {
                // Keep all injections
                if (event.type === 'injection') return true;
                // Keep forecasts only if patient doesn't have an injection on this day
                if (event.type === 'forecast' && patientsWithInjection.has(event.patientId)) {
                    return false; // Remove this forecast
                }
                return true;
            });
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
                        const isSelected = isSameDay(selectedDate, date);
                        const isTodayDay = isToday(date);
                        const uniqueColors = getUniqueDotColors(dayEvents);

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
                    onSuccess={() => {
                        setIsEditModalOpen(false);
                        setEditingStep(null);
                        setEditingPatientId(null);
                        fetchEvents();
                    }}
                    patientId={editingPatientId}
                    stepToEdit={editingStep}
                    nextOrderIndex={0} // Not used when editing
                />
            )}
        </div>
    );
};

export default SchedulePage;
