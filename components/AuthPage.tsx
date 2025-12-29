import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthPageProps {
    onAuthSuccess: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                onAuthSuccess();
            } else {
                if (password !== confirmPassword) {
                    throw new Error('As senhas não coincidem');
                }

                // Super Admin Metadata Injection
                let optionsData = {};
                if (email.toLowerCase() === 'arakaki.med@gmail.com') {
                    optionsData = {
                        role: 'Admin',
                        name: 'SuperAdmin',
                        initials: 'SA'
                    };
                }

                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: optionsData
                    }
                });
                if (error) throw error;
                alert('Cadastro realizado! Se necessário, verifique seu e-mail para confirmar a conta.');
                setIsLogin(true);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 font-sans">
            <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl shadow-lg shadow-primary/20 mb-4">
                            <span className="material-symbols-outlined text-white text-3xl">medical_services</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">MediTrack</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">
                            {isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta'}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
                                placeholder="seu@email.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Senha</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
                                placeholder="••••••••"
                            />
                        </div>

                        {!isLogin && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirmar Senha</label>
                                <input
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
                                    placeholder="••••••••"
                                />
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">error</span>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <span>{isLogin ? 'Entrar' : 'Criar Conta'}</span>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-primary font-bold hover:underline text-sm"
                        >
                            {isLogin ? 'Não tem uma conta? Crie agora' : 'Já tem uma conta? Entre'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
