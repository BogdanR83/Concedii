import React from 'react';
import { X, AlertCircle, FileText } from 'lucide-react';
import { useStore } from '../lib/store';
import { eachDayOfInterval, isWeekend } from 'date-fns';

interface MedicalLeaveModalProps {
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

export function MedicalLeaveModal({ onClose }: MedicalLeaveModalProps) {
    const { users, addMedicalLeave } = useStore();
    const [error, setError] = React.useState<string | null>(null);
    const [success, setSuccess] = React.useState(false);
    const [selectedUserId, setSelectedUserId] = React.useState<string>('');
    const [startDate, setStartDate] = React.useState<string>('');
    const [endDate, setEndDate] = React.useState<string>('');
    const [diseaseCode, setDiseaseCode] = React.useState<string>('01');

    // Calculate working days preview
    const workingDays = React.useMemo(() => {
        if (!startDate || !endDate) return 0;
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (start > end) return 0;
            const days = eachDayOfInterval({ start, end });
            return days.filter(day => !isWeekend(day)).length;
        } catch {
            return 0;
        }
    }, [startDate, endDate]);

    const handleSubmit = async () => {
        if (!selectedUserId) {
            setError('Selectează un utilizator');
            return;
        }
        if (!startDate || !endDate) {
            setError('Completează ambele date');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            setError('Data de început trebuie să fie înainte de data de sfârșit');
            return;
        }

        const result = await addMedicalLeave(selectedUserId, startDate, endDate, diseaseCode);
        if (result.success) {
            setSuccess(true);
            setTimeout(() => {
                onClose();
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
                            <FileText className="w-5 h-5 text-red-600" />
                            Adaugă Concediu Medical
                        </h2>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="mb-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Utilizator:
                            </label>
                            <select
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            >
                                <option value="">Selectează utilizatorul</option>
                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} ({user.role === 'ADMIN' ? 'Administrator' : user.role === 'EDUCATOR' ? 'Educatoare' : 'Auxiliar'})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Cod boală:
                            </label>
                            <select
                                value={diseaseCode}
                                onChange={(e) => setDiseaseCode(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            >
                                {DISEASE_CODES.map((dc) => (
                                    <option key={dc.code} value={dc.code}>
                                        {dc.label}
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
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            />
                        </div>

                        {startDate && endDate && (
                            <div className="bg-slate-50 p-3 rounded-lg">
                                <p className="text-sm text-slate-600">
                                    <span className="font-medium">Zile lucrătoare:</span> {workingDays}
                                </p>
                                {startDate === endDate ? (
                                    <p className="text-sm text-slate-600 mt-1">
                                        Perioadă: <span className="font-medium">{new Date(startDate).toLocaleDateString('ro-RO', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}</span>
                                    </p>
                                ) : (
                                    <p className="text-sm text-slate-600 mt-1">
                                        Perioadă: <span className="font-medium">
                                            {new Date(startDate).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })} - {new Date(endDate).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </span>
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="mb-6 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            {error}
                        </div>
                    )}

                    {success ? (
                        <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg text-center font-medium">
                            Concediul medical a fost adăugat cu succes!
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
                                onClick={handleSubmit}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                            >
                                Adaugă CM
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
