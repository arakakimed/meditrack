import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface Message {
    id: string;
    sender_id: string;
    receiver_id: string;
    message: string;
    created_at: string;
    is_from_clinic: boolean;
}

interface ChatPatient {
    id: string;
    name: string;
    avatar_url?: string;
    last_message?: string;
    last_message_time?: string;
    unread_count?: number;
}

const getLocalMessages = (patientId: string): Message[] => {
    try {
        const stored = localStorage.getItem(`chat_messages_${patientId}`);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const saveLocalMessage = (patientId: string, message: Message) => {
    try {
        const existing = getLocalMessages(patientId);
        localStorage.setItem(`chat_messages_${patientId}`, JSON.stringify([...existing, message]));
    } catch (e) {
        console.error('Error saving local message', e);
    }
};

interface MessagingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const MessagingModal: React.FC<MessagingModalProps> = ({ isOpen, onClose }) => {
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [patients, setPatients] = useState<ChatPatient[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch patients with conversations
    useEffect(() => {
        if (isOpen) {
            fetchConversations();
        }
    }, [isOpen]);

    // Fetch messages when patient selected
    useEffect(() => {
        if (selectedPatientId) {
            fetchMessages(selectedPatientId);
            // Mark as read logic here
        }
    }, [selectedPatientId]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const fetchConversations = async () => {
        // This is a simplified fetch. In a real app with many messages, 
        // you'd want a dedicated 'conversations' view or table.
        // For now, let's fetch patients and maybe mock the last message part 
        // or try to fetch it if table exists.

        const { data: patientsData, error } = await supabase
            .from('patients')
            .select('id, name, avatar_url')
            .order('name'); // Ideally order by last message time

        if (patientsData) {
            // Transform to ChatPatient
            const chatPatients = patientsData.map(p => ({
                id: p.id,
                name: p.name,
                avatar_url: p.avatar_url,
                last_message: 'Iniciar conversa',
                last_message_time: '',
                unread_count: 0
            }));
            setPatients(chatPatients);
        }
    };

    const fetchMessages = async (patientId: string) => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: true });

        const localMsgs = getLocalMessages(patientId);

        // Combine and sort
        const allMessages = [...(data || []), ...localMsgs].sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        setMessages(allMessages);
        setIsLoading(false);
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedPatientId) return;

        const msgContent = newMessage.trim();
        setNewMessage('');

        // Optimistic update
        const tempMsg: Message = {
            id: 'temp-' + Date.now(),
            sender_id: 'clinic', // TODO: Get actual user ID
            receiver_id: selectedPatientId,
            message: msgContent,
            created_at: new Date().toISOString(),
            is_from_clinic: true
        };
        setMessages(prev => [...prev, tempMsg]);
        saveLocalMessage(selectedPatientId, tempMsg);

        const { error } = await supabase
            .from('messages')
            .insert({
                patient_id: selectedPatientId,
                sender_id: 'clinic',
                receiver_id: selectedPatientId,
                message: msgContent,
                is_from_clinic: true
            });

        if (error) {
            console.error('Error sending message:', error);
            // Revert optimistic update ideally
        } else {
            // Refresh to get real ID
            fetchMessages(selectedPatientId);
        }
    };

    if (!isOpen) return null;

    const selectedPatient = patients.find(p => p.id === selectedPatientId);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-5xl h-[80vh] rounded-2xl shadow-2xl flex overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">

                {/* Sidebar - Patient List */}
                <div className={`w-full md:w-80 bg-slate-50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-800 flex flex-col ${selectedPatientId ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <h2 className="font-bold text-lg text-slate-800 dark:text-white">Mensagens</h2>
                        <button onClick={onClose} className="md:hidden p-2 text-slate-500">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div className="p-3">
                        <input className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Buscar conversa..." />
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {patients.map(patient => (
                            <div
                                key={patient.id}
                                onClick={() => setSelectedPatientId(patient.id)}
                                className={`p-3 mx-2 rounded-xl cursor-pointer transition-colors flex items-center gap-3 ${selectedPatientId === patient.id ? 'bg-white dark:bg-slate-800 shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                    {patient.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{patient.name}</p>
                                        {patient.last_message_time && <span className="text-[10px] text-slate-400">{patient.last_message_time}</span>}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{patient.last_message || 'Clique para iniciar'}</p>
                                </div>
                                {patient.unread_count ? (
                                    <div className="w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold">
                                        {patient.unread_count}
                                    </div>
                                ) : null}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className={`flex-1 flex flex-col bg-white dark:bg-slate-900 ${!selectedPatientId ? 'hidden md:flex' : 'flex'}`}>
                    {selectedPatientId ? (
                        <>
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                                <button onClick={() => setSelectedPatientId(null)} className="md:hidden p-2 -ml-2 text-slate-500">
                                    <span className="material-symbols-outlined">arrow_back</span>
                                </button>
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                    {selectedPatient?.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">{selectedPatient?.name}</h3>
                                    <p className="text-xs text-slate-500 dark:text-green-500 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                        Online
                                    </p>
                                </div>
                                <div className="ml-auto flex gap-2">
                                    <button className="p-2 text-slate-400 hover:text-primary rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                        <span className="material-symbols-outlined">videocam</span>
                                    </button>
                                    <button className="p-2 text-slate-400 hover:text-primary rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                        <span className="material-symbols-outlined">phone</span>
                                    </button>
                                    <button onClick={onClose} className="hidden md:block p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-slate-800 transition-colors">
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
                                {messages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                        <span className="material-symbols-outlined text-4xl mb-2">chat</span>
                                        <p>Nenhuma mensagem ainda.</p>
                                        <p className="text-sm">Envie a primeira mensagem para começar!</p>
                                    </div>
                                )}
                                {messages.map((msg, idx) => {
                                    const isMe = msg.is_from_clinic;
                                    return (
                                        <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] rounded-2xl p-3 ${isMe
                                                ? 'bg-primary text-white rounded-br-none'
                                                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-bl-none'
                                                }`}>
                                                <p className="text-sm">{msg.message}</p>
                                                <div className={`text-[10px] mt-1 flex items-center gap-1 ${isMe ? 'text-primary-100 justify-end' : 'text-slate-400'}`}>
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    {isMe && <span className="material-symbols-outlined text-[10px]">done_all</span>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                                <div className="flex items-end gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl">
                                    <button className="p-2 text-slate-400 hover:text-primary transition-colors">
                                        <span className="material-symbols-outlined">attach_file</span>
                                    </button>
                                    <textarea
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                        className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400"
                                        placeholder="Digite sua mensagem..."
                                        rows={1}
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={!newMessage.trim()}
                                        className="p-2 bg-primary text-white rounded-xl shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                                    >
                                        <span className="material-symbols-outlined">send</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                            <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                                <span className="material-symbols-outlined text-5xl text-slate-300">forum</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Mensagens da Clínica</h3>
                            <p className="max-w-md">Selecione um paciente à esquerda para visualizar o histórico de conversas ou iniciar um novo atendimento.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MessagingModal;
