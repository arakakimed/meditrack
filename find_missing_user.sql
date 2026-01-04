-- ============================================================================
-- DIAGNÓSTICO: Buscar usuário desaparecido
-- ============================================================================

SELECT * 
FROM public.profiles
WHERE email = 'nanizox@gmail.com';

-- Verificar todos os usuários para ver se há algum filtro oculto
SELECT id, email, name, role, created_at
FROM public.profiles
ORDER BY created_at DESC;

-- Confirmar policy atual na tabela profiles
SELECT * FROM pg_policies WHERE tablename = 'profiles';
