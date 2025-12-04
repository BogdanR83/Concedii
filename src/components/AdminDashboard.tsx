import { useState, useEffect } from 'react';
import { LogOut, Calendar as CalendarIcon, FileText, Users, RefreshCw, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, eachDayOfInterval, isWeekend, addMonths, subMonths, isToday } from 'date-fns';
import { ro } from 'date-fns/locale';
import { calculateUserAvailableDaysSync, usersApi } from '../lib/api';
import { AdminBookingModal } from './AdminBookingModal';
import { formatDate, getHolidayDates, calculateWorkingDaysExcludingHolidaysSync } from '../lib/utils';

export function AdminDashboard() {
    const { currentUser, logout, bookings, medicalLeaves, users, setUserMaxVacationDays, resetUserPassword, removeBooking, removeMedicalLeave } = useStore();
    const [view, setView] = useState<'all' | 'report' | 'users' | 'calendar'>('calendar');
    const [resettingPassword, setResettingPassword] = useState<string | null>(null);
    const [editingDaysForUser, setEditingDaysForUser] = useState<string | null>(null);
    const [tempDays, setTempDays] = useState<string>('');
    const [holidayDates, setHolidayDates] = useState<Set<string>>(new Set());
    const [resettingYearly, setResettingYearly] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDateForBooking, setSelectedDateForBooking] = useState<Date | null>(null);

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

    // Get all bookings sorted by start date
    const allBookings = bookings
        .map(booking => ({
            ...booking,
            user: users.find(u => u.id === booking.userId),
            type: 'vacation' as const
        }))
        .filter(b => b.user)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    // Get all medical leaves sorted by start date
    const allMedicalLeaves = medicalLeaves
        .map(ml => ({
            ...ml,
            user: users.find(u => u.id === ml.userId),
            type: 'medical' as const
        }))
        .filter(ml => ml.user)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    // Combine bookings and medical leaves
    const allRecords = [...allBookings, ...allMedicalLeaves]
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());


    // Generate monthly report for 2025 and 2026
    const generateMonthlyReport = () => {
        const startYear = new Date(2025, 0, 1);
        const endYear = new Date(2026, 11, 31);
        const months = eachMonthOfInterval({ start: startYear, end: endYear });

        return months.map(month => {
            const monthStart = startOfMonth(month);
            const monthEnd = endOfMonth(month);

            const bookingsInMonth = bookings.filter(booking => {
                const bookingStart = new Date(booking.startDate);
                const bookingEnd = new Date(booking.endDate);
                
                // Check if booking overlaps with the month
                return (
                    (bookingStart >= monthStart && bookingStart <= monthEnd) ||
                    (bookingEnd >= monthStart && bookingEnd <= monthEnd) ||
                    (bookingStart <= monthStart && bookingEnd >= monthEnd)
                );
            });

            const medicalLeavesInMonth = medicalLeaves.filter(ml => {
                const mlStart = new Date(ml.startDate);
                const mlEnd = new Date(ml.endDate);
                
                // Check if medical leave overlaps with the month
                return (
                    (mlStart >= monthStart && mlStart <= monthEnd) ||
                    (mlEnd >= monthStart && mlEnd <= monthEnd) ||
                    (mlStart <= monthStart && mlEnd >= monthEnd)
                );
            });

            // Combine bookings and medical leaves for report
            const allEntriesInMonth = [
                ...bookingsInMonth.map(b => ({ ...b, type: 'vacation' as const })),
                ...medicalLeavesInMonth.map(ml => ({ ...ml, type: 'medical' as const }))
            ];

            const reportEntries = allEntriesInMonth.map(entry => {
                const isMedical = entry.type === 'medical';
                const booking = isMedical ? null : entry as any;
                const medicalLeave = isMedical ? entry as any : null;
                const userId = isMedical ? medicalLeave.userId : booking.userId;
                const user = users.find(u => u.id === userId);
                if (!user) return null;

                // Split name into first and last name
                const nameParts = user.name.split(' ');
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';

                // Calculate the period within this month
                const entryStart = isMedical ? new Date(medicalLeave.startDate) : new Date(booking.startDate);
                const entryEnd = isMedical ? new Date(medicalLeave.endDate) : new Date(booking.endDate);
                
                const periodStart = entryStart < monthStart ? monthStart : entryStart;
                const periodEnd = entryEnd > monthEnd ? monthEnd : entryEnd;

                const workingDays = isMedical ? medicalLeave.workingDays : calculateWorkingDaysExcludingHolidaysSync(periodStart, periodEnd, holidayDates);
                
                // For medical leave, get total CM days for this user in current year
                const currentYear = month.getFullYear();
                let totalMedicalLeaveDays = 0;
                if (isMedical) {
                    const userMedicalLeaves = medicalLeaves.filter(ml => 
                        ml.userId === userId && ml.year === currentYear
                    );
                    totalMedicalLeaveDays = userMedicalLeaves.reduce((sum, ml) => sum + ml.workingDays, 0);
                }
                
                // Calculate remaining days for this user at the end of this month
                const userData = users.find(u => u.id === user.id);
                if (!userData) return null;
                const maxDays = userData.maxVacationDays || 28;
                
                // Calculate remaining days from previous year
                let effectiveRemainingFromPrevious = userData.remainingDaysFromPreviousYear || 0;
                
                // For 2026, calculate what was remaining at end of 2025
                if (currentYear === 2026) {
                    const bookings2025 = bookings.filter(b => {
                        if (b.userId !== user.id) return false;
                        const bookingYear = new Date(b.startDate).getFullYear();
                        return bookingYear === 2025;
                    });
                    
                    let usedDays2025 = 0;
                    bookings2025.forEach(booking => {
                        const start = new Date(booking.startDate);
                        const end = new Date(booking.endDate);
                        usedDays2025 += calculateWorkingDaysExcludingHolidaysSync(start, end, holidayDates);
                    });
                    
                    const total2025 = maxDays + (userData.remainingDaysFromPreviousYear || 0);
                    effectiveRemainingFromPrevious = Math.max(0, total2025 - usedDays2025);
                }
                
                // Calculate used days up to the end of this month
                const bookingsUpToMonth = bookings.filter(b => {
                    if (b.userId !== user.id) return false;
                    const bookingDate = new Date(b.startDate);
                    const bookingYear = bookingDate.getFullYear();
                    const bookingMonth = bookingDate.getMonth();
                    
                    if (bookingYear < currentYear) return true;
                    if (bookingYear > currentYear) return false;
                    return bookingMonth <= month.getMonth();
                });
                
                // Calculate working days used up to end of this month (excluding holidays)
                let usedDaysUpToMonth = 0;
                bookingsUpToMonth.forEach(booking => {
                    const start = new Date(booking.startDate);
                    const end = new Date(booking.endDate);
                    usedDaysUpToMonth += calculateWorkingDaysExcludingHolidaysSync(start, end, holidayDates);
                });
                
                // Calculate remaining days at end of this month
                const totalAvailable = maxDays + effectiveRemainingFromPrevious;
                const remainingDays = totalAvailable - usedDaysUpToMonth;

                return {
                    firstName,
                    lastName,
                    fullName: user.name,
                    role: user.role,
                    period: `${periodStart.toLocaleDateString('ro-RO', { day: 'numeric', month: 'numeric' })} - ${periodEnd.toLocaleDateString('ro-RO', { day: 'numeric', month: 'numeric' })}`,
                    startDate: periodStart,
                    endDate: periodEnd,
                    workingDays,
                    userId: user.id,
                    remainingDays,
                    isMedical,
                    diseaseCode: isMedical ? medicalLeave.diseaseCode : undefined,
                    totalMedicalLeaveDays: isMedical ? totalMedicalLeaveDays : undefined,
                };
            }).filter(Boolean) as Array<{
                firstName: string;
                lastName: string;
                fullName: string;
                role: string;
                period: string;
                startDate: Date;
                endDate: Date;
                workingDays: number;
                userId: string;
                remainingDays: number;
                isMedical: boolean;
                diseaseCode?: string;
                totalMedicalLeaveDays?: number;
            }>;

            // Sort by last name, then first name
            reportEntries.sort((a, b) => {
                if (a.lastName !== b.lastName) {
                    return a.lastName.localeCompare(b.lastName, 'ro');
                }
                return a.firstName.localeCompare(b.firstName, 'ro');
            });

            return {
                month,
                monthName: format(month, 'MMMM yyyy', { locale: ro }),
                entries: reportEntries
            };
        }).filter(month => month.entries.length > 0);
    };

    const monthlyReport = generateMonthlyReport();

    return (
        <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col min-h-0 p-2 md:p-4">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-center justify-between mb-2 gap-2 flex-shrink-0">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Panou Administrator</h1>
                        <p className="text-slate-500">
                            Bine ai venit, <span className="font-medium text-blue-600">{currentUser?.name}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={async () => {
                                if (confirm('Ești sigur că vrei să resetezi zilele de concediu pentru noul an? Această acțiune va calcula zilele rămase din anul anterior și le va adăuga la noul an.')) {
                                    setResettingYearly(true);
                                    try {
                                        await usersApi.resetYearlyVacationDays();
                                        alert('Resetarea anuală a fost efectuată cu succes!');
                                        // Reload users to reflect changes
                                        window.location.reload();
                                    } catch (error) {
                                        alert('A apărut o eroare la resetarea anuală.');
                                    } finally {
                                        setResettingYearly(false);
                                    }
                                }
                            }}
                            disabled={resettingYearly}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            title="Resetează zilele de concediu pentru noul an (rulează în ianuarie)"
                        >
                            <RefreshCw className={`w-4 h-4 ${resettingYearly ? 'animate-spin' : ''}`} />
                            Resetare anuală
                        </button>
                        <button
                            onClick={logout}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Deconectare
                        </button>
                    </div>
                </div>

                {/* View Toggle */}
                <div className="mb-2 flex gap-2 flex-wrap flex-shrink-0">
                    <button
                        onClick={() => setView('calendar')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                            view === 'calendar'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        <CalendarIcon className="w-4 h-4" />
                        Calendar
                    </button>
                    <button
                        onClick={() => setView('all')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                            view === 'all'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        <Users className="w-4 h-4" />
                        Toate rezervările
                    </button>
                    <button
                        onClick={() => setView('report')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                            view === 'report'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        <FileText className="w-4 h-4" />
                        Raport lunar
                    </button>
                    <button
                        onClick={() => setView('users')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                            view === 'users'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        <Users className="w-4 h-4" />
                        Gestionare utilizatori
                    </button>
                </div>

                {/* Calendar View */}
                {view === 'calendar' && (() => {
                    const monthStart = startOfMonth(currentDate);
                    const monthEnd = endOfMonth(currentDate);
                    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
                    
                    const getBookingsForDate = (date: Date) => {
                        // Normalize date to start of day in local timezone
                        const dateYear = date.getFullYear();
                        const dateMonth = date.getMonth();
                        const dateDay = date.getDate();
                        
                        return bookings
                            .filter(b => {
                                const bStart = new Date(b.startDate);
                                const bEnd = new Date(b.endDate);
                                
                                // Normalize booking dates to start of day in local timezone
                                const bStartYear = bStart.getFullYear();
                                const bStartMonth = bStart.getMonth();
                                const bStartDay = bStart.getDate();
                                
                                const bEndYear = bEnd.getFullYear();
                                const bEndMonth = bEnd.getMonth();
                                const bEndDay = bEnd.getDate();
                                
                                // Compare dates without time/timezone
                                const dateTime = new Date(dateYear, dateMonth, dateDay).getTime();
                                const startTime = new Date(bStartYear, bStartMonth, bStartDay).getTime();
                                const endTime = new Date(bEndYear, bEndMonth, bEndDay).getTime();
                                
                                return dateTime >= startTime && dateTime <= endTime;
                            })
                            .map(b => ({
                                ...b,
                                user: users.find(u => u.id === b.userId)
                            }))
                            .filter(b => b.user);
                    };

                    return (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
                            <div className="p-2 border-b border-slate-200 bg-slate-50/50 flex-shrink-0">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-semibold text-slate-900">Calendar Concedii</h2>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setSelectedDateForBooking(new Date())}
                                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium"
                                        >
                                            + Adaugă Rezervare
                                        </button>
                                        <button
                                            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                                        >
                                            <ChevronLeft className="w-4 h-4 text-slate-600" />
                                        </button>
                                        <h3 className="text-sm font-medium text-slate-700 min-w-[150px] text-center capitalize">
                                            {format(currentDate, 'MMMM yyyy', { locale: ro })}
                                        </h3>
                                        <button
                                            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                                        >
                                            <ChevronRight className="w-4 h-4 text-slate-600" />
                                        </button>
                                        <button
                                            onClick={() => setCurrentDate(new Date())}
                                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                        >
                                            Astăzi
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 flex-shrink-0">
                                {['Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm', 'Dum'].map((day) => (
                                    <div key={day} className="p-2 text-center text-xs font-medium text-slate-500 border-r border-slate-200 last:border-r-0">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 flex-1 min-h-0 overflow-y-auto">
                                {/* Empty cells for start of month */}
                                {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
                                    <div key={`empty-${i}`} className="bg-slate-50/30 border-b border-r border-slate-100" />
                                ))}

                                {days.map((day) => {
                                    const isWknd = isWeekend(day);
                                    const dayBookings = getBookingsForDate(day);
                                    const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));
                                    const isHoliday = holidayDates.has(formatDate(day));
                                    
                                    return (
                                        <div
                                            key={day.toISOString()}
                                            className={`
                                                p-1.5 border-b border-r border-slate-100 relative flex flex-col
                                                ${isHoliday ? 'bg-amber-50/80 border-amber-200' : ''}
                                                ${isWknd ? 'bg-slate-50/50' : isHoliday ? '' : 'bg-white'}
                                                ${isToday(day) ? 'ring-2 ring-inset ring-blue-500/50' : ''}
                                            `}
                                        >
                                            <div className="flex justify-between items-start mb-1 flex-shrink-0">
                                                <span className={`
                                                    text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                                                    ${isToday(day) ? 'bg-blue-600 text-white' : isHoliday ? 'text-amber-700 font-semibold' : 'text-slate-700'}
                                                    ${isPast && !isHoliday ? 'opacity-50' : ''}
                                                `}>
                                                    {format(day, 'd')}
                                                </span>
                                                {isHoliday && (
                                                    <span className="text-[9px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded font-medium">
                                                        Zi liberă legală
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <div className="space-y-1 flex-1 overflow-y-auto">
                                                {dayBookings.map((booking) => {
                                                    const user = booking.user;
                                                    if (!user) return null;
                                                    
                                                    const isEducator = user.role === 'EDUCATOR';
                                                    const isAdmin = user.role === 'ADMIN';
                                                    
                                                    return (
                                                        <div
                                                            key={booking.id}
                                                            className={`
                                                                text-xs p-1.5 rounded group relative
                                                                ${isAdmin
                                                                    ? 'bg-purple-100 text-purple-900 border border-purple-200' 
                                                                    : isEducator 
                                                                    ? 'bg-blue-100 text-blue-900 border border-blue-200' 
                                                                    : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                                                }
                                                            `}
                                                            title={`${user.name} - ${user.role === 'ADMIN' ? 'Administrator' : user.role === 'EDUCATOR' ? 'Educatoare' : 'Auxiliar'}`}
                                                        >
                                                            <div className="flex items-center justify-between gap-1">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-medium truncate">{user.name.split(' ')[0]}</div>
                                                                    <div className="text-[10px] opacity-75 truncate">
                                                                        {user.name.split(' ').slice(1).join(' ')}
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        if (confirm(`Ești sigur că vrei să ștergi rezervarea pentru ${user.name}?`)) {
                                                                            await removeBooking(booking.id);
                                                                            // Reload to refresh calendar
                                                                            window.location.reload();
                                                                        }
                                                                    }}
                                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-red-200 rounded text-red-600 hover:text-red-800"
                                                                    title="Șterge rezervarea"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })()}

                {/* All Bookings View */}
                {view === 'all' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
                        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex-shrink-0">
                            <h2 className="text-lg font-semibold text-slate-900">Toate rezervările</h2>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1">
                            {allRecords.length === 0 ? (
                                <p className="text-slate-500 text-center py-8">Nu există rezervări.</p>
                            ) : (
                                <div className="space-y-3">
                                    {allRecords.map((record) => {
                                        const isMedical = record.type === 'medical';
                                        const medicalLeave = isMedical ? record as any : null;
                                        const booking = !isMedical ? record as any : null;
                                        
                                        return (
                                            <div
                                                key={record.id || booking?.id}
                                                className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-3 h-3 rounded-full ${
                                                        record.user?.role === 'ADMIN' ? 'bg-purple-400' 
                                                        : record.user?.role === 'EDUCATOR' ? 'bg-blue-500' 
                                                        : 'bg-emerald-500'
                                                    }`} />
                                                    <div>
                                                        <p className="font-medium text-slate-900">{record.user?.name}</p>
                                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                                            <span>
                                                                {record.user?.role === 'ADMIN' ? 'Administrator' 
                                                                : record.user?.role === 'EDUCATOR' ? 'Educatoare' 
                                                                : 'Auxiliar'}
                                                            </span>
                                                            {isMedical && (
                                                                <span className="text-red-600 font-medium">
                                                                    • CM {medicalLeave.diseaseCode}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                                        <CalendarIcon className="w-4 h-4" />
                                                        <span>
                                                            {new Date(record.startDate).toLocaleDateString('ro-RO', {
                                                                day: 'numeric',
                                                                month: 'long',
                                                                year: 'numeric'
                                                            })}
                                                            {record.startDate !== record.endDate && (
                                                                <> - {new Date(record.endDate).toLocaleDateString('ro-RO', {
                                                                    day: 'numeric',
                                                                    month: 'long',
                                                                    year: 'numeric'
                                                                })}</>
                                                            )}
                                                        </span>
                                                    </div>
                                                    {isMedical && (
                                                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-medium">
                                                            {medicalLeave.workingDays} zile lucrătoare
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm(`Ești sigur că vrei să ștergi ${isMedical ? 'concediul medical' : 'rezervarea'}?`)) {
                                                                if (isMedical) {
                                                                    await removeMedicalLeave(record.id);
                                                                } else {
                                                                    await removeBooking(booking.id);
                                                                }
                                                                window.location.reload();
                                                            }
                                                        }}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Șterge"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Monthly Report View */}
                {view === 'report' && (
                    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="overflow-y-auto flex-1 space-y-6">
                            {monthlyReport.length === 0 ? (
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                                    <p className="text-slate-500 text-center">Nu există date pentru raport.</p>
                                </div>
                            ) : (
                                monthlyReport.map(({ month, monthName, entries }) => (
                                <div key={month.toISOString()} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                                        <h2 className="text-lg font-semibold text-slate-900 capitalize">{monthName}</h2>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                                                        Nume
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                                                        Prenume
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                                                        Rol
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                                                        Perioadă
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                                                        Zile lucrătoare
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                                                        Zile rămase
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                                                        Tip / Cod boală
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                                                        Total zile CM (an)
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200">
                                                {entries.map((entry, idx) => (
                                                    <tr 
                                                        key={idx} 
                                                        style={
                                                            entry.role === 'ADMIN' ? { backgroundColor: 'rgb(221, 214, 254)' } 
                                                            : entry.role === 'EDUCATOR' ? { backgroundColor: 'rgb(195, 220, 253)' } 
                                                            : { backgroundColor: 'rgb(209, 250, 229)' }
                                                        }
                                                        className={`${
                                                            entry.role === 'ADMIN'
                                                                ? 'hover:bg-purple-200'
                                                                : entry.role === 'EDUCATOR' 
                                                                ? 'hover:bg-blue-200' 
                                                                : 'hover:bg-emerald-200'
                                                        } transition-colors`}
                                                    >
                                                        <td className="px-4 py-3 text-sm text-slate-900">
                                                            {entry.lastName}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-slate-900">
                                                            {entry.firstName}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-slate-600">
                                                            {entry.role === 'ADMIN' ? 'Administrator' 
                                                            : entry.role === 'EDUCATOR' ? 'Educatoare' 
                                                            : 'Auxiliar'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-slate-600">
                                                            {entry.period}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-slate-600 font-medium">
                                                            {entry.workingDays}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm font-medium">
                                                            {entry.isMedical ? (
                                                                <span className="text-slate-500">-</span>
                                                            ) : (
                                                                <span className={entry.remainingDays >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                                                    {entry.remainingDays}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-slate-600">
                                                            {entry.isMedical ? (
                                                                <span className="text-red-600 font-medium">CM {entry.diseaseCode}</span>
                                                            ) : (
                                                                <span className="text-blue-600 font-medium">CO</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm font-medium">
                                                            {entry.isMedical && entry.totalMedicalLeaveDays !== undefined ? (
                                                                <span className="text-red-600">{entry.totalMedicalLeaveDays}</span>
                                                            ) : (
                                                                <span className="text-slate-400">-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Users Management View */}
                {view === 'users' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
                        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex-shrink-0">
                            <h2 className="text-lg font-semibold text-slate-900">Gestionare utilizatori</h2>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1">
                            {users.length === 0 ? (
                                <p className="text-slate-500 text-center py-8">Nu există utilizatori.</p>
                            ) : (
                                <div className="space-y-3">
                                    {users.map((user) => {
                                        const userRemainingDays = calculateUserAvailableDaysSync(user, bookings, holidayDates);
                                        const maxDays = user.maxVacationDays || 28;
                                        const remainingFromPrevious = user.remainingDaysFromPreviousYear || 0;
                                        
                                        return (
                                            <div
                                                key={user.id}
                                                className="p-4 bg-slate-50 rounded-lg border border-slate-200"
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-3 h-3 rounded-full ${
                                                            user.role === 'ADMIN' ? 'bg-purple-400' 
                                                            : user.role === 'EDUCATOR' ? 'bg-blue-500' 
                                                            : user.role === 'AUXILIARY' ? 'bg-emerald-500' 
                                                            : 'bg-slate-500'
                                                        }`} />
                                                        <div>
                                                            <p className="font-medium text-slate-900">{user.name}</p>
                                                            <div className="flex items-center gap-3 text-sm text-slate-500">
                                                                <span>
                                                                    {user.role === 'ADMIN' ? 'Administrator' 
                                                                    : user.role === 'EDUCATOR' ? 'Educatoare' 
                                                                    : 'Auxiliar'}
                                                                </span>
                                                                {user.username && (
                                                                    <span className="text-xs bg-slate-200 px-2 py-0.5 rounded">
                                                                        Username: {user.username}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 text-sm">
                                                    <div>
                                                        <span className="text-slate-600">Zile max/an:</span>
                                                        {editingDaysForUser === user.id ? (
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <input
                                                                    type="number"
                                                                    value={tempDays}
                                                                    onChange={(e) => setTempDays(e.target.value)}
                                                                    min="1"
                                                                    max="365"
                                                                    className="w-20 px-2 py-1 border border-slate-300 rounded text-sm"
                                                                    autoFocus
                                                                />
                                                                <button
                                                                    onClick={async () => {
                                                                        const days = parseInt(tempDays);
                                                                        if (!isNaN(days) && days > 0) {
                                                                            const result = await setUserMaxVacationDays(user.id, days);
                                                                            if (result.success) {
                                                                                setEditingDaysForUser(null);
                                                                            } else {
                                                                                alert(result.error || 'Eroare la actualizare');
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                                                >
                                                                    Salvează
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingDaysForUser(null);
                                                                        setTempDays('');
                                                                    }}
                                                                    className="px-2 py-1 bg-slate-200 text-slate-700 text-xs rounded hover:bg-slate-300"
                                                                >
                                                                    Anulează
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="font-medium text-slate-900">{maxDays}</span>
                                                                <button
                                                                    onClick={() => {
                                                                        setTempDays(maxDays.toString());
                                                                        setEditingDaysForUser(user.id);
                                                                    }}
                                                                    className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded hover:bg-slate-200"
                                                                >
                                                                    Editează
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-600">Zile rămase din anul anterior:</span>
                                                        <span className="font-medium text-slate-900 ml-2">{remainingFromPrevious}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-600">Zile disponibile acum:</span>
                                                        <span className={`font-medium ml-2 ${userRemainingDays >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                            {userRemainingDays}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm(`Ești sigur că vrei să resetezi parola pentru ${user.name}? Parola va fi resetată la "12345".`)) {
                                                                setResettingPassword(user.id);
                                                                try {
                                                                    const result = await resetUserPassword(user.id);
                                                                    if (result.success) {
                                                                        alert('Parola a fost resetată cu succes!');
                                                                    } else {
                                                                        alert(result.error || 'A apărut o eroare la resetarea parolei.');
                                                                    }
                                                                } catch (error) {
                                                                    alert('A apărut o eroare la resetarea parolei.');
                                                                } finally {
                                                                    setResettingPassword(null);
                                                                }
                                                            }
                                                        }}
                                                        disabled={resettingPassword === user.id}
                                                        className="px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {resettingPassword === user.id ? 'Se resetează...' : 'Resetează parola'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Admin Booking Modal */}
                {selectedDateForBooking && (
                    <AdminBookingModal
                        date={selectedDateForBooking}
                        onClose={() => setSelectedDateForBooking(null)}
                    />
                )}

            </div>
        </div>
    );
}
