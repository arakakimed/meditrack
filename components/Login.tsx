import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Limpeza automática de sessão ao acessar a página de login
    useEffect(() => {
        const clearOldSession = async () => {
            try {
                // Verifica se existe uma sessão antiga
                const { data: { session } } = await supabase.auth.getSession();

                // Se existe sessão mas o usuário está na página de login,
                // significa que ele quer fazer um novo login -> limpar sessão antiga
                if (session) {
                    await supabase.auth.signOut();
                }
            } catch (error) {
                console.error('Erro ao limpar sessão antiga:', error);
            }
        };

        clearOldSession();
    }, []);

    // Limpa estados ao desmontar para evitar vazamento de memória
    useEffect(() => {
        return () => setLoading(false);
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Timeout de segurança: Se a internet cair ou algo travar, libera o botão em 10s
        const timeoutId = setTimeout(() => {
            setLoading((current) => {
                if (current) {
                    setError("O servidor demorou para responder. Verifique sua conexão.");
                    return false;
                }
                return current;
            });
        }, 10000);

        try {
            // 1. Autenticação
            const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) throw signInError;

            if (user) {
                // 2. Buscar a role (função de segurança)
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .maybeSingle();

                if (profileError) {
                    console.error('Erro de perfil:', profileError); // Único log necessário em prod
                    throw new Error("Erro ao carregar permissões do usuário.");
                }

                const role = profile?.role;

                // Limpa o timeout pois deu tudo certo
                clearTimeout(timeoutId);

                // 3. Roteamento Inteligente
                if (role === 'admin') navigate('/admin');
                else if (role === 'staff') navigate('/staff');
                else if (role === 'patient') navigate('/patient');
                else navigate('/unauthorized');
            }
        } catch (err: any) {
            clearTimeout(timeoutId);
            // Tradução de erros comuns para o usuário final
            if (err.message === "Invalid login credentials") {
                setError("E-mail ou senha incorretos.");
            } else if (err.message === "Email not confirmed") {
                setError("Por favor, confirme seu e-mail antes de entrar.");
            } else {
                setError(err.message || 'Ocorreu um erro ao tentar entrar.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 transition-colors duration-300">
            <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 border border-slate-100 dark:border-slate-700">

                {/* Cabeçalho */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20 mb-4" translate="no">
                        <span className="material-symbols-outlined text-white text-3xl">medical_services</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Bem-vindo de volta</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Acesse o Meditrack para continuar</p>
                </div>

                {/* Mensagem de Erro */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 text-red-600 dark:text-red-400 text-sm rounded-xl flex gap-3 items-start animate-fade-in" role="alert">
                        <span className="material-symbols-outlined text-xl shrink-0" translate="no">error</span>
                        <span className="notranslate font-medium">{error}</span>
                    </div>
                )}

                {/* Formulário */}
                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none placeholder:text-slate-400"
                            placeholder="seu@email.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Senha</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none placeholder:text-slate-400"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/25 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2 mt-2"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <span className="material-symbols-outlined" translate="no">login</span>
                                <span>Entrar no Sistema</span>
                            </>
                        )}
                    </button>
                </form>

                {/* Rodapé (Opcional) */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                        &copy; 2026 Meditrack - Gestão Inteligente
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;