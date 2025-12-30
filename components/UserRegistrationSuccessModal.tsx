import React from 'react';

interface UserRegistrationSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const UserRegistrationSuccessModal: React.FC<UserRegistrationSuccessModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 10000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(4px)'
            }}
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-8 flex flex-col items-center text-center">
                    {/* Success Icon with Ripple Effect */}
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-emerald-100 dark:bg-emerald-900/30 rounded-full animate-ping opacity-75"></div>
                        <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                            <span className="material-symbols-outlined text-4xl text-white font-bold">check_circle</span>
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        Cadastro Realizado!
                    </h2>

                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">
                        Sua conta foi criada com sucesso.<br />
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Verifique seu e-mail</span> para confirmar o acesso.
                    </p>

                    <button
                        onClick={onClose}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 group"
                    >
                        <span>Fazer Login</span>
                        <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserRegistrationSuccessModal;
