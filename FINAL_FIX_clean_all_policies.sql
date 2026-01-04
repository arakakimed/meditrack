-- ============================================================================
-- LIMPEZA FORÇADA DE TODAS AS POLICIES DA TABELA PROFILES
-- ============================================================================
-- PROBLEMA: 10 policies antigas quebrando tudo!
-- SOLUÇÃO: APAGAR TODAS e recriar apenas as corretas.
-- ============================================================================

-- ============================================================================
-- STEP 1: DESABILITAR RLS temporariamente para não travar
-- ============================================================================

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: APAGAR TODAS AS POLICIES (todas as 10!)
-- ============================================================================

DROP POLICY IF EXISTS "Admins podem gerenciar todos os perfis" ON public.profiles;
DROP POLICY IF EXISTS "Allow all authenticated to select profiles" ON public.profiles;
DROP POLICY IF EXISTS "Insert liberado" ON public.profiles;
DROP POLICY IF EXISTS "Leitura Pública de Perfis" ON public.profiles;
DROP POLICY IF EXISTS "Leitura de perfis" ON public.profiles;
DROP POLICY IF EXISTS "Leitura de perfis para Staff e Admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON public.profiles;

-- Tentar outras possíveis
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
DROP POLICY IF EXISTS "emergency_self_select" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios podem ver seu proprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuário edita próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users triggers" ON public.profiles;
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;

-- ============================================================================
-- STEP 3: VERIFICAR que todas foram removidas
-- ============================================================================

-- Deve retornar 0!
SELECT COUNT(*) as policies_restantes
FROM pg_policies 
WHERE tablename = 'profiles';

-- Se ainda tiver > 0, me avise quais sobraram!

-- ============================================================================
-- STEP 4: Criar APENAS 4 policies SIMPLES e FUNCIONAIS
-- ============================================================================

-- Remover as novas policies se já existirem (execução repetida)
DROP POLICY IF EXISTS "select_all_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "insert_own_only" ON public.profiles;
DROP POLICY IF EXISTS "update_own_or_staff" ON public.profiles;
DROP POLICY IF EXISTS "delete_admin_only" ON public.profiles;

-- SELECT: Todo autenticado vê todos
CREATE POLICY "select_all_authenticated"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Apenas próprio ID
CREATE POLICY "insert_own_only"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- UPDATE: Próprio perfil OU Admin/Staff
CREATE POLICY "update_own_or_staff"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('Admin', 'Staff')
    )
  );

-- DELETE: Apenas Admin
CREATE POLICY "delete_admin_only"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'Admin'
    )
  );

-- ============================================================================
-- STEP 5: RE-HABILITAR RLS
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 6: VERIFICAÇÃO FINAL
-- ============================================================================

-- Deve mostrar exatamente 4 policies!
SELECT 
  policyname,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- ============================================================================
-- TESTE FINAL: Você deve ver dados agora!
-- ============================================================================

SELECT 
  id,
  email,
  name,
  role
FROM public.profiles
WHERE id = auth.uid();

-- ============================================================================
-- CONCLUÍDO! ✅
-- ============================================================================
-- Todas as policies antigas REMOVIDAS
-- 4 policies novas CRIADAS
-- RLS RE-HABILITADO
-- ============================================================================
