import { createClient } from '@supabase/supabase-js';

// O Vite exige que usemos import.meta.env para ler variáveis
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltam as variáveis de ambiente VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY no arquivo .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true, // Garante que o login fique salvo (LocalStorage)
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

// TEMPORÁRIO: Expor no window para debug
if (typeof window !== 'undefined') {
    (window as any).supabase = supabase;
}