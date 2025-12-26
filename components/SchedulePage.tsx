
import React, { useState, useMemo } from 'react';
import { mockAppointments, mockPatients, Patient, Appointment } from '../types';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const CalendarHeader: React.FC<{
    currentDate: Date;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    onToday: () => void;
}> = ({ currentDate, onPrevMonth, onNextMonth, onToday }) => (
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
            <button className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-base">add</span>
                Novo Agendamento
            </button>
        </div>
    </div>
);

const AppointmentItem: React.FC<{ appointment: Appointment, patient?: Patient, onViewPatient: (patientId: string) => void }> = ({ appointment, patient, onViewPatient }) => {
    if (!patient) return null;
    return (
        <div onClick={() => onViewPatient(patient.id)} className="group cursor-pointer flex items-center gap-2 p-1.5 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors text-xs">
            {patient.avatarUrl ? (
                <div className="size-5 rounded-full bg-cover bg-center flex-shrink-0" style={{ backgroundImage: `url(${patient.avatarUrl})` }}></div>
            ) : (
                <div className="size-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 flex-shrink-0">{patient.initials}</div>
            )}
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{patient.name}</p>
                <p className="text-slate-600 dark:text-slate-400">{appointment.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</p>
            </div>
        </div>
    )
}

const SchedulePage: React.FC<{ onViewPatient: (patientId: string) => void }> = ({ onViewPatient }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

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

    const appointmentsByDay = useMemo(() => {
        const grouped: { [key: string]: Appointment[] } = {};
        mockAppointments.forEach(app => {
            const key = app.date.toDateString();
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(app);
        });
        return grouped;
    }, []);

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
            <CalendarHeader currentDate={currentDate} onPrevMonth={handlePrevMonth} onNextMonth={handleNextMonth} onToday={handleToday} />

            <div className="grid grid-cols-7 bg-white dark:bg-surface-dark border-y border-x border-slate-200 dark:border-slate-700 rounded-t-lg">
                {WEEKDAYS.map(day => (
                    <div key={day} className="text-center p-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 grid-rows-5 flex-1 border-b border-x border-slate-200 dark:border-slate-700 rounded-b-lg overflow-hidden">
                {calendarDays.map(({ date, isCurrentMonth }, index) => {
                    const dayAppointments = appointmentsByDay[date.toDateString()] || [];
                    dayAppointments.sort((a, b) => a.date.getTime() - b.date.getTime());

                    return (
                        <div key={index} className={`relative p-2 border-r border-t border-slate-200 dark:border-slate-700 flex flex-col ${isCurrentMonth ? '' : 'bg-slate-50/50 dark:bg-slate-800/20'}`}>
                            <div className="flex justify-end mb-1">
                                <time dateTime={date.toISOString()} className={`text-xs font-semibold flex items-center justify-center size-6 rounded-full ${isToday(date) ? 'bg-primary text-white' : isCurrentMonth ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
                                    {date.getDate()}
                                </time>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-1 -mx-1 px-1">
                                {dayAppointments.map(app => {
                                    const patient = mockPatients.find(p => p.id === app.patientId);
                                    return <AppointmentItem key={app.id} appointment={app} patient={patient} onViewPatient={onViewPatient} />;
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SchedulePage;
