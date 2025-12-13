import { useState, useEffect } from 'react';
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
import { ChevronLeft, ChevronRight, LogOut, User as UserIcon, Trash2, Calendar as CalendarIcon, Check, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { BookingModal } from './BookingModal';
import { formatDate, getHolidayDates, isDateInClosedPeriod } from '../lib/utils';

export function Calendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [startDateSelected, setStartDateSelected] = useState<Date | null>(null);
    const [endDateSelected, setEndDateSelected] = useState<Date | null>(null);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [holidayDates, setHolidayDates] = useState<Set<string>>(new Set());
    const { currentUser, logout, bookings, users, closedPeriods, removeBooking } = useStore();

    // Load holidays for the current year and next year
    useEffect(() => {
        const loadHolidays = async () => {
            const currentYear = currentDate.getFullYear();
            const nextYear = currentYear + 1;
            
            const [currentYearHolidays, nextYearHolidays] = await Promise.all([
                getHolidayDates(currentYear),
                getHolidayDates(nextYear)
            ]);
            
            const allHolidays = [...currentYearHolidays, ...nextYearHolidays];
            const holidaySet = new Set(allHolidays.map(d => formatDate(d)));
            setHolidayDates(holidaySet);
        };
        
        loadHolidays();
    }, [currentDate.getFullYear()]);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    const getDayStatus = (date: Date) => {
        const dateStr = formatDate(date);
        const dateObj = new Date(dateStr);
        
        // Get all bookings that include this date
        const bookingsOnDate = bookings.filter(b => {
            const bStart = new Date(b.startDate);
            const bEnd = new Date(b.endDate);
            return dateObj >= bStart && dateObj <= bEnd;
        });

        // Exclude current user's own bookings when checking availability
        const otherBookingsOnDate = bookingsOnDate.filter(b => b.userId !== currentUser?.id);

        const educators = otherBookingsOnDate.filter(b => {
            const u = users.find(user => user.id === b.userId);
            return u?.role === 'EDUCATOR';
        }).length;

        const auxiliaries = otherBookingsOnDate.filter(b => {
            const u = users.find(user => user.id === b.userId);
            return u?.role === 'AUXILIARY';
        }).length;

        // Day is full if the current user's role-specific limit is reached
        // Educators can't book if another educator is already booked
        // Auxiliaries can't book if another auxiliary is already booked
        // Admins have no restrictions (isFull is always false for them)
        let isFull = false;
        if (currentUser?.role === 'EDUCATOR') {
            isFull = educators >= 1;
        } else if (currentUser?.role === 'AUXILIARY') {
            isFull = auxiliaries >= 1;
        }
        // For ADMIN, isFull remains false (no restrictions)

        const isMyBooking = bookingsOnDate.some(b => b.userId === currentUser?.id);

        return { educators, auxiliaries, isFull, isMyBooking };
    };

    // Get user's own bookings
    const myBookings = bookings.filter(b => b.userId === currentUser?.id).sort((a, b) => 
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    const handleDateClick = (day: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dayNormalized = new Date(day);
        dayNormalized.setHours(0, 0, 0, 0);
        const dayYear = dayNormalized.getFullYear();

        // Allow dates from 2025 or earlier (including past dates)
        // Block dates from 2026 onwards
        if (dayYear > 2025 || isWeekend(day)) {
            return;
        }

        // Check if day is in a closed period (kindergarten is closed, everyone is on vacation)
        if (closedPeriods && closedPeriods.length > 0 && isDateInClosedPeriod(day, closedPeriods)) {
            return; // Cannot book during closed periods
        }

        const { isFull } = getDayStatus(day);
        if (isFull) {
            return;
        }

        // If no start date is selected, set it
        if (!startDateSelected) {
            setStartDateSelected(dayNormalized);
            setEndDateSelected(null);
            return;
        }

        // If start date is selected
        if (startDateSelected && !endDateSelected) {
            // If clicking before start date, make this the new start date
            if (isBefore(dayNormalized, startDateSelected)) {
                setStartDateSelected(dayNormalized);
                setEndDateSelected(null);
                return;
            }

            // If clicking on the same day as start, just set end to same day
            if (isSameDay(dayNormalized, startDateSelected)) {
                setEndDateSelected(dayNormalized);
                return;
            }

            // Otherwise, set end date
            setEndDateSelected(dayNormalized);
            return;
        }

        // If both dates are selected, reset and start new selection
        if (startDateSelected && endDateSelected) {
            setStartDateSelected(dayNormalized);
            setEndDateSelected(null);
        }
    };

    const isDateInRange = (day: Date) => {
        if (!startDateSelected) return false;
        const dayNormalized = new Date(day);
        dayNormalized.setHours(0, 0, 0, 0);
        
        if (endDateSelected) {
            const start = new Date(startDateSelected);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDateSelected);
            end.setHours(0, 0, 0, 0);
            return (dayNormalized >= start && dayNormalized <= end);
        }
        return isSameDay(dayNormalized, startDateSelected);
    };

    const isDateStart = (day: Date) => {
        if (!startDateSelected) return false;
        const dayNormalized = new Date(day);
        dayNormalized.setHours(0, 0, 0, 0);
        const start = new Date(startDateSelected);
        start.setHours(0, 0, 0, 0);
        return isSameDay(dayNormalized, start);
    };

    const isDateEnd = (day: Date) => {
        if (!endDateSelected) return false;
        const dayNormalized = new Date(day);
        dayNormalized.setHours(0, 0, 0, 0);
        const end = new Date(endDateSelected);
        end.setHours(0, 0, 0, 0);
        return isSameDay(dayNormalized, end);
    };

    return (
        <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col min-h-0 p-2 md:p-4">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-center justify-between mb-2 gap-2 flex-shrink-0">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Planificator Concedii</h1>
                        <p className="text-slate-500">
                            Bine ai venit, <span className="font-medium text-blue-600">{currentUser?.name}</span>
                        </p>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Deconectare
                    </button>
                </div>

                {/* Calendar Controls */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
                    <div className="p-2 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
                        <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                            <ChevronLeft className="w-5 h-5 text-slate-600" />
                        </button>
                        <div className="flex flex-col items-center">
                            <h2 className="text-lg font-semibold text-slate-900 capitalize">
                                {format(currentDate, 'MMMM yyyy', { locale: ro })}
                            </h2>
                            {startDateSelected && !endDateSelected && (
                                <p className="text-xs text-blue-600 mt-1">
                                    Selectează data de sfârșit
                                </p>
                            )}
                            {startDateSelected && endDateSelected && (
                                <p className="text-xs text-green-600 mt-1 font-medium">
                                    Perioadă selectată: {format(startDateSelected, 'dd MMM', { locale: ro })} - {format(endDateSelected, 'dd MMM yyyy', { locale: ro })}
                                </p>
                            )}
                        </div>
                        <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                            <ChevronRight className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 flex-shrink-0">
                        {['Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm', 'Dum'].map((day) => (
                            <div key={day} className="p-2 text-center text-sm font-medium text-slate-500">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 flex-1 min-h-0 overflow-y-auto">
                        {/* Empty cells for start of month - week starts on Monday (1) */}
                        {Array.from({ length: (getDay(monthStart) + 6) % 7 }).map((_, i) => (
                            <div key={`empty-${i}`} className="bg-slate-50/30 border-b border-r border-slate-100" />
                        ))}

                        {days.map((day) => {
                            const isWknd = isWeekend(day);
                            const { educators, auxiliaries, isMyBooking } = getDayStatus(day);
                            const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));
                            const inRange = isDateInRange(day);
                            const isStart = isDateStart(day);
                            const isEnd = isDateEnd(day);
                            const isHoliday = holidayDates.has(formatDate(day));
                            const isClosed = closedPeriods && closedPeriods.length > 0 && isDateInClosedPeriod(day, closedPeriods);

                            return (
                                <div
                                    key={day.toISOString()}
                                    onClick={() => handleDateClick(day)}
                                    className={`
                    p-2 border-b border-r border-slate-100 relative group transition-all flex flex-col
                    ${isClosed ? 'bg-slate-200/60 border-slate-300' : ''}
                    ${isHoliday && !isClosed ? 'bg-amber-50/80 border-amber-200' : ''}
                    ${isWknd ? 'bg-slate-50/50' : isHoliday || isClosed ? '' : 'bg-white hover:bg-blue-50/30 cursor-pointer'}
                    ${isClosed ? '' : isToday(day) ? 'ring-2 ring-inset ring-blue-500/50' : ''}
                    ${isMyBooking && !isClosed ? 'bg-blue-50/50' : ''}
                    ${inRange && !isWknd && !isHoliday && !isClosed ? 'bg-blue-100/50' : ''}
                    ${isStart && !isWknd && !isHoliday && !isClosed ? 'bg-blue-200 ring-2 ring-blue-500' : ''}
                    ${isEnd && !isWknd && !isHoliday && !isClosed ? 'bg-blue-200 ring-2 ring-blue-500' : ''}
                  `}
                                >
                                    <div className="flex justify-between items-start mb-1 flex-shrink-0">
                                        <span className={`
                      text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                      ${isClosed ? 'text-slate-500' : isToday(day) ? 'bg-blue-600 text-white' : isHoliday ? 'text-amber-700 font-semibold' : 'text-slate-700'}
                      ${isWknd && !isHoliday && !isClosed ? 'text-slate-400' : ''}
                    `}>
                                            {format(day, 'd')}
                                        </span>
                                        {isClosed && (
                                            <span className="text-[10px] bg-slate-300 text-slate-700 px-1 py-0.5 rounded font-medium">
                                                Închis
                                            </span>
                                        )}
                                        {isHoliday && !isClosed && (
                                            <span className="text-[10px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded font-medium">
                                                Sărbătoare
                                            </span>
                                        )}
                                        {isMyBooking && !isHoliday && !isClosed && (
                                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded font-medium">
                                                Concediul Tău
                                            </span>
                                        )}
                                    </div>

                                    {!isWknd && (
                                        <div className="space-y-1 flex-1 overflow-y-auto">
                                            {educators > 0 && (
                                                <div className="flex items-center gap-1 text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                                                    <div className="w-1 h-1 rounded-full bg-purple-500 flex-shrink-0" />
                                                    <span className="truncate">1 Educatoare</span>
                                                </div>
                                            )}
                                            {auxiliaries > 0 && (
                                                <div className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                                    <div className="w-1 h-1 rounded-full bg-emerald-500 flex-shrink-0" />
                                                    <span className="truncate">1 Auxiliar</span>
                                                </div>
                                            )}
                                            {educators === 0 && auxiliaries === 0 && !isPast && (
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-slate-400 flex items-center gap-1">
                                                    <UserIcon className="w-2.5 h-2.5" />
                                                    <span>Liber</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Selection Confirmation Bar */}
                    {startDateSelected && endDateSelected && !showBookingModal && (
                        <div className="p-3 border-t border-slate-200 bg-blue-50 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4 text-blue-600" />
                                <span className="text-sm text-slate-700">
                                    Perioadă selectată: <span className="font-semibold text-blue-700">
                                        {format(startDateSelected, 'dd MMM yyyy', { locale: ro })} - {format(endDateSelected, 'dd MMM yyyy', { locale: ro })}
                                    </span>
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setStartDateSelected(null);
                                        setEndDateSelected(null);
                                    }}
                                    className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
                                >
                                    <X className="w-4 h-4" />
                                    Anulează
                                </button>
                                <button
                                    onClick={() => setShowBookingModal(true)}
                                    className="px-4 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1 font-medium"
                                >
                                    <Check className="w-4 h-4" />
                                    Confirmă
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* My Bookings Section */}
                {myBookings.length > 0 && (
                    <div className="mt-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-shrink-0 max-h-[20vh] flex flex-col">
                        <div className="p-2 border-b border-slate-200 bg-slate-50/50 flex-shrink-0">
                            <h2 className="text-sm font-semibold text-slate-900">Concediile mele</h2>
                        </div>
                        <div className="p-2 overflow-y-auto flex-1">
                            <div className="space-y-1">
                                {myBookings.map((booking) => (
                                    <div
                                        key={booking.id}
                                        className="flex items-center justify-between p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <CalendarIcon className="w-3 h-3 text-blue-600 flex-shrink-0" />
                                            <span className="text-xs text-slate-700">
                                                {new Date(booking.startDate).toLocaleDateString('ro-RO', {
                                                    day: 'numeric',
                                                    month: 'long',
                                                    year: 'numeric'
                                                })}
                                                {booking.startDate !== booking.endDate && (
                                                    <> - {new Date(booking.endDate).toLocaleDateString('ro-RO', {
                                                        day: 'numeric',
                                                        month: 'long',
                                                        year: 'numeric'
                                                    })}</>
                                                )}
                                            </span>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                if (confirm('Ești sigur că vrei să anulezi acest concediu?')) {
                                                    await removeBooking(booking.id);
                                                }
                                            }}
                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                            title="Anulează concediul"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showBookingModal && startDateSelected && endDateSelected && (
                <BookingModal
                    date={startDateSelected}
                    endDate={endDateSelected}
                    onClose={() => {
                        setShowBookingModal(false);
                        setStartDateSelected(null);
                        setEndDateSelected(null);
                    }}
                />
            )}
        </div>
    );
}
