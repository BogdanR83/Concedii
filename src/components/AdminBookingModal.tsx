import React from 'react';
import { X, Calendar as CalendarIcon, User } from 'lucide-react';
import { useStore } from '../lib/store';
import { formatDate } from '../lib/utils';

interface AdminBookingModalProps {
    date: Date;
    onClose: () => void;
}

export function AdminBookingModal({ date, onClose }: AdminBookingModalProps) {
    const { users, bookings, addBookingForUser } = useStore();
    const [error, setError] = React.useState<string | null>(null);
    const [success, setSuccess] = React.useState(false);
    const [selectedUserId, setSelectedUserId] = React.useState<string>('');
    const [startDate, setStartDate] = React.useState<string>(formatDate(date));
    const [endDate, setEndDate] = React.useState<string>(formatDate(date));

    // Include all users (including admins)
    const allUsers = users;

    const handleBooking = async () => {
        if (!selectedUserId) {
            setError('Te rugăm să selectezi un utilizator.');
            return;
        }

        if (startDate > endDate) {
            setError('Data de început trebuie să fie înainte de data de sfârșit.');
            return;
        }

        setError(null);
        const result = await addBookingForUser(selectedUserId, startDate, endDate);
        
        if (result.success) {
            setSuccess(true);
            setTimeout(() => {
                onClose();
                // Reload page to refresh bookings
                window.location.reload();
            }, 1500);
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
                            Rezervare Concediu (Admin)
                        </h2>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="mb-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                <User className="w-4 h-4 inline mr-1" />
                                Selectează utilizatorul:
                            </label>
                            <select
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            >
                                <option value="">-- Selectează utilizator --</option>
                                {allUsers.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} ({user.role === 'EDUCATOR' ? 'Educatoare' : user.role === 'AUXILIARY' ? 'Auxiliar' : 'Administrator'})
                                    </option>
                                ))}
                            </select>
                        </div>

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

                    <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-800">
                            <strong>Notă:</strong> Ca administrator, poți crea rezervări pentru orice utilizator, fără restricții de disponibilitate.
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
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
                                disabled={!selectedUserId}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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

