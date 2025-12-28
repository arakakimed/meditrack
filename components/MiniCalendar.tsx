import React, { useState, useMemo } from 'react';
import { Injection } from '../types';

interface MiniCalendarProps {
    injections: Injection[];
    onDateClick?: (date: string) => void;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ injections, onDateClick }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Get all injection dates in YYYY-MM-DD format
    const injectionDates = useMemo(() => {
        return new Set(injections.map(inj => inj.applicationDate));
    }, [injections]);

    // Calendar helpers
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        return { daysInMonth, startingDayOfWeek, year, month };
    };

    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);

    const previousMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const goToToday = () => {
        setCurrentMonth(new Date());
    };

    const isToday = (day: number) => {
        const today = new Date();
        return today.getDate() === day &&
            today.getMonth() === month &&
            today.getFullYear() === year;
    };

    const hasInjection = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return injectionDates.has(dateStr);
    };

    const handleDayClick = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (hasInjection(day) && onDateClick) {
            onDateClick(dateStr);
        }
    };

    // Build calendar grid
    const calendarDays = [];
    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
        calendarDays.push(<div key={`empty-${i}`} className="aspect-square" />);
    }
    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
        const isCurrentDay = isToday(day);
        const hasRecord = hasInjection(day);

        calendarDays.push(
            <button
                key={day}
                onClick={() => handleDayClick(day)}
                disabled={!hasRecord}
                className={`
                    aspect-square rounded-lg text-sm font-medium transition-all relative
                    ${isCurrentDay
                        ? 'bg-blue-500 text-white ring-2 ring-blue-300 ring-offset-2'
                        : hasRecord
                            ? 'bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer'
                            : 'text-slate-400 hover:bg-slate-50'
                    }
                    ${!hasRecord && !isCurrentDay ? 'cursor-default' : ''}
                `}
            >
                {day}
                {hasRecord && !isCurrentDay && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-600 rounded-full" />
                )}
            </button>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 border-b border-slate-200 dark:border-slate-600">
                <div className="flex items-center justify-between mb-2">
                    <button
                        onClick={previousMonth}
                        className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
                        title="Mês anterior"
                    >
                        <span className="material-symbols-outlined text-lg text-slate-600">chevron_left</span>
                    </button>

                    <div className="text-center">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {monthNames[month]} {year}
                        </h3>
                    </div>

                    <button
                        onClick={nextMonth}
                        className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
                        title="Próximo mês"
                    >
                        <span className="material-symbols-outlined text-lg text-slate-600">chevron_right</span>
                    </button>
                </div>

                <button
                    onClick={goToToday}
                    className="w-full px-3 py-1.5 text-xs font-semibold text-blue-600 bg-white hover:bg-blue-50 rounded-lg transition-colors"
                >
                    Hoje
                </button>
            </div>

            {/* Calendar Grid */}
            <div className="p-4">
                {/* Day names */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {dayNames.map(day => (
                        <div key={day} className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days */}
                <div className="grid grid-cols-7 gap-1">
                    {calendarDays}
                </div>

                {/* Legend */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-blue-500 rounded"></div>
                        <span className="text-slate-600 dark:text-slate-400">Hoje</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-green-100 border border-green-600 rounded relative">
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-600 rounded-full"></div>
                        </div>
                        <span className="text-slate-600 dark:text-slate-400">Com aplicação</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MiniCalendar;
