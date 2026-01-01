/**
 * Função utilitária unificada para liberar acesso de paciente
 * Usa a RPC do Supabase para criar usuário já confirmado
 */
import { supabase } from './supabase';

export interface GrantAccessResult {
    success: boolean;
    email?: string;
    userId?: string;
    error?: string;
}

export async function grantPatientAccess(
    patientId: string,
    email: string,
    password: string = 'Mudar@123'
): Promise<GrantAccessResult> {
    try {
        // Normalizar email
        const normalizedEmail = email.toLowerCase().trim();

        if (!normalizedEmail || !patientId) {
            return { success: false, error: 'Email e ID do paciente são obrigatórios' };
        }

        // Chamar a RPC que cria usuário já confirmado
        const { data, error } = await supabase.rpc('create_patient_user', {
            p_patient_id: patientId,
            p_email: normalizedEmail,
            p_password: password
        });

        if (error) {
            console.error('Erro na RPC create_patient_user:', error);
            return { success: false, error: error.message };
        }

        if (data && !data.success) {
            return { success: false, error: data.error || 'Erro desconhecido' };
        }

        return {
            success: true,
            email: normalizedEmail,
            userId: data?.user_id
        };

    } catch (err: any) {
        console.error('Erro ao liberar acesso:', err);
        return { success: false, error: err.message || 'Erro ao liberar acesso' };
    }
}

/**
 * Gera mensagem de boas-vindas para WhatsApp
 */
export function generateWelcomeMessage(patientName: string, email: string, password: string = 'Mudar@123'): string {
    return `Olá ${patientName}! 🎉

Seu acesso ao app MediTrack foi liberado!

📧 Login: ${email}
🔐 Senha: ${password}

Baixe o app e acompanhe seu tratamento!`;
}
