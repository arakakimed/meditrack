-- ============================================================================
-- SCRIPT DE DESBLOQUEIO E CORREÇÃO GERAL 🔓
-- ============================================================================

-- 1. Garantir que a coluna 'gender' exista (evita erros de frontend)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('Male', 'Female'));

-- 2. RESETAR permissões RLS da tabela PROFILES (Segurança básica para funcionar)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
-- Remover policies antigas que possam estar conflitantes
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "insert_own_only" ON public.profiles;
DROP POLICY IF EXISTS "select_all_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "insert_admin_any" ON public.profiles;
DROP POLICY IF EXISTS "update_own_or_staff" ON public.profiles;
DROP POLICY IF EXISTS "delete_admin_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_mixed" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_mixed" ON public.profiles;


-- 2.1 Criar Policies LIMPAS eFUNCIONAIS
-- SELECT: Todo mundo vê tudo (necessário para funcionar o app)
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT USING (true);

-- INSERT: Apenas Admins podem criar novos perfis (e o próprio usuário no signup)
CREATE POLICY "profiles_insert_mixed" ON public.profiles
  FOR INSERT WITH CHECK (
    -- Usuário criando a si mesmo (self-registration)
    auth.uid() = id
    OR
    -- Admin criando outros
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Admin' 
  );

-- UPDATE: TitleCase 'Admin' ou 'Staff'
CREATE POLICY "profiles_update_mixed" ON public.profiles
  FOR UPDATE USING (
    -- O próprio usuário
    auth.uid() = id
    OR
    -- Admin ou Staff editando outros
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('Admin', 'Staff')
  );

-- DELETE: Apenas Admin
CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Admin'
  );

-- 3. RESETAR permissões RLS da tabela PATIENTS (para garantir que carrega)
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patients_select_all" ON public.patients;
DROP POLICY IF EXISTS "patients_all_admin_staff" ON public.patients;

-- Política de leitura para pacientes
CREATE POLICY "patients_select_all" ON public.patients
  FOR SELECT USING (
    -- Admin e Staff veem todos
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('Admin', 'Staff')
    OR
    -- Paciente vê a si mesmo (pelo user_id ou email?)
    user_id = auth.uid()
  );

-- Para simplificar debug temporário, liberar SELECT na tabela patients para authenticated se der erro
-- Descomente a linha abaixo se ainda persistir o "carregando"
-- CREATE POLICY "patients_select_fallback" ON public.patients FOR SELECT USING (true);

-- 4. Função auxiliar atualizada (garantia)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE role_text text;
BEGIN
  SELECT role INTO role_text FROM public.profiles WHERE id = user_id;
  RETURN role_text; -- Já está TitleCase no banco
END;
$$;
