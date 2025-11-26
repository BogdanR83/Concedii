import { useStore } from '../lib/store';
import { User } from 'lucide-react';

export function UserSelect() {
    const { users, login } = useStore();

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
                <div className="flex items-center justify-center mb-8">
                    <div className="bg-blue-100 p-3 rounded-full">
                        <User className="w-8 h-8 text-blue-600" />
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">
                    Bine ai venit
                </h1>
                <p className="text-center text-slate-500 mb-8">
                    Selectează-ți numele pentru a continua
                </p>

                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                    {users.map((user) => {
                        const isEducator = user.role === 'EDUCATOR';
                        const isAdmin = user.role === 'ADMIN';
                        
                        return (
                            <button
                                key={user.id}
                                onClick={() => {
                                    // UserSelect is deprecated - should use Login component
                                    // This is kept for backward compatibility
                                    if (user.username) {
                                        login(user.username, '12345');
                                    }
                                }}
                                style={isEducator ? { backgroundColor: 'rgb(195, 220, 253)' } : undefined}
                                className={`w-full text-left p-4 rounded-lg border transition-all group ${
                                    isAdmin 
                                        ? 'border-slate-200 hover:border-slate-400 hover:bg-slate-50' 
                                        : isEducator
                                        ? 'border-blue-300 hover:border-blue-500 hover:bg-blue-100'
                                        : 'border-emerald-200 bg-emerald-50 hover:border-emerald-500 hover:bg-emerald-100'
                                }`}
                            >
                                <div className={`font-medium ${
                                    isAdmin 
                                        ? 'text-slate-900 group-hover:text-slate-700' 
                                        : isEducator
                                        ? 'text-slate-900 group-hover:text-blue-800'
                                        : 'text-slate-900 group-hover:text-emerald-800'
                                }`}>
                                    {user.name}
                                </div>
                                <div className={`text-xs uppercase tracking-wider mt-1 ${
                                    isAdmin 
                                        ? 'text-slate-500' 
                                        : isEducator
                                        ? 'text-blue-700'
                                        : 'text-emerald-700'
                                }`}>
                                    {user.role === 'EDUCATOR' ? 'Educatoare' : user.role === 'AUXILIARY' ? 'Personal Auxiliar' : 'Administrator'}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
