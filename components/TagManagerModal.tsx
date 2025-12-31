import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Vibrant, aesthetic colors for tags - visible on calendar and cards
export const TAG_COLORS = [
    { name: 'Rose', bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-700', hex: '#f43f5e' },
    { name: 'Pink', bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-700', hex: '#ec4899' },
    { name: 'Purple', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-700', hex: '#a855f7' },
    { name: 'Indigo', bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-700', hex: '#6366f1' },
    { name: 'Blue', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-700', hex: '#3b82f6' },
    { name: 'Sky', bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-700', hex: '#0ea5e9' },
    { name: 'Teal', bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-700', hex: '#14b8a6' },
    { name: 'Emerald', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-700', hex: '#10b981' },
    { name: 'Lime', bg: 'bg-lime-100 dark:bg-lime-900/30', text: 'text-lime-700 dark:text-lime-300', border: 'border-lime-200 dark:border-lime-700', hex: '#84cc16' },
    { name: 'Amber', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-700', hex: '#f59e0b' },
    { name: 'Orange', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-700', hex: '#f97316' },
    { name: 'Slate', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-600', hex: '#64748b' },
];

interface Tag {
    id: string;
    name: string;
    color: string; // We will store the color name (e.g., 'Rose')
}

interface TagManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TagManagerModal: React.FC<TagManagerModalProps> = ({ isOpen, onClose }) => {
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0].name);
    const [editingTag, setEditingTag] = useState<Tag | null>(null);

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchTags();
        }
    }, [isOpen]);

    const fetchTags = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('clinic_tags')
            .select('*')
            .order('name');

        if (data) setTags(data);
        if (error) {
            console.error('Error fetching tags:', error);
            // Don't show error on fetch to avoid annoying empty state alerts if table doesn't exist yet, 
            // but for save/delete we definitely should.
        }
        setLoading(false);
    };

    const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);

    const handleSaveTag = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTagName.trim()) return;
        setError(null);

        const tagData = {
            name: newTagName.trim(),
            color: selectedColor
        };

        try {
            if (editingTag) {
                const { error } = await supabase
                    .from('clinic_tags')
                    .update(tagData)
                    .eq('id', editingTag.id);

                if (error) throw error;

                setEditingTag(null);
                setNewTagName('');
                fetchTags();
            } else {
                const { error } = await supabase
                    .from('clinic_tags')
                    .insert([tagData]);

                if (error) throw error;

                setNewTagName('');
                fetchTags();
            }
        } catch (err: any) {
            console.error('Error saving tag:', err);
            setError('Erro ao salvar: ' + (err.message || 'Verifique a conexão'));
        }
    };

    const handleDeleteTag = (tag: Tag) => {
        setTagToDelete(tag);
        // Reset validation errors when opening confirmation
        setError(null);
    };

    const confirmDelete = async () => {
        if (!tagToDelete) return;

        const { error } = await supabase
            .from('clinic_tags')
            .delete()
            .eq('id', tagToDelete.id);

        if (!error) {
            fetchTags();
            setTagToDelete(null);
        } else {
            setError('Erro ao excluir etiqueta');
            setTagToDelete(null);
        }
    };

    const startEdit = (tag: Tag) => {
        setEditingTag(tag);
        setNewTagName(tag.name);
        setSelectedColor(tag.color);
        setError(null);
    };

    const cancelEdit = () => {
        setEditingTag(null);
        setNewTagName('');
        setSelectedColor(TAG_COLORS[0].name);
        setError(null);
    };

    if (!isOpen) return null;

    const currentColorObj = TAG_COLORS.find(c => c.name === selectedColor) || TAG_COLORS[0];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">label</span>
                        Gerenciar Etiquetas
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6 relative">
                    {/* Delete Confirmation Overlay */}
                    {tagToDelete && (
                        <div className="absolute inset-0 z-10 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-3xl text-red-600 dark:text-red-400">delete</span>
                            </div>
                            <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Excluir Etiqueta?</h4>
                            <p className="text-slate-600 dark:text-slate-300 mb-6">
                                Tem certeza que deseja remover a etiqueta <span className="font-bold text-slate-900 dark:text-white">"{tagToDelete.name}"</span>? Esta ação não pode ser desfeita.
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setTagToDelete(null)}
                                    className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all transform active:scale-95"
                                >
                                    Sim, Excluir
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Create/Edit Form */}
                    <form onSubmit={handleSaveTag} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                {editingTag ? 'Editar Etiqueta' : 'Nova Etiqueta'}
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newTagName}
                                    onChange={(e) => setNewTagName(e.target.value)}
                                    placeholder="Nome da etiqueta..."
                                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/50 outline-none text-slate-900 dark:text-white"
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    disabled={!newTagName.trim()}
                                    className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {editingTag ? 'Salvar' : 'Adicionar'}
                                </button>
                                {editingTag && (
                                    <button
                                        type="button"
                                        onClick={cancelEdit}
                                        className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg font-bold hover:bg-slate-300 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Color Selection */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cor</label>
                            <div className="flex flex-wrap gap-2">
                                {TAG_COLORS.map((color) => (
                                    <button
                                        key={color.name}
                                        type="button"
                                        onClick={() => setSelectedColor(color.name)}
                                        className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${color.bg} ${color.border} ${selectedColor === color.name
                                            ? 'ring-2 ring-offset-2 ring-primary dark:ring-offset-slate-900 scale-110'
                                            : ''
                                            }`}
                                        title={color.name}
                                    />
                                ))}
                            </div>
                            {/* Preview */}
                            <div className="mt-4 flex items-center justify-center">
                                <span className={`px-3 py-1 rounded-full text-sm font-bold border ${currentColorObj.bg} ${currentColorObj.text} ${currentColorObj.border}`}>
                                    {newTagName || 'Prévia da Etiqueta'}
                                </span>
                            </div>
                        </div>
                    </form>

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-sm rounded-lg flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">error</span>
                            {error.includes('relation "clinic_tags" does not exist')
                                ? 'Tabela de etiquetas não encontrada. Execute o script SQL.'
                                : error}
                        </div>
                    )}

                    {/* Tag List */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-base">list</span>
                            Etiquetas Existentes
                        </h4>

                        {loading ? (
                            <div className="text-center py-4 text-slate-500">Carregando...</div>
                        ) : tags.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                <span className="material-symbols-outlined text-3xl mb-1">label_off</span>
                                <p className="text-sm">Nenhuma etiqueta criada</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2">
                                {tags.map((tag) => {
                                    const color = TAG_COLORS.find(c => c.name === tag.color) || TAG_COLORS[0];
                                    return (
                                        <div key={tag.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-xl hover:border-slate-300 transition-colors group">
                                            <span className={`px-3 py-1 rounded-full text-sm font-bold border ${color.bg} ${color.text} ${color.border}`}>
                                                {tag.name}
                                            </span>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => startEdit(tag)}
                                                    className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTag(tag)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                    title="Excluir"
                                                >
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TagManagerModal;
