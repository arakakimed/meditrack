
import React, { useState } from 'react';

interface RegisterDoseModalProps {
    isOpen: boolean;
    onClose: () => void;
    patientName: string | null | undefined;
}

const InjectionSiteOption: React.FC<{ name: string; icon: string; label: string; defaultChecked?: boolean }> = ({ name, icon, label, defaultChecked }) => (
    <label className="cursor-pointer relative group">
        <input name={name} type="radio" className="peer sr-only" defaultChecked={defaultChecked} />
        <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2636] transition-all hover:border-primary/50 peer-checked:border-primary peer-checked:bg-primary/5 dark:peer-checked:bg-primary/20 peer-checked:text-primary">
            <span className="material-symbols-outlined text-[28px] text-gray-400 group-hover:text-primary/70 peer-checked:text-primary transition-colors">{icon}</span>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300 peer-checked:text-primary dark:peer-checked:text-blue-300">{label}</span>
        </div>
        <div className="absolute top-2 right-2 opacity-0 peer-checked:opacity-100 text-primary transition-opacity">
            <span className="material-symbols-outlined text-[18px] fill-1">check_circle</span>
        </div>
    </label>
);

const RegisterDoseModal: React.FC<RegisterDoseModalProps> = ({ isOpen, onClose, patientName }) => {
    const [dosage, setDosage] = useState('');
    const calculatedUnits = dosage ? (parseFloat(dosage) * 6).toFixed(0) : '0';

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-500/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-display">
            <div className="relative w-full max-w-[640px] flex flex-col bg-background-light dark:bg-background-dark rounded-xl shadow-2xl overflow-hidden max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#152030]">
                    <h2 className="text-gray-900 dark:text-white text-xl font-bold leading-tight tracking-tight">Registrar Dose {patientName && `- ${patientName}`}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-full p-1">
                        <span className="material-symbols-outlined text-[24px]">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-gray-900 dark:text-gray-100 text-sm font-semibold">Medicamento</label>
                        <div className="relative">
                            <select defaultValue="" className="form-select w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1a2636] text-gray-900 dark:text-white h-12 pl-4 pr-10 focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer">
                                <option disabled value="">Selecione o medicamento</option>
                                <option value="tirzepatida">Tirzepatida</option>
                                <option value="insulina-regular">Insulina Regular</option>
                                <option value="insulina-nph">Insulina NPH</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">expand_more</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <div className="flex flex-col gap-2">
                            <label className="text-gray-900 dark:text-gray-100 text-sm font-semibold">Dosagem (mg)</label>
                            <div className="relative">
                                <input 
                                  type="number" 
                                  value={dosage}
                                  onChange={(e) => setDosage(e.target.value)}
                                  placeholder="0.00" 
                                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1a2636] text-gray-900 dark:text-white h-12 pl-4 pr-12 focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-gray-400" 
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">mg</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 h-full">
                            <label className="text-gray-900 dark:text-gray-100 text-sm font-semibold">Conversão Automática</label>
                            <div className="flex-1 flex flex-col justify-center rounded-lg bg-primary/10 dark:bg-primary/20 border border-primary/20 p-4 relative overflow-hidden group h-[72px]">
                                <div className="relative z-10 flex items-baseline justify-between">
                                    <span className="text-primary dark:text-blue-300 text-sm font-medium">Unidades Calculadas</span>
                                    <span className="material-symbols-outlined text-primary/40 dark:text-blue-300/40">calculate</span>
                                </div>
                                <div className="relative z-10 mt-1">
                                    <p className="text-gray-900 dark:text-white text-3xl font-bold tracking-tight">{calculatedUnits} <span className="text-lg text-gray-500 dark:text-gray-400 font-medium">UI</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                        <h3 className="text-gray-900 dark:text-gray-100 text-sm font-semibold">Local de Aplicação</h3>
                        <div className="grid grid-cols-3 gap-3">
                            <InjectionSiteOption name="site" icon="accessibility_new" label="Abdômen" defaultChecked />
                            <InjectionSiteOption name="site" icon="directions_walk" label="Coxa" />
                            <InjectionSiteOption name="site" icon="front_hand" label="Braço" />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-gray-900 dark:text-gray-100 text-sm font-semibold">Observações</label>
                        <textarea className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1a2636] text-gray-900 dark:text-white p-3 h-24 resize-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-gray-400 text-sm" placeholder="Alguma reação adversa, detalhe do paciente ou observação clínica..."></textarea>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-[#152030] border-t border-gray-200 dark:border-gray-800">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
                    <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-primary hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">check</span>
                        Confirmar Aplicação
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RegisterDoseModal;
