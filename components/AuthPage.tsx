import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthPageProps {
    onAuthSuccess: () => void;
}

// Modal de Cadastro Pendente
const PendingApprovalModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-8 text-center">
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-white text-5xl">hourglass_top</span>
                    </div>
                    <h2 className="text-2xl font-black text-white">Aguardando Aprovação</h2>
                </div>
                <div className="p-6 text-center">
                    <p className="text-slate-600 dark:text-slate-300 mb-4">
                        Seu cadastro foi recebido e está sendo analisado pela administração da clínica.
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                        Você receberá acesso assim que sua conta for aprovada. Isso geralmente leva até 24 horas úteis.
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 rounded-xl transition-all"
                    >
                        Entendi
                    </button>
                </div>
            </div>
        </div>
    );
};

// Modal de Sucesso no Cadastro
const SignupSuccessModal: React.FC<{ isOpen: boolean; onClose: () => void; patientName: string }> = ({ isOpen, onClose, patientName }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-8 text-center">
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-white text-5xl">check_circle</span>
                    </div>
                    <h2 className="text-2xl font-black text-white">Cadastro Realizado!</h2>
                </div>
                <div className="p-6 text-center">
                    <p className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
                        Olá, {patientName.split(' ')[0]}! 👋
                    </p>
                    <p className="text-slate-600 dark:text-slate-300 mb-4">
                        Seu pré-cadastro foi enviado com sucesso!
                    </p>
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-amber-600 mt-0.5">info</span>
                            <div className="text-left">
                                <p className="font-bold text-amber-800 dark:text-amber-300 text-sm">Próximo Passo</p>
                                <p className="text-amber-700 dark:text-amber-400 text-sm">
                                    Aguarde a aprovação da clínica para acessar o sistema. Você será notificado quando sua conta estiver liberada.
                                </p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl transition-all"
                    >
                        Voltar para Login
                    </button>
                </div>
            </div>
        </div>
    );
};

const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Campos adicionais para cadastro
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modals
    const [showPendingModal, setShowPendingModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [registeredName, setRegisteredName] = useState('');

    // Formatar telefone
    const formatPhone = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 11) {
            return numbers
                .replace(/^(\d{2})(\d)/g, '($1) $2')
                .replace(/(\d{5})(\d)/, '$1-$2');
        }
        return value.slice(0, 15);
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isLogin) {
                // ========== FLUXO DE LOGIN ==========
                const { data, error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) throw signInError;

                if (data.user) {
                    // Verificar se é paciente e se está aprovado
                    const { data: patientData } = await supabase
                        .from('patients')
                        .select('access_granted, status')
                        .eq('user_id', data.user.id)
                        .single();

                    // Se encontrou registro de paciente
                    if (patientData) {
                        // Se NÃO está aprovado, bloqueia o acesso
                        if (!patientData.access_granted || patientData.status === 'pending') {
                            // Fazer logout silencioso
                            await supabase.auth.signOut();
                            setShowPendingModal(true);
                            setLoading(false);
                            return;
                        }
                    }

                    // Verificar se precisa trocar senha (fluxo existente)
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('must_change_password')
                        .eq('id', data.user.id)
                        .single();

                    if (profile?.must_change_password) {
                        // Redirecionar para troca de senha (implementar se necessário)
                        setError('Você precisa trocar sua senha. Entre em contato com a clínica.');
                        await supabase.auth.signOut();
                        setLoading(false);
                        return;
                    }
                }

                onAuthSuccess();

            } else {
                // ========== FLUXO DE CADASTRO (SIGNUP) ==========

                // Validações
                if (!fullName.trim()) {
                    throw new Error('Por favor, informe seu nome completo');
                }
                if (fullName.trim().split(' ').length < 2) {
                    throw new Error('Por favor, informe nome e sobrenome');
                }
                if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
                    throw new Error('Por favor, informe um telefone válido');
                }
                if (password !== confirmPassword) {
                    throw new Error('As senhas não coincidem');
                }
                if (password.length < 6) {
                    throw new Error('A senha deve ter pelo menos 6 caracteres');
                }

                // 1. Criar usuário no Supabase Auth
                const { data: authData, error: signUpError } = await supabase.auth.signUp({
                    email: email.toLowerCase().trim(),
                    password,
                    options: {
                        data: {
                            name: fullName.trim(),
                            role: 'patient'
                        }
                    }
                });

                if (signUpError) {
                    if (signUpError.message.includes('already registered')) {
                        throw new Error('Este e-mail já está cadastrado. Tente fazer login.');
                    }
                    throw signUpError;
                }

                if (!authData.user) {
                    throw new Error('Erro ao criar usuário. Tente novamente.');
                }

                // 2. Criar registro na tabela patients com status pendente
                const initials = fullName
                    .trim()
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .substring(0, 2);

                const { error: patientError } = await supabase
                    .from('patients')
                    .insert({
                        user_id: authData.user.id,
                        name: fullName.trim().toUpperCase(),
                        email: email.toLowerCase().trim(),
                        phone: phone.replace(/\D/g, ''),
                        initials: initials,
                        access_granted: false
                    });

                // Log se houve erro, mas não bloquear o fluxo
                if (patientError) {
                    console.error('Erro ao criar paciente:', patientError);
                }

                // 3. Fazer logout (usuário não pode acessar ainda)
                try {
                    await supabase.auth.signOut();
                } catch (logoutErr) {
                    console.warn('Erro ao fazer logout:', logoutErr);
                }

                // 4. Mostrar modal de sucesso - SEMPRE após criar auth
                setRegisteredName(fullName);
                setShowSuccessModal(true);
                setLoading(false);
                return; // Importante: retornar aqui para não ir para o finally
            }
        } catch (err: any) {
            console.error('Auth error:', err);
            setError(err.message || 'Erro de autenticação');
            setLoading(false);
        }
    };

    const handleSuccessModalClose = () => {
        setShowSuccessModal(false);
        setIsLogin(true);
        // Limpar campos
        setFullName('');
        setPhone('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 font-sans p-4">
            {/* Modals */}
            <PendingApprovalModal
                isOpen={showPendingModal}
                onClose={() => setShowPendingModal(false)}
            />
            <SignupSuccessModal
                isOpen={showSuccessModal}
                onClose={handleSuccessModalClose}
                patientName={registeredName}
            />

            <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden">
                <div className="p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl shadow-lg shadow-primary/20 mb-4">
                            <span className="material-symbols-outlined text-white text-3xl">medical_services</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">MediTrack</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">
                            {isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta de paciente'}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-5">
                        {/* Campos de Cadastro */}
                        {!isLogin && (
                            <>
                                {/* Nome Completo */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        <span className="material-symbols-outlined text-base text-blue-500">person</span>
                                        Nome Completo
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
                                        placeholder="Seu nome completo"
                                    />
                                </div>

                                {/* Telefone */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        <span className="material-symbols-outlined text-base text-emerald-500">phone</span>
                                        Telefone (WhatsApp)
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        value={phone}
                                        onChange={(e) => setPhone(formatPhone(e.target.value))}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                            </>
                        )}

                        {/* Email */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                <span className="material-symbols-outlined text-base text-purple-500">mail</span>
                                Email
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
                                placeholder="seu@email.com"
                            />
                        </div>

                        {/* Senha */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                <span className="material-symbols-outlined text-base text-amber-500">lock</span>
                                Senha
                            </label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
                                placeholder="••••••••"
                            />
                        </div>

                        {/* Confirmar Senha (apenas cadastro) */}
                        {!isLogin && (
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    <span className="material-symbols-outlined text-base text-amber-500">lock</span>
                                    Confirmar Senha
                                </label>
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

                        {/* Erro */}
                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-start gap-2">
                                <span className="material-symbols-outlined text-[18px] mt-0.5">error</span>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Botão Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-xl">
                                        {isLogin ? 'login' : 'person_add'}
                                    </span>
                                    <span>{isLogin ? 'Entrar' : 'Solicitar Cadastro'}</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Toggle Login/Signup */}
                    <div className="mt-6 text-center">
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError(null);
                            }}
                            className="text-primary font-bold hover:underline text-sm"
                        >
                            {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre'}
                        </button>
                    </div>

                    {/* Aviso sobre aprovação (apenas no cadastro) */}
                    {!isLogin && (
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                            <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
                                <span className="material-symbols-outlined text-xs align-middle mr-1">info</span>
                                Após o cadastro, aguarde a aprovação da clínica para acessar o sistema.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
