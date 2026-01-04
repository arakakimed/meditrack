-- ============================================================================
-- FIX: Auth RLS Performance - STEP 1: PROFILES TABLE ONLY
-- ============================================================================
-- Execute este script primeiro para testar.
-- Se funcionar, continuamos com as outras tabelas.
-- ============================================================================

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT
  USING (
    (select auth.uid()) = id
    OR
    get_user_role((select auth.uid())) IN ('admin', 'staff')
  );

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE
  USING (
    (select auth.uid()) = id
    OR
    get_user_role((select auth.uid())) = 'admin'
  );

DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
CREATE POLICY "profiles_delete_policy" ON public.profiles
  FOR DELETE
  USING (get_user_role((select auth.uid())) = 'admin');

-- Remover duplicadas
DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios podem ver seu proprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuário edita próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users triggers" ON public.profiles;

-- ============================================================================
-- TESTE: Execute SELECT para confirmar que funciona
-- ============================================================================
-- SELECT * FROM public.profiles LIMIT 1;
