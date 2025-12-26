import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ermgwkdddilrisvycrne.supabase.co';
const supabaseAnonKey = 'sb_publishable_YwXkmt-TmFr6nlIbpSFecg_BGyvUoQH';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
