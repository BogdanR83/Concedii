import React from 'react';
import { X, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import { useStore } from '../lib/store';
import { formatDate } from '../lib/utils';

interface BookingModalProps {
    date: Date;
    onClose: () => void;
}

export function BookingModal({ date, onClose }: BookingModalProps) {
    const { addBooking, bookings, users } = useStore();
    const [error, setError] = React.useState<string | null>(null);
    const [success, setSuccess] = React.useState(false);
    const [startDate, setStartDate] = React.useState<string>(formatDate(date));
    const [endDate, setEndDate] = React.useState<string>(formatDate(date));

    // Get existing bookings that overlap with the selected period
    const bookingsInPeriod = bookings.filter((b) => {
        const bStart = new Date(b.startDate);
        const bEnd = new Date(b.endDate);
        const selectedStart = new Date(startDate);
        const selectedEnd = new Date(endDate);
        return !(selectedEnd < bStart || selectedStart > bEnd);
    });
    const bookedUsers = bookingsInPeriod.map(b => users.find(u => u.id === b.userId)).filter(Boolean);

    const handleBooking = async () => {
        const result = await addBooking(startDate, endDate);
        if (result.success) {
            setSuccess(true);
            setTimeout(onClose, 1500);
        } else {
            setError(result.error || 'A apărut o eroare');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5 text-blue-600" />
                            Rezervare Concediu
                        </h2>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="mb-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Data de început:
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                    if (e.target.value > endDate) {
                                        setEndDate(e.target.value);
                                    }
                                }}
                                min={formatDate(new Date())}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Data de sfârșit:
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                min={startDate}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        {startDate === endDate ? (
                            <p className="text-sm text-slate-600">
                                Perioadă: <span className="font-medium">{new Date(startDate).toLocaleDateString('ro-RO', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}</span>
                            </p>
                        ) : (
                            <p className="text-sm text-slate-600">
                                Perioadă: <span className="font-medium">
                                    {new Date(startDate).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })} - {new Date(endDate).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                            </p>
                        )}
                    </div>

                    {bookedUsers.length > 0 && (
                        <div className="mb-6 bg-slate-50 p-4 rounded-lg">
                            <p className="text-sm font-medium text-slate-700 mb-2">Deja în concediu în această perioadă:</p>
                            <div className="space-y-2">
                                {bookedUsers.map(u => {
                                    const userBooking = bookingsInPeriod.find(b => b.userId === u?.id);
                                    return (
                                        <div key={u?.id} className="flex items-center gap-2 text-sm text-slate-600">
                                            <div className={`w-2 h-2 rounded-full ${u?.role === 'EDUCATOR' ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                                            <span>{u?.name}</span>
                                            <span className="text-xs text-slate-400">({u?.role === 'EDUCATOR' ? 'Educatoare' : 'Auxiliar'})</span>
                                            {userBooking && (
                                                <span className="text-xs text-slate-500">
                                                    ({new Date(userBooking.startDate).toLocaleDateString('ro-RO')} - {new Date(userBooking.endDate).toLocaleDateString('ro-RO')})
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            {error}
                        </div>
                    )}

                    {success ? (
                        <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg text-center font-medium">
                            Rezervare efectuată cu succes!
                        </div>
                    ) : (
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
                            >
                                Anulează
                            </button>
                            <button
                                onClick={handleBooking}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                            >
                                Confirmă Rezervarea
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
