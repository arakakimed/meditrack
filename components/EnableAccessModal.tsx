import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Patient } from '../types';

interface EnableAccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    patient: Patient | null;
    onSuccess: () => void;
}

const EnableAccessModal: React.FC<EnableAccessModalProps> = ({ isOpen, onClose, patient, onSuccess }) => {
    // Tenta usar o email do paciente se existir, senão vazio
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('Mudar@123'); // Sugestão padrão
    const [loading, setLoading] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    // Atualiza o email quando o paciente muda
    React.useEffect(() => {
        if (patient?.email) setEmail(patient.email);
        else setEmail('');
    }, [patient]);

    if (!isOpen || !patient) return null;

    const handleCreateUser = async () => {
        setLoading(true);
        try {
            // Usar Auth API oficial do Supabase
            // IMPORTANTE: Desabilite "Confirm email" em Authentication > Providers > Email
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: email.toLowerCase().trim(),
                password,
                options: {
                    data: { patient_id: patient.id, name: patient.name, role: 'patient' }
                }
            });

            if (authError) {
                if (authError.message?.includes('already registered') || authError.message?.includes('already exists')) {
                    await supabase.from('patients').update({ email: email.toLowerCase().trim() }).eq('id', patient.id);
                    alert(`O e-mail já existe. O paciente pode fazer login com a senha existente.`);
                    onSuccess();
                    onClose();
                    return;
                }
                throw authError;
            }

            // Atualizar paciente com user_id
            await supabase.from('patients').update({
                email: email.toLowerCase().trim(),
                user_id: authData?.user?.id,
                access_granted: true,
                access_granted_at: new Date().toISOString()
            }).eq('id', patient.id);

            alert(`Sucesso! O acesso de ${patient.name} foi criado.`);
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Erro:', error);

            if (error.message?.includes('rate limit') || error.message?.includes('429')) {
                alert('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
            } else {
                alert('Erro ao liberar acesso: ' + (error.message || 'Erro desconhecido'));
            }
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        const text = `Olá ${patient.name}, seu app MediTrack foi liberado!\n\nLogin: ${email}\nSenha Provisória: ${password}\n\nBaixe e acesse agora para acompanhar seu tratamento.`;
        navigator.clipboard.writeText(text);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-100 dark:border-slate-700">

                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-20"><span className="material-symbols-outlined text-6xl text-white">lock_open</span></div>
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md shadow-lg">
                        <span className="material-symbols-outlined text-3xl text-white">person_add</span>
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight">Liberar Acesso App</h3>
                    <p className="text-emerald-100 text-xs font-medium mt-1">Crie o login para {patient.name}</p>
                </div>

                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 ml-1">E-mail (Login)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-400 material-symbols-outlined text-lg">mail</span>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="email@exemplo.com"
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium text-slate-700 dark:text-slate-200"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 ml-1">Senha Provisória</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <span className="absolute left-3 top-2.5 text-slate-400 material-symbols-outlined text-lg">key</span>
                                <input
                                    type="text"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            <button
                                onClick={() => setPassword(Math.random().toString(36).slice(-8))}
                                className="px-3 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                title="Gerar nova senha aleatória"
                            >
                                <span className="material-symbols-outlined">refresh</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800 flex items-center justify-between group cursor-pointer" onClick={copyToClipboard}>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-300">
                                <span className="material-symbols-outlined text-lg">chat</span>
                            </div>
                            <div className="text-xs text-emerald-800 dark:text-emerald-200 font-medium">
                                Copiar mensagem de boas-vindas
                            </div>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded transition-colors ${copySuccess ? 'bg-emerald-200 text-emerald-800' : 'text-emerald-600 group-hover:bg-white/50'}`}>
                            {copySuccess ? 'Copiado!' : 'Copiar'}
                        </span>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button onClick={onClose} className="flex-1 py-3 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors">Cancelar</button>
                        <button
                            onClick={handleCreateUser}
                            disabled={loading || !email || !password}
                            className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <span className="material-symbols-outlined">check_circle</span>}
                            Confirmar Acesso
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EnableAccessModal;