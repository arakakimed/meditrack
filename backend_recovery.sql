
-- 1. CORREÇÃO DE VÍNCULO (AUTO-HEALING VIA SQL)
-- Este comando vincula usuários do Supabase Auth (auth.users) 
-- aos registros na tabela patients (public.patients) pelo E-MAIL.
UPDATE public.patients p
SET user_id = u.id
FROM auth.users u
WHERE lower(p.email) = lower(u.email)
  AND p.user_id IS NULL;

-- 2. CORREÇÃO DE RLS (Permitir que usuários leiam seu próprio email para auto-vínculo)
-- Se precisar que o auto-vínculo via App funcione no futuro:
DROP POLICY IF EXISTS "Enable read access for own email" ON public.patients;
CREATE POLICY "Enable read access for own email" ON public.patients
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL 
        AND (
            lower(email) = lower(auth.jwt() ->> 'email')
            OR user_id = auth.uid()
        )
    );
