-- ============================================================================
-- FIX: Infinite Recursion in Profiles RLS Policies
-- ============================================================================
-- PROBLEMA: A policy da tabela 'profiles' está causando recursão infinita
-- quando tenta verificar se o usuário é admin/staff consultando a própria
-- tabela profiles dentro da policy.
--
-- SOLUÇÃO: Criar uma função SECURITY DEFINER que bypassa o RLS para ler
-- apenas o campo 'role', e usar essa função nas policies.
-- ============================================================================

-- 1. Criar função segura para obter o role do usuário (sem ativar RLS)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER  -- Executa com privilégios do criador (bypass RLS)
STABLE  -- Resultado não muda durante a mesma query
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = user_id;
  
  RETURN user_role;
END;
$$;

-- 2. Remover todas as policies antigas da tabela profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- 3. Criar policies NÃO-RECURSIVAS usando a função segura

-- SELECT: Usuário vê seu próprio perfil OU é Admin/Staff
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id  -- Vê seu próprio perfil
    OR 
    get_user_role(auth.uid()) IN ('admin', 'staff')  -- Ou é Admin/Staff (função segura)
  );

-- INSERT: Apenas durante sign-up (quando não há role ainda definida)
CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- UPDATE: Usuário atualiza seu próprio perfil OU Admin atualiza qualquer perfil
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() = id  -- Atualiza seu próprio perfil
    OR 
    get_user_role(auth.uid()) = 'admin'  -- Ou é Admin
  );

-- DELETE: Apenas Admin pode deletar perfis
CREATE POLICY "profiles_delete_policy" ON public.profiles
  FOR DELETE
  USING (get_user_role(auth.uid()) = 'admin');

-- 4. Garantir que RLS está ativo
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Conceder permissões de execução na função para usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO anon;

-- ============================================================================
-- VERIFICAÇÃO: Execute as queries abaixo para confirmar que está corrigido
-- ============================================================================
-- SELECT * FROM public.profiles;  -- Deve retornar sem erro 500
-- SELECT get_user_role(auth.uid());  -- Deve retornar 'admin', 'staff' ou 'patient'
