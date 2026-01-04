-- ============================================================================
-- DIAGNÓSTICO: Verificar duplicidade de usuário
-- ============================================================================

-- 1. Buscar TODOS os registros com esse email
SELECT 
  id,
  email,
  name,
  role,
  created_at
FROM public.profiles
WHERE email = 'arakaki.med@gmail.com'
ORDER BY created_at DESC;

-- ESPERADO: Apenas 1 linha!
-- Se houver mais de 1 = DUPLICIDADE!

-- ============================================================================
-- 2. Se houver duplicidade, deletar os registros antigos (Staff)
-- ============================================================================

-- DESCOMENTE APENAS SE HOUVER DUPLICIDADE:
-- DELETE FROM public.profiles
-- WHERE email = 'arakaki.med@gmail.com'
-- AND role = 'Staff';

-- ============================================================================
-- 3. Verificar qual ID está na sessão JWT
-- ============================================================================

-- No console do navegador (F12), execute:
-- const { data } = await supabase.auth.getUser();
-- console.log('User ID:', data.user.id);

-- Compare com o ID da query acima!
-- Se forem diferentes = problema de sessão JWT!
-- ============================================================================
