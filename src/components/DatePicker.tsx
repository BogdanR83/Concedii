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

        onChange(dayStr);
        setIsOpen(false);
    };

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
            <div className="relative">
                <input
                    type="text"
                    readOnly
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
            )}
        </div>
    );
}

