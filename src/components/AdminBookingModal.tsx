import React from 'react';
import { X, Calendar as CalendarIcon, User, FileText } from 'lucide-react';
import { useStore } from '../lib/store';
import { formatDate, formatDateStringToLocal } from '../lib/utils';
import { DatePicker } from './DatePicker';

interface AdminBookingModalProps {
    date: Date;
    onClose: () => void;
}

// Disease codes based on the document provided
const DISEASE_CODES = [
    { code: '01', label: '01 - Boală obişnuită' },
    { code: '02', label: '02 - Accident în timpul deplasării la/de la locul de muncă' },
    { code: '03', label: '03 - Accident de muncă' },
    { code: '04', label: '04 - Boală profesională' },
    { code: '05', label: '05 - Boală infectocontagioasă din grupa A' },
    { code: '51', label: '51 - Boală infectocontagioasă pentru care se instituie măsura izolării' },
    { code: '06', label: '06 - Urgenţă medico-chirurgicală' },
    { code: '07', label: '07 - Carantină' },
    { code: '08', label: '08 - Sarcină şi lăuzie' },
    { code: '09', label: '09 - Îngrijire copil bolnav în vârstă de până la 12 ani sau copil cu handicap' },
    { code: '91', label: '91 - Îngrijire copil bolnav cu afecțiuni grave, în vârstă de până la 18 ani' },
    { code: '92', label: '92 - Supravegherea și îngrijirea copilului în vârstă de până la 18 ani, pentru care s-a dispus măsura carantinei sau a izolării' },
    { code: '10', label: '10 - Reducerea cu 1/4 a duratei normale de lucru' },
    { code: '11', label: '11 - Trecerea temporară în altă muncă' },
    { code: '12', label: '12 - Tuberculoză' },
    { code: '13', label: '13 - Boală cardiovasculară' },
    { code: '14', label: '14 - Neoplazii, SIDA' },
    { code: '15', label: '15 - Risc maternal' },
    { code: '16', label: '16 - Unele tipuri de arsuri, inclusiv pentru perioada de recuperare' },
    { code: '17', label: '17 - Îngrijire pacient cu afecțiuni oncologice' },
];

export function AdminBookingModal({ date, onClose }: AdminBookingModalProps) {
    const { users, addBookingForUser, addMedicalLeave } = useStore();
    const [error, setError] = React.useState<string | null>(null);
    const [success, setSuccess] = React.useState(false);
    const [selectedUserId, setSelectedUserId] = React.useState<string>('');
    const [startDate, setStartDate] = React.useState<string>(formatDate(date));
    const [endDate, setEndDate] = React.useState<string>(formatDate(date));
    const [leaveType, setLeaveType] = React.useState<'vacation' | 'medical'>('vacation');
    const [diseaseCode, setDiseaseCode] = React.useState<string>('01');

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

        if (leaveType === 'medical' && !diseaseCode) {
            setError('Te rugăm să selectezi codul de boală.');
            return;
        }

        setError(null);
        
        let result;
        if (leaveType === 'medical') {
            result = await addMedicalLeave(selectedUserId, startDate, endDate, diseaseCode);
        } else {
            result = await addBookingForUser(selectedUserId, startDate, endDate);
        }
        
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
                            {leaveType === 'medical' ? (
                                <>
                                    <FileText className="w-5 h-5 text-red-600" />
                                    Adaugă Concediu Medical (Admin)
                                </>
                            ) : (
                                <>
                                    <CalendarIcon className="w-5 h-5 text-blue-600" />
                                    Rezervare Concediu (Admin)
                                </>
                            )}
                        </h2>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="mb-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Tip concediu:
                            </label>
                            <select
                                value={leaveType}
                                onChange={(e) => setLeaveType(e.target.value as 'vacation' | 'medical')}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="vacation">Concediu de odihnă (CO)</option>
                                <option value="medical">Concediu medical (CM)</option>
                            </select>
                        </div>

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

                        {leaveType === 'medical' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    <FileText className="w-4 h-4 inline mr-1" />
                                    Cod boală:
                                </label>
                                <select
                                    value={diseaseCode}
                                    onChange={(e) => setDiseaseCode(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    required
                                >
                                    {DISEASE_CODES.map((dc) => (
                                        <option key={dc.code} value={dc.code}>
                                            {dc.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <DatePicker
                            label="Data de început:"
                            value={startDate}
                            onChange={(value) => {
                                setStartDate(value);
                                if (value > endDate) {
                                    setEndDate(value);
                                }
                            }}
                            min={formatDate(new Date())}
                        />
                        <DatePicker
                            label="Data de sfârșit:"
                            value={endDate}
                            onChange={setEndDate}
                            min={startDate}
                        />
                        {startDate === endDate ? (
                            <p className="text-sm text-slate-600">
                                Perioadă: <span className="font-medium">{formatDateStringToLocal(startDate, {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}</span>
                            </p>
                        ) : (
                            <p className="text-sm text-slate-600">
                                Perioadă: <span className="font-medium">
                                    {formatDateStringToLocal(startDate, { day: 'numeric', month: 'long', year: 'numeric' })} - {formatDateStringToLocal(endDate, { day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                            </p>
                        )}
                    </div>

                    <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-800">
                            <strong>Notă:</strong> Ca administrator, poți crea rezervări pentru orice utilizator, fără restricții de disponibilitate.
                            {leaveType === 'medical' && ' Concediile medicale nu sunt vizibile pentru utilizatorii normali.'}
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
                                className={`flex-1 px-4 py-2 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                                    leaveType === 'medical' 
                                        ? 'bg-red-600 hover:bg-red-700' 
                                        : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                            >
                                {leaveType === 'medical' ? 'Adaugă CM' : 'Confirmă Rezervarea'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

