import React, { useEffect } from 'react';

interface ConfirmDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    itemName: string;
    isLoading?: boolean;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    itemName,
    isLoading = false
}) => {

    // Debug lifecycle
    useEffect(() => {
        if (isOpen) console.log('ConfirmDeleteModal MOUNTED/OPENED for:', itemName);
    }, [isOpen, itemName]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header Warning */}
                <div className="px-6 py-6 bg-red-50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/20 flex flex-col items-center text-center gap-3">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center flex-shrink-0 animate-bounce">
                        <span className="material-symbols-outlined text-3xl">warning</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Confirmar Exclusão</h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Esta ação é irreversível</p>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6">
                    <div className="text-center mb-8">
                        <p className="text-slate-600 dark:text-slate-300 mb-2">
                            Você está prestes a excluir permanentemente:
                        </p>
                        <div className="inline-block px-4 py-2 bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700">
                            <p className="text-lg font-bold text-slate-900 dark:text-white">{itemName}</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 px-4 py-3.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isLoading}
                            className="flex-1 px-4 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    <span>Excluindo...</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">delete_forever</span>
                                    <span>Excluir</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDeleteModal;
