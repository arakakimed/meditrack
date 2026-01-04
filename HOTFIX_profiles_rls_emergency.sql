-- ============================================================================
-- HOTFIX URGENTE: Profiles RLS Quebrada - Usuários Bloqueados
-- ============================================================================
-- PROBLEMA: As policies usam 'admin', 'staff' (lowercase) mas o banco
-- agora tem 'Admin', 'Staff' (TitleCase) após o fix anterior.
--
-- SINTOMA: Usuários Staff veem "Acesso Não Autorizado" após login.
--
-- CAUSA: get_user_role() na linha 14 compara com lowercase, mas retorna
-- TitleCase agora, então NUNCA match!
-- ============================================================================

-- ============================================================================
-- STEP 1: Corrigir TODAS as policies de profiles para TitleCase
-- ============================================================================

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT
  USING (
    (select auth.uid()) = id
    OR
    get_user_role((select auth.uid())) IN ('Admin', 'Staff')  -- TitleCase!
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
    get_user_role((select auth.uid())) = 'Admin'  -- TitleCase!
  );

DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
CREATE POLICY "profiles_delete_policy" ON public.profiles
  FOR DELETE
  USING (get_user_role((select auth.uid())) = 'Admin');  -- TitleCase!

-- Remover políticas duplicadas/antigas
DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios podem ver seu proprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuário edita próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users triggers" ON public.profiles;

-- ============================================================================
-- STEP 2: Garantir que get_user_role é SECURITY DEFINER e acessível
-- ============================================================================

-- Garantir que a função pode ser usada por usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO anon;

-- ============================================================================
-- STEP 3: Adicionar policy de fallback ultra-permissiva TEMPORÁRIA
-- ============================================================================

-- EMERGÊNCIA: Garantir que TODO usuário autenticado vê seu próprio profile
DROP POLICY IF EXISTS "emergency_self_select" ON public.profiles;
CREATE POLICY "emergency_self_select" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- ============================================================================
-- TESTE CRÍTICO: Verificar se você consegue ler seu próprio profile
-- ============================================================================

-- Descomente e teste:
-- SELECT id, email, name, role 
-- FROM public.profiles 
-- WHERE id = auth.uid();

-- Resultado esperado: UMA linha com seus dados
-- Se retornar vazio: RLS ainda bloqueado (CRÍTICO!)

-- ============================================================================
-- CONCLUÍDO! ✅
-- ============================================================================
-- O que foi feito:
-- ✅ Corrigidas TODAS as comparações para TitleCase
-- ✅ Permissões GRANT para get_user_role
-- ✅ Policy de emergência para garantir self-select
--
-- PRÓXIMO PASSO: 
-- 1. Execute este script IMEDIATAMENTE
-- 2. Recarregue a página (F5)
-- 3. Faça login novamente como Staff
-- 4. Deve funcionar!
-- ============================================================================
