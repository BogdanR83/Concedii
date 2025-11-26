import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { User, Lock, AlertCircle } from 'lucide-react';
import { ChangePasswordModal } from './ChangePasswordModal';

export function Login() {
    const { login } = useStore();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const result = await login(username, password);
            if (result.success) {
                if (result.mustChangePassword) {
                    setShowChangePassword(true);
                }
            } else {
                setError(result.error || 'Username sau parolă incorectă.');
            }
        } catch (err) {
            setError('A apărut o eroare la autentificare.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
                    <div className="flex items-center justify-center mb-8">
                        <div className="bg-blue-100 p-3 rounded-full">
                            <User className="w-8 h-8 text-blue-600" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">
                        Autentificare
                    </h1>
                    <p className="text-center text-slate-500 mb-8">
                        Introdu username-ul și parola pentru a continua
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Username
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Introdu username-ul"
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Parolă
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Introdu parola"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Se autentifică...' : 'Autentificare'}
                        </button>
                    </form>

                    <p className="text-xs text-slate-500 text-center mt-4">
                        Parola inițială: <strong>12345</strong>
                    </p>
                </div>
            </div>

            {showChangePassword && (
                <ChangePasswordModal
                    onClose={() => setShowChangePassword(false)}
                    onSuccess={() => setShowChangePassword(false)}
                />
            )}
        </>
    );
}

