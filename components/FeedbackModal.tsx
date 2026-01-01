import React from 'react';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    details?: string;
    actionLabel?: string;
    onAction?: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
    isOpen,
    onClose,
    type,
    title,
    message,
    details,
    actionLabel,
    onAction
}) => {
    if (!isOpen) return null;

    const config = {
        success: {
            icon: 'check_circle',
            bgGradient: 'from-emerald-500 to-teal-600',
            iconBg: 'bg-emerald-100 text-emerald-600',
            buttonBg: 'bg-emerald-600 hover:bg-emerald-700',
            actionBg: 'bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50'
        },
        error: {
            icon: 'error',
            bgGradient: 'from-rose-500 to-red-600',
            iconBg: 'bg-rose-100 text-rose-600',
            buttonBg: 'bg-rose-600 hover:bg-rose-700',
            actionBg: 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50'
        },
        warning: {
            icon: 'warning',
            bgGradient: 'from-amber-500 to-orange-600',
            iconBg: 'bg-amber-100 text-amber-600',
            buttonBg: 'bg-amber-600 hover:bg-amber-700',
            actionBg: 'bg-white text-amber-600 border border-amber-200 hover:bg-amber-50'
        },
        info: {
            icon: 'info',
            bgGradient: 'from-blue-500 to-indigo-600',
            iconBg: 'bg-blue-100 text-blue-600',
            buttonBg: 'bg-blue-600 hover:bg-blue-700',
            actionBg: 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'
        }
    };

    const c = config[type];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header com ícone */}
                <div className={`bg-gradient-to-r ${c.bgGradient} p-6 text-center`}>
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
                        <span className="material-symbols-outlined text-4xl text-white">{c.icon}</span>
                    </div>
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                </div>

                {/* Corpo */}
                <div className="p-6 text-center">
                    <p className="text-slate-700 text-sm leading-relaxed">{message}</p>

                    {details && (
                        <div className="mt-4 p-3 bg-slate-100 rounded-xl">
                            <p className="text-xs text-slate-500 font-mono break-all">{details}</p>
                        </div>
                    )}

                    <div className={`mt-6 ${actionLabel && onAction ? 'flex gap-3' : ''}`}>
                        {actionLabel && onAction && (
                            <button
                                onClick={() => { onAction(); onClose(); }}
                                className={`flex-1 py-3 ${c.actionBg} font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2`}
                            >
                                <span className="material-symbols-outlined text-lg">edit</span>
                                {actionLabel}
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className={`${actionLabel && onAction ? 'flex-1' : 'w-full'} py-3 ${c.buttonBg} text-white font-bold rounded-xl transition-all active:scale-95`}
                        >
                            {actionLabel && onAction ? 'Fechar' : 'Entendi'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FeedbackModal;
