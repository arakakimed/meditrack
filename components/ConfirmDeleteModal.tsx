import React from 'react';

interface ConfirmDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    itemName: string;
    loading?: boolean;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    itemName,
    loading = false
}) => {
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
                style={{
                    backgroundColor: 'white',
                    borderRadius: '1rem',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    width: '100%',
                    maxWidth: '28rem',
                    overflow: 'hidden'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header com ícone de aviso */}
                <div className="px-6 py-5 bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-100">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-2xl">warning</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Confirmar Exclusão</h2>
                            <p className="text-sm text-slate-600">Esta ação não pode ser desfeita</p>
                        </div>
                    </div>
                </div>

                {/* Corpo do modal */}
                <div className="p-6">
                    <div className="mb-6">
                        <p className="text-slate-700 leading-relaxed mb-3">
                            Você está prestes a excluir permanentemente:
                        </p>
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm font-semibold text-red-900">{itemName}</p>
                        </div>
                    </div>

                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-6">
                        <div className="flex items-start gap-2">
                            <span className="material-symbols-outlined text-amber-600 text-lg flex-shrink-0 mt-0.5">info</span>
                            <p className="text-sm text-amber-800">
                                <strong>Atenção:</strong> Esta ação é permanente e não poderá ser revertida. Todos os dados relacionados serão removidos.
                            </p>
                        </div>
                    </div>

                    {/* Botões */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-4 py-3 border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={loading}
                            className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Excluindo...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-lg">delete_forever</span>
                                    Excluir Permanentemente
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
