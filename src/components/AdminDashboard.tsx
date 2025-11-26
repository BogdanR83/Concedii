import { useState } from 'react';
import { LogOut, Calendar as CalendarIcon, FileText, Users, RefreshCw, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, eachDayOfInterval, isWeekend, addMonths, subMonths, isToday } from 'date-fns';
import { ro } from 'date-fns/locale';
import { calculateUserAvailableDays, usersApi } from '../lib/api';
import { AdminBookingModal } from './AdminBookingModal';

// Calculate working days (excluding weekends) in a date range
const calculateWorkingDays = (startDate: Date, endDate: Date): number => {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    return days.filter(day => !isWeekend(day)).length;
};

export function AdminDashboard() {
    const { currentUser, logout, bookings, users, setUserMaxVacationDays, resetUserPassword, removeBooking } = useStore();
    const [view, setView] = useState<'all' | 'report' | 'users' | 'calendar'>('calendar');
    const [resettingPassword, setResettingPassword] = useState<string | null>(null);
    const [editingDaysForUser, setEditingDaysForUser] = useState<string | null>(null);
    const [tempDays, setTempDays] = useState<string>('');
    const [resettingYearly, setResettingYearly] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDateForBooking, setSelectedDateForBooking] = useState<Date | null>(null);

    // Get all bookings sorted by start date
    const allBookings = bookings
        .map(booking => ({
            ...booking,
            user: users.find(u => u.id === booking.userId)
        }))
        .filter(b => b.user)
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

            const reportEntries = bookingsInMonth.map(booking => {
                const user = users.find(u => u.id === booking.userId);
                if (!user) return null;

                // Split name into first and last name
                const nameParts = user.name.split(' ');
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';

                // Calculate the period within this month
                const bookingStart = new Date(booking.startDate);
                const bookingEnd = new Date(booking.endDate);
                
                const periodStart = bookingStart < monthStart ? monthStart : bookingStart;
                const periodEnd = bookingEnd > monthEnd ? monthEnd : bookingEnd;

                const workingDays = calculateWorkingDays(periodStart, periodEnd);
                
                // Calculate remaining days for this user at the end of this month
                const userData = users.find(u => u.id === user.id);
                if (!userData) return null;
                
                const currentYear = month.getFullYear();
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
                        const days = eachDayOfInterval({ start, end });
                        usedDays2025 += days.filter(day => !isWeekend(day)).length;
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
                
                // Calculate working days used up to end of this month
                let usedDaysUpToMonth = 0;
                bookingsUpToMonth.forEach(booking => {
                    const start = new Date(booking.startDate);
                    const end = new Date(booking.endDate);
                    const days = eachDayOfInterval({ start, end });
                    usedDaysUpToMonth += days.filter(day => !isWeekend(day)).length;
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
                    remainingDays
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
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
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
                <div className="mb-6 flex gap-2 flex-wrap">
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
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-slate-900">Calendar Concedii</h2>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setSelectedDateForBooking(new Date())}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                                        >
                                            + Adaugă Rezervare
                                        </button>
                                        <button
                                            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                        >
                                            <ChevronLeft className="w-5 h-5 text-slate-600" />
                                        </button>
                                        <h3 className="text-md font-medium text-slate-700 min-w-[180px] text-center capitalize">
                                            {format(currentDate, 'MMMM yyyy', { locale: ro })}
                                        </h3>
                                        <button
                                            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                        >
                                            <ChevronRight className="w-5 h-5 text-slate-600" />
                                        </button>
                                        <button
                                            onClick={() => setCurrentDate(new Date())}
                                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                        >
                                            Astăzi
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                                {['Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm', 'Dum'].map((day) => (
                                    <div key={day} className="p-3 text-center text-sm font-medium text-slate-500 border-r border-slate-200 last:border-r-0">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 auto-rows-fr">
                                {/* Empty cells for start of month */}
                                {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
                                    <div key={`empty-${i}`} className="bg-slate-50/30 border-b border-r border-slate-100 min-h-[140px]" />
                                ))}

                                {days.map((day) => {
                                    const isWknd = isWeekend(day);
                                    const dayBookings = getBookingsForDate(day);
                                    const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));
                                    
                                    return (
                                        <div
                                            key={day.toISOString()}
                                            className={`
                                                min-h-[140px] p-2 border-b border-r border-slate-100 relative
                                                ${isWknd ? 'bg-slate-50/50' : 'bg-white'}
                                                ${isToday(day) ? 'ring-2 ring-inset ring-blue-500/50' : ''}
                                            `}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className={`
                                                    text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                                                    ${isToday(day) ? 'bg-blue-600 text-white' : 'text-slate-700'}
                                                    ${isPast ? 'opacity-50' : ''}
                                                `}>
                                                    {format(day, 'd')}
                                                </span>
                                            </div>
                                            
                                            <div className="space-y-1 mt-1">
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
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                            <h2 className="text-lg font-semibold text-slate-900">Toate rezervările</h2>
                        </div>
                        <div className="p-4">
                            {allBookings.length === 0 ? (
                                <p className="text-slate-500 text-center py-8">Nu există rezervări.</p>
                            ) : (
                                <div className="space-y-3">
                                    {allBookings.map((booking) => (
                                        <div
                                            key={booking.id}
                                            className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-3 h-3 rounded-full ${
                                                    booking.user?.role === 'ADMIN' ? 'bg-purple-400' 
                                                    : booking.user?.role === 'EDUCATOR' ? 'bg-blue-500' 
                                                    : 'bg-emerald-500'
                                                }`} />
                                                <div>
                                                    <p className="font-medium text-slate-900">{booking.user?.name}</p>
                                                    <p className="text-sm text-slate-500">
                                                        {booking.user?.role === 'ADMIN' ? 'Administrator' 
                                                        : booking.user?.role === 'EDUCATOR' ? 'Educatoare' 
                                                        : 'Auxiliar'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <CalendarIcon className="w-4 h-4" />
                                                <span>
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
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Monthly Report View */}
                {view === 'report' && (
                    <div className="space-y-6">
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
                                                            <span className={entry.remainingDays >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                                                {entry.remainingDays}
                                                            </span>
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
                )}

                {/* Users Management View */}
                {view === 'users' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                            <h2 className="text-lg font-semibold text-slate-900">Gestionare utilizatori</h2>
                        </div>
                        <div className="p-4">
                            {users.length === 0 ? (
                                <p className="text-slate-500 text-center py-8">Nu există utilizatori.</p>
                            ) : (
                                <div className="space-y-3">
                                    {users.map((user) => {
                                        const userRemainingDays = calculateUserAvailableDays(user, bookings);
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

