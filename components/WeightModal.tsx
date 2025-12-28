import React, { useState } from 'react';

interface WeightModalProps {
    isOpen: boolean;
    onClose: () => void;
    patient: any;
    onSave: (weight: number, date: string) => void;
}

const WeightModal: React.FC<WeightModalProps> = ({ isOpen, onClose, patient, onSave }) => {
    const [weight, setWeight] = useState(patient?.current_weight?.toString() || '');
    const [weightDate, setWeightDate] = useState(new Date().toISOString().split('T')[0]);

    if (!isOpen || !patient) return null;

    const initialWeight = patient.initial_weight;
    const targetWeight = patient.target_weight;
    const currentWeight = parseFloat(weight) || patient.current_weight;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(parseFloat(weight), weightDate);
    };

    // Weight Progress Visual Component
    const WeightProgressCard = ({ initial, current, target }: { initial: number, current: number, target: number }) => {
        const totalToLose = initial - target;
        const lostSoFar = initial - current;
        const percentage = Math.min(Math.max((lostSoFar / totalToLose) * 100, 0), 100);
        const remaining = Math.max(current - target, 0);

        const milestones = [5, 10, 15, 20, 25, 30];
        const achievedMilestones = milestones.filter(m => lostSoFar >= m);

        return (
            <div className="p-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20 rounded-2xl border-2 border-blue-300 dark:border-blue-700 shadow-lg">
                {/* Header */}
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">🎯</span>
                    <h4 className="font-bold text-lg text-slate-800 dark:text-white">Sua Jornada de Emagrecimento</h4>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="text-center p-3 bg-white/60 dark:bg-slate-800/60 rounded-xl backdrop-blur-sm">
                        <span className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Início</span>
                        <div className="text-xl font-bold text-slate-800 dark:text-white">{initial}kg</div>
                    </div>
                    <div className="text-center p-3 bg-white/80 dark:bg-slate-800/80 rounded-xl backdrop-blur-sm border-2 border-blue-400 dark:border-blue-500">
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold block mb-1">Atual</span>
                        <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{current}kg</div>
                    </div>
                    <div className="text-center p-3 bg-white/60 dark:bg-slate-800/60 rounded-xl backdrop-blur-sm">
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 block mb-1">Meta</span>
                        <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{target}kg</div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-5">
                    <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden relative shadow-inner">
                        <div
                            className="h-full bg-gradient-to-r from-red-400 via-yellow-400 to-emerald-500 transition-all duration-700 ease-out relative"
                            style={{ width: `${percentage}%` }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm font-black text-slate-700 dark:text-white drop-shadow-lg">
                                {percentage.toFixed(0)}% concluído
                            </span>
                        </div>
                    </div>
                </div>

                {/* Lost/Remaining */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-emerald-100 dark:bg-emerald-900/30 p-4 rounded-xl border-2 border-emerald-300 dark:border-emerald-700">
                        <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mb-1">🎉 Perdidos</div>
                        <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">-{lostSoFar.toFixed(1)}kg</div>
                    </div>
                    <div className="bg-orange-100 dark:bg-orange-900/30 p-4 rounded-xl border-2 border-orange-300 dark:border-orange-700">
                        <div className="text-xs text-orange-700 dark:text-orange-400 font-semibold mb-1">🎯 Faltam</div>
                        <div className="text-2xl font-black text-orange-700 dark:text-orange-300">-{remaining.toFixed(1)}kg</div>
                    </div>
                </div>

                {/* Milestones */}
                <div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <span>🏆</span>
                        <span>Marcos Conquistados</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {milestones.map(m => (
                            <div
                                key={m}
                                className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${achievedMilestones.includes(m)
                                    ? 'bg-gradient-to-br from-emerald-400 to-green-500 text-white border-2 border-emerald-300 shadow-md scale-105'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border-2 border-slate-300 dark:border-slate-600'
                                    }`}
                            >
                                {achievedMilestones.includes(m) ? '✓' : '○'} -{m}kg
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <span className="material-symbols-outlined">scale</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Atualizar Peso</h3>
                            <p className="text-xs text-slate-500">Registre seu progresso</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {/* Date Field */}
                    <div className="p-5 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl border-2 border-slate-300 dark:border-slate-700">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                            <span className="material-symbols-outlined text-blue-600">calendar_today</span>
                            Data do Registro de Peso
                        </label>
                        <input
                            type="date"
                            value={weightDate}
                            onChange={(e) => setWeightDate(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all text-slate-900 dark:text-white font-semibold text-center"
                        />
                    </div>

                    {/* Progress Card */}
                    {initialWeight && targetWeight && (
                        <WeightProgressCard
                            initial={initialWeight}
                            current={parseFloat(weight) || 0}
                            target={targetWeight}
                        />
                    )}

                    {/* Hero Weight Input */}
                    <div className="p-6 bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 rounded-2xl border-4 border-blue-400 dark:border-blue-500 shadow-2xl shadow-blue-500/30 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent"></div>
                        <div className="relative z-10">
                            <label className="flex items-center justify-center gap-2 text-sm font-bold text-white/90 mb-3">
                                <span className="material-symbols-outlined text-2xl">scale</span>
                                PESO ATUAL (Nova Medição)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                required
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                                className="w-full text-5xl md:text-6xl font-black text-center text-white bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-2xl p-4 focus:ring-4 focus:ring-white/40 focus:border-white/50 outline-none transition-all placeholder-white/50"
                                placeholder="00.0"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 bg-primary hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <span>Salvar Peso</span>
                            <span className="material-symbols-outlined">check</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default WeightModal;
