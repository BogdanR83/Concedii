import { useState, useRef, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isToday, isSameDay, getDay } from 'date-fns';
import { ro } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
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
    const formatInputValue = (isoValue: string) => {
        if (!isoValue) return '';
        return new Date(isoValue + 'T12:00:00').toLocaleDateString('ro-RO');
    };
    const [inputValue, setInputValue] = useState(() => formatInputValue(value));
    const [inputError, setInputError] = useState<string | null>(null);
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
        setInputValue(formatInputValue(value));
    }, [value]);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Get first day of month (0 = Sunday, 1 = Monday, etc.)
    // Adjust to start week on Monday (0 becomes 6, 1 becomes 0, etc.)
    const firstDayOfWeek = (getDay(monthStart) + 6) % 7; // Convert Sunday=0 to Monday=0

    const isWithinLimits = (dayStr: string) => {
        if (min && dayStr < min) return false;
        if (max && dayStr > max) return false;
        return true;
    };

    const parseInputToIso = (rawValue: string): string | null => {
        const trimmed = rawValue.trim();
        if (!trimmed) return null;
        const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
        if (isoMatch) {
            const iso = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
            const test = new Date(iso + 'T12:00:00');
            if (!Number.isNaN(test.getTime())) return iso;
            return null;
        }
        const roMatch = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(trimmed);
        if (roMatch) {
            const day = Number(roMatch[1]);
            const month = Number(roMatch[2]);
            const year = Number(roMatch[3]);
            if (!day || !month || !year) return null;
            const candidate = new Date(year, month - 1, day, 12, 0, 0);
            if (
                candidate.getFullYear() !== year ||
                candidate.getMonth() !== month - 1 ||
                candidate.getDate() !== day
            ) {
                return null;
            }
            return formatDate(candidate);
        }
        return null;
    };

    const getFormatError = (rawValue: string): string | null => {
        const trimmed = rawValue.trim();
        if (!trimmed) return null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
        if (/^\d{1,2}[./]\d{1,2}[./]\d{4}$/.test(trimmed)) return null;
        return 'Format invalid. Folosește dd.mm.yyyy, dd/mm/yyyy sau yyyy-mm-dd.';
    };

    const handleDateClick = (day: Date) => {
        const dayStr = formatDate(day);
        
        // Check min/max constraints
        if (!isWithinLimits(dayStr)) return;
        
        onChange(dayStr);
        setIsOpen(false);
    };

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const selectedDate = value ? new Date(value + 'T12:00:00') : null;

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
        return !isWithinLimits(dayStr);
    };

    return (
        <div ref={pickerRef} className={`relative ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    {label}
                </label>
            )}
            <div className="relative">
                <input
                    type="text"
                    value={inputValue}
                    onClick={() => setIsOpen(!isOpen)}
                    onChange={(event) => {
                        const nextValue = event.target.value;
                        setInputValue(nextValue);
                        setInputError(getFormatError(nextValue));
                        const parsedIso = parseInputToIso(nextValue);
                        if (parsedIso && isWithinLimits(parsedIso)) {
                            onChange(parsedIso);
                        }
                    }}
                    onBlur={() => {
                        const parsedIso = parseInputToIso(inputValue);
                        if (parsedIso && isWithinLimits(parsedIso)) {
                            setInputValue(formatInputValue(parsedIso));
                            setInputError(null);
                        } else {
                            setInputValue(formatInputValue(value));
                            setInputError(null);
                        }
                    }}
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
                                setInputValue('');
                                setIsOpen(false);
                            }}
                            className="text-xs text-slate-600 hover:text-slate-800"
                        >
                            Șterge
                        </button>
                        <button
                            onClick={() => {
                                const todayStr = formatDate(new Date());
                                if (isWithinLimits(todayStr)) {
                                        onChange(todayStr);
                                        setInputValue(formatInputValue(todayStr));
                                        setIsOpen(false);
                                }
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                            Astăzi
                        </button>
                    </div>
                </div>
            )}
            {inputError && (
                <div className="mt-1 text-xs text-red-600">
                    {inputError}
                </div>
            )}
        </div>
    );
}
