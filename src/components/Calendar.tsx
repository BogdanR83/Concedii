import React, { useState } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    isWeekend,
    isToday
} from 'date-fns';
import { ro } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, LogOut, User as UserIcon, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { useStore } from '../lib/store';
import { BookingModal } from './BookingModal';
import { formatDate } from '../lib/utils';

export function Calendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const { currentUser, logout, bookings, users, removeBooking } = useStore();

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

        const educators = bookingsOnDate.filter(b => {
            const u = users.find(user => user.id === b.userId);
            return u?.role === 'EDUCATOR';
        }).length;

        const auxiliaries = bookingsOnDate.filter(b => {
            const u = users.find(user => user.id === b.userId);
            return u?.role === 'AUXILIARY';
        }).length;

        const isFull = educators >= 1 && auxiliaries >= 1;
        const isMyBooking = bookingsOnDate.some(b => b.userId === currentUser?.id);

        return { educators, auxiliaries, isFull, isMyBooking };
    };

    // Get user's own bookings
    const myBookings = bookings.filter(b => b.userId === currentUser?.id).sort((a, b) => 
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
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
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                        <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                            <ChevronLeft className="w-5 h-5 text-slate-600" />
                        </button>
                        <h2 className="text-lg font-semibold text-slate-900 capitalize">
                            {format(currentDate, 'MMMM yyyy', { locale: ro })}
                        </h2>
                        <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                            <ChevronRight className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                        {['Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm', 'Dum'].map((day) => (
                            <div key={day} className="p-4 text-center text-sm font-medium text-slate-500">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 auto-rows-fr">
                        {/* Empty cells for start of month */}
                        {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
                            <div key={`empty-${i}`} className="bg-slate-50/30 border-b border-r border-slate-100 min-h-[120px]" />
                        ))}

                        {days.map((day) => {
                            const isWknd = isWeekend(day);
                            const { educators, auxiliaries, isFull, isMyBooking } = getDayStatus(day);
                            const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));

                            return (
                                <div
                                    key={day.toISOString()}
                                    onClick={() => !isWknd && !isPast && !isFull && setSelectedDate(day)}
                                    className={`
                    min-h-[120px] p-3 border-b border-r border-slate-100 relative group transition-all
                    ${isWknd ? 'bg-slate-50/50' : 'bg-white hover:bg-blue-50/30 cursor-pointer'}
                    ${isToday(day) ? 'ring-2 ring-inset ring-blue-500/50' : ''}
                    ${isMyBooking ? 'bg-blue-50/50' : ''}
                  `}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`
                      text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                      ${isToday(day) ? 'bg-blue-600 text-white' : 'text-slate-700'}
                      ${isWknd ? 'text-slate-400' : ''}
                    `}>
                                            {format(day, 'd')}
                                        </span>
                                        {isMyBooking && (
                                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                                                Concediul Tău
                                            </span>
                                        )}
                                    </div>

                                    {!isWknd && (
                                        <div className="space-y-1.5">
                                            {educators > 0 && (
                                                <div className="flex items-center gap-1.5 text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded border border-purple-100">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                                    <span>1 Educatoare</span>
                                                </div>
                                            )}
                                            {auxiliaries > 0 && (
                                                <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    <span>1 Auxiliar</span>
                                                </div>
                                            )}
                                            {educators === 0 && auxiliaries === 0 && !isPast && (
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-slate-400 flex items-center gap-1">
                                                    <UserIcon className="w-3 h-3" />
                                                    <span>Liber</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* My Bookings Section */}
                {myBookings.length > 0 && (
                    <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                            <h2 className="text-lg font-semibold text-slate-900">Concediile mele</h2>
                        </div>
                        <div className="p-4">
                            <div className="space-y-2">
                                {myBookings.map((booking) => (
                                    <div
                                        key={booking.id}
                                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <CalendarIcon className="w-4 h-4 text-blue-600" />
                                            <span className="text-sm text-slate-700">
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
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Anulează concediul"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {selectedDate && (
                <BookingModal
                    date={selectedDate}
                    onClose={() => setSelectedDate(null)}
                />
            )}
        </div>
    );
}
