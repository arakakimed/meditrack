-- ============================================================================
-- DIAGNÓSTICO COMPLETO: Por que Staff ainda está bloqueado?
-- ============================================================================

-- ============================================================================
-- TESTE 1: RLS está habilitado ou desabilitado?
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'profiles';

-- Resultado esperado: rls_enabled = true

-- ============================================================================
-- TESTE 2: Quais policies existem agora?
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Deve mostrar as 4 policies novas: profiles_select_all, etc.

-- ============================================================================
-- TESTE 3: Você está autenticado?
-- ============================================================================

SELECT 
  auth.uid() as my_user_id,
  auth.email() as my_email,
  auth.role() as my_auth_role,
  CASE 
    WHEN auth.uid() IS NULL THEN '❌ NÃO AUTENTICADO!'
    ELSE '✅ Autenticado'
  END as status;

-- Se auth.uid() for NULL = problema de autenticação!

-- ============================================================================
-- TESTE 4: Consegue ver seu próprio profile?
-- ============================================================================

SELECT 
  id,
  email,
  name,
  role
FROM public.profiles
WHERE id = auth.uid();

-- Se retornar VAZIO = RLS bloqueando!
-- Se retornar DADOS = RLS OK!

-- ============================================================================
-- TESTE 5: Consegue ver TODOS os profiles?
-- ============================================================================

SELECT 
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN role = 'Admin' THEN 1 END) as admins,
  COUNT(CASE WHEN role = 'Staff' THEN 1 END) as staff,
  COUNT(CASE WHEN role = 'Patient' THEN 1 END) as patients
FROM public.profiles;

-- Se COUNT = 0 = RLS bloqueando tudo!
-- Se COUNT > 0 = RLS permitindo!

-- ============================================================================
-- TESTE 6: Testar policy manualmente
-- ============================================================================

-- Simular a policy de SELECT:
SELECT 
  p.id,
  p.email,
  p.name,
  p.role,
  CASE 
    WHEN true THEN '✅ Policy USING (true) deveria permitir'
    ELSE '❌ Bloqueado'
  END as policy_test
FROM public.profiles p
LIMIT 5;

-- ============================================================================
-- TESTE 7: Verificar se há policies ANTIGAS bloqueando
-- ============================================================================

SELECT 
  COUNT(*) as total_policies
FROM pg_policies 
WHERE tablename = 'profiles';

-- Deve ser exatamente 4!
-- Se for > 4 = tem lixo de policies antigas!

-- ============================================================================
-- RESULTADOS
-- ============================================================================
-- Execute TODOS os testes acima e me envie os resultados.
-- Especialmente TESTE 3 e TESTE 4!
-- ============================================================================
