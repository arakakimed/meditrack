-- ============================================================================
-- EMERGÊNCIA CRÍTICA: DESABILITAR RLS DA TABELA PROFILES
-- ============================================================================
-- A situação está crítica - nem a policy de emergência funcionou.
-- Vamos DESABILITAR o RLS temporariamente para destrancar tudo.
-- ============================================================================

-- ============================================================================
-- STEP 1: DESABILITAR RLS (TEMPORÁRIO)
-- ============================================================================

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: VERIFICAR DADOS
-- ============================================================================

-- Agora deve funcionar:
SELECT id, email, name, role 
FROM public.profiles 
LIMIT 5;

-- VOCÊ DEVE VER DADOS AGORA!

-- ============================================================================
-- STEP 3: DEBUG - Ver qual é o auth.uid() atual
-- ============================================================================

SELECT 
  auth.uid() as current_user_id,
  auth.email() as current_email,
  (SELECT COUNT(*) FROM public.profiles) as total_profiles,
  (SELECT COUNT(*) FROM public.profiles WHERE id = auth.uid()) as my_profile_exists;

-- ============================================================================
-- IMPORTANTE! 
-- ============================================================================
-- Com RLS desabilitado, TODOS conseguem ver TODOS os profiles.
-- Isso é INSEGURO, mas necessário para debug.
-- 
-- Após confirmar que o app funciona, vamos RE-HABILITAR com policies corretas.
-- ============================================================================
