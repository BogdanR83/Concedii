<<<<<<< HEAD
import { useState, useRef, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isToday, isSameDay, getDay } from 'date-fns';
import { ro } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';
import { formatDate } from '../lib/utils';

interface DatePickerProps {
    value: string; // YYYY-MM-DD format
    onChange: (value: string) => void;
    min?: string;
    max?: string;
    label?: string;
    className?: string;
}

export function DatePicker({ value, onChange, min, max, label, className = '' }: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(() => {
        if (value) {
            const date = new Date(value + 'T12:00:00'); // Use noon to avoid timezone issues
            return date;
        }
        return new Date();
    });
    const pickerRef = useRef<HTMLDivElement>(null);

    // Close picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Update current month when value changes
    useEffect(() => {
        if (value) {
            const date = new Date(value + 'T12:00:00');
            setCurrentMonth(date);
        }
    }, [value]);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Get first day of month (0 = Sunday, 1 = Monday, etc.)
    // Adjust to start week on Monday (0 becomes 6, 1 becomes 0, etc.)
    const firstDayOfWeek = (getDay(monthStart) + 6) % 7; // Convert Sunday=0 to Monday=0

    const handleDateClick = (day: Date) => {
        const dayStr = formatDate(day);
        
        // Check min/max constraints
        if (min && dayStr < min) return;
        if (max && dayStr > max) return;
        
=======
import { useState } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    addMonths,
    subMonths,
    isWeekend,
    isToday,
    isBefore,
    isSameDay,
    getDay
} from 'date-fns';
import { ro } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
    value: string; // YYYY-MM-DD format
    onChange: (date: string) => void;
    min?: string; // YYYY-MM-DD format
    max?: string; // YYYY-MM-DD format
    className?: string;
}

export function DatePicker({ value, onChange, min, max, className = '' }: DatePickerProps) {
    const [currentDate, setCurrentDate] = useState<Date>(value ? new Date(value) : new Date());
    const [isOpen, setIsOpen] = useState(false);

    const selectedDate = value ? new Date(value) : null;
    const minDate = min ? new Date(min) : null;
    const maxDate = max ? new Date(max) : null;

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    const handleDateClick = (day: Date) => {
        const dayStr = format(day, 'yyyy-MM-dd');
        
        // Check min/max constraints
        if (minDate && isBefore(day, minDate)) {
            return;
        }
        if (maxDate && isBefore(maxDate, day) && !isSameDay(day, maxDate)) {
            return;
        }

>>>>>>> 79f0aeedaea0c3849c71f1a41ca33babd80e45f7
        onChange(dayStr);
        setIsOpen(false);
    };

<<<<<<< HEAD
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const selectedDate = value ? new Date(value + 'T12:00:00') : null;
    const minDate = min ? new Date(min + 'T12:00:00') : null;
    const maxDate = max ? new Date(max + 'T12:00:00') : null;

    // Get days from previous month to fill the first week
    const prevMonthDays: Date[] = [];
    if (firstDayOfWeek > 0) {
        const prevMonthEnd = endOfMonth(subMonths(currentMonth, 1));
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            prevMonthDays.push(new Date(prevMonthEnd.getFullYear(), prevMonthEnd.getMonth(), prevMonthEnd.getDate() - i));
        }
    }

    // Get days from next month to fill the last week
    const nextMonthDays: Date[] = [];
    const totalCells = prevMonthDays.length + days.length;
    const remainingCells = 42 - totalCells; // 6 weeks * 7 days
    if (remainingCells > 0) {
        const nextMonthStart = startOfMonth(addMonths(currentMonth, 1));
        for (let i = 0; i < remainingCells && i < 7; i++) {
            nextMonthDays.push(new Date(nextMonthStart.getFullYear(), nextMonthStart.getMonth(), nextMonthStart.getDate() + i));
        }
    }

    const isDateDisabled = (day: Date): boolean => {
        const dayStr = formatDate(day);
        if (min && dayStr < min) return true;
        if (max && dayStr > max) return true;
        return false;
    };

    return (
        <div ref={pickerRef} className={`relative ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    {label}
                </label>
            )}
=======
    const formatDateForInput = (date: Date | null): string => {
        if (!date) return '';
        return format(date, 'yyyy-MM-dd');
    };

    const formatDateForDisplay = (dateStr: string): string => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return format(date, 'dd/MM/yyyy', { locale: ro });
    };

    return (
        <div className={`relative ${className}`}>
>>>>>>> 79f0aeedaea0c3849c71f1a41ca33babd80e45f7
            <div className="relative">
                <input
                    type="text"
                    readOnly
<<<<<<< HEAD
                    value={value ? new Date(value + 'T12:00:00').toLocaleDateString('ro-RO') : ''}
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer bg-white"
                    placeholder="Selectează data"
                />
                <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 p-4 w-80">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={prevMonth}
                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5 text-slate-600" />
                        </button>
                        <h3 className="text-sm font-semibold text-slate-900 capitalize">
                            {format(currentMonth, 'MMMM yyyy', { locale: ro })}
                        </h3>
                        <button
                            onClick={nextMonth}
                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <ChevronRight className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>

                    {/* Days of week header */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm', 'Dum'].map((day) => (
                            <div key={day} className="text-center text-xs font-medium text-slate-500 py-1">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {/* Previous month days */}
                        {prevMonthDays.map((day) => {
                            const dayStr = formatDate(day);
                            const isSelected = selectedDate && isSameDay(day, selectedDate);
                            return (
                                <button
                                    key={`prev-${dayStr}`}
                                    disabled
                                    className="p-2 text-xs text-slate-300 rounded-lg cursor-not-allowed"
                                >
                                    {format(day, 'd')}
                                </button>
                            );
                        })}

                        {/* Current month days */}
                        {days.map((day) => {
                            const dayStr = formatDate(day);
                            const isSelected = selectedDate && isSameDay(day, selectedDate);
                            const isTodayDate = isToday(day);
                            const isDisabled = isDateDisabled(day);

                            return (
                                <button
                                    key={dayStr}
                                    onClick={() => !isDisabled && handleDateClick(day)}
                                    disabled={isDisabled}
                                    className={`
                                        p-2 text-xs rounded-lg transition-colors
                                        ${isSelected 
                                            ? 'bg-blue-600 text-white font-semibold' 
                                            : isTodayDate 
                                                ? 'bg-blue-50 text-blue-700 font-medium' 
                                                : isDisabled
                                                    ? 'text-slate-300 cursor-not-allowed'
                                                    : 'text-slate-700 hover:bg-blue-50'
                                        }
                                    `}
                                >
                                    {format(day, 'd')}
                                </button>
                            );
                        })}

                        {/* Next month days */}
                        {nextMonthDays.map((day) => {
                            const dayStr = formatDate(day);
                            return (
                                <button
                                    key={`next-${dayStr}`}
                                    disabled
                                    className="p-2 text-xs text-slate-300 rounded-lg cursor-not-allowed"
                                >
                                    {format(day, 'd')}
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
                        <button
                            onClick={() => {
                                onChange('');
                                setIsOpen(false);
                            }}
                            className="text-xs text-slate-600 hover:text-slate-800"
                        >
                            Șterge
                        </button>
                        <button
                            onClick={() => {
                                const todayStr = formatDate(new Date());
                                if (!min || todayStr >= min) {
                                    if (!max || todayStr <= max) {
                                        onChange(todayStr);
                                        setIsOpen(false);
                                    }
                                }
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                            Astăzi
                        </button>
                    </div>
                </div>
=======
                    value={value ? formatDateForDisplay(value) : ''}
                    onClick={() => setIsOpen(!isOpen)}
                    placeholder="Selectează data"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer bg-white"
                />
                {isOpen && (
                    <div className="absolute z-50 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 p-4 w-[320px]">
                        <div className="flex items-center justify-between mb-4">
                            <button
                                onClick={prevMonth}
                                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4 text-slate-600" />
                            </button>
                            <h3 className="text-sm font-medium text-slate-700 capitalize">
                                {format(currentDate, 'MMMM yyyy', { locale: ro })}
                            </h3>
                            <button
                                onClick={nextMonth}
                                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <ChevronRight className="w-4 h-4 text-slate-600" />
                            </button>
                        </div>

                        {/* Days of week header - starting with Monday */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {['Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm', 'Dum'].map((day) => (
                                <div key={day} className="p-2 text-center text-xs font-medium text-slate-500">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar grid */}
                        <div className="grid grid-cols-7 gap-1">
                            {/* Empty cells for start of month - week starts on Monday (1) */}
                            {Array.from({ length: (getDay(monthStart) + 6) % 7 }).map((_, i) => (
                                <div key={`empty-${i}`} className="p-2" />
                            ))}

                            {days.map((day) => {
                                const isWknd = isWeekend(day);
                                const isPast = minDate ? isBefore(day, minDate) : false;
                                const isFuture = maxDate ? isBefore(maxDate, day) && !isSameDay(day, maxDate) : false;
                                const isSelected = selectedDate && isSameDay(day, selectedDate);
                                const isTodayDate = isToday(day);
                                const dayStr = formatDateForInput(day);
                                const isDisabled = isPast || isFuture;

                                return (
                                    <button
                                        key={dayStr}
                                        onClick={() => handleDateClick(day)}
                                        disabled={isDisabled}
                                        className={`
                                            p-2 text-xs font-medium rounded-lg transition-colors
                                            ${isDisabled ? 'text-slate-300 cursor-not-allowed' : ''}
                                            ${isWknd && !isDisabled ? 'text-slate-400' : ''}
                                            ${isSelected ? 'bg-blue-600 text-white font-semibold' : ''}
                                            ${!isSelected && !isDisabled && !isWknd ? 'hover:bg-blue-50 text-slate-700' : ''}
                                            ${isTodayDate && !isSelected ? 'ring-2 ring-blue-500 text-blue-600' : ''}
                                        `}
                                    >
                                        {format(day, 'd')}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
            {isOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                />
>>>>>>> 79f0aeedaea0c3849c71f1a41ca33babd80e45f7
            )}
        </div>
    );
}

