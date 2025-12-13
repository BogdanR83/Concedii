import React from 'react';
import { X, UserPlus, AlertCircle } from 'lucide-react';
import type { Role } from '../lib/types';

interface AddUserModalProps {
    onClose: () => void;
    onCreate: (name: string, role: Role, username: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

export function AddUserModal({ onClose, onCreate }: AddUserModalProps) {
    const [name, setName] = React.useState<string>('');
    const [role, setRole] = React.useState<Role>('EDUCATOR');
    const [username, setUsername] = React.useState<string>('');
    const [password, setPassword] = React.useState<string>('12345');
    const [error, setError] = React.useState<string | null>(null);
    const [success, setSuccess] = React.useState(false);
    const [creating, setCreating] = React.useState(false);

    // Generate username suggestion from name
    React.useEffect(() => {
        if (name && !username) {
            const nameParts = name.trim().split(' ');
            if (nameParts.length >= 2) {
                const firstName = nameParts[0];
                const lastName = nameParts.slice(1).join('');
                // Remove diacritics and convert to lowercase
                const cleanFirstName = firstName
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .toLowerCase()
                    .charAt(0);
                const cleanLastName = lastName
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .toLowerCase();
                setUsername(`${cleanFirstName}${cleanLastName}`);
            }
        }
    }, [name, username]);

    const handleSubmit = async () => {
        setError(null);

        // Validation
        if (!name.trim()) {
            setError('Numele este obligatoriu');
            return;
        }
        const trimmedUsername = username.trim();
        if (!trimmedUsername) {
            setError('Username-ul este obligatoriu');
            return;
        }
        if (trimmedUsername.length < 3) {
            setError('Username-ul trebuie să aibă minim 3 caractere');
            return;
        }
        if (!password || password.length < 4) {
            setError('Parola trebuie să aibă minim 4 caractere');
            return;
        }

        setCreating(true);
        const result = await onCreate(name.trim(), role, username.trim().toLowerCase(), password);
        setCreating(false);

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
                            <UserPlus className="w-5 h-5 text-blue-600" />
                            Adaugă utilizator nou
                        </h2>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="mb-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Nume complet: *
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ex: Popa Ana Maria"
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Rol: *
                            </label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value as Role)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="EDUCATOR">Educatoare</option>
                                <option value="AUXILIARY">Auxiliar</option>
                                <option value="ADMIN">Administrator</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Username: *
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                                placeholder="Ex: apopa"
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Se generează automat din nume (poți modifica)
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Parolă inițială: *
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="12345"
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Parola implicită: 12345 (utilizatorul va trebui să o schimbe la prima logare)
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            {error}
                        </div>
                    )}

                    {success ? (
                        <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg text-center font-medium">
                            Utilizatorul a fost creat cu succes!
                        </div>
                    ) : (
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
                                disabled={creating}
                            >
                                Anulează
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={creating}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {creating ? 'Se creează...' : 'Creează utilizator'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

