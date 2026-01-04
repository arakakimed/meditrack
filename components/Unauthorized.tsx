import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Unauthorized: React.FC = () => {
    const navigate = useNavigate();
    const { signOut } = useAuth();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 text-center">
            <span className="material-symbols-outlined text-6xl text-red-500 mb-4">gpp_bad</span>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Acesso Não Autorizado</h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md">
                Você não tem permissão para acessar esta página com seu perfil de acesso atual.
            </p>
            <div className="flex gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="px-6 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-300 transition-colors font-medium"
                >
                    Voltar
                </button>
                <button
                    onClick={() => { signOut(); navigate('/login'); }}
                    className="px-6 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors font-medium"
                >
                    Sair e Trocar de Conta
                </button>
            </div>
        </div>
    );
};

export default Unauthorized;
