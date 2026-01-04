-- ============================================================================
-- FIX: Corrigir role do Super Admin
-- ============================================================================

UPDATE public.profiles
SET role = 'Admin'
WHERE email = 'arakaki.med@gmail.com';

-- Verificar correção
SELECT id, email, name, role
FROM public.profiles
WHERE email = 'arakaki.med@gmail.com';

-- Resultado esperado:
-- role = 'Admin' ✅
