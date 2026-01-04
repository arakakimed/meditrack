-- ============================================================================
-- FIX: RLS Case Sensitivity Bug - Staff Users Blocked
-- ============================================================================
-- PROBLEMA: O código salva 'staff', 'admin' (lowercase) mas as policies
-- procuram 'Staff', 'Admin' (TitleCase), bloqueando acesso de Staff.
--
-- SOLUÇÃO: 
-- 1. Remover constraints antigas
-- 2. Normalizar todos os roles no banco para TitleCase
-- 3. Adicionar constraint correta
-- ============================================================================

-- ============================================================================
-- STEP 1: Remover constraints antigas que impedem UPDATE
-- ============================================================================

-- Remove TODAS as constraints de role (antigas e novas)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS valid_role_check;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS check_role_values;

-- ============================================================================
-- STEP 2: Normalizar Roles para TitleCase no Banco
-- ============================================================================

UPDATE public.profiles
SET role = CASE
  WHEN LOWER(role) = 'admin' THEN 'Admin'
  WHEN LOWER(role) = 'staff' THEN 'Staff'
  WHEN LOWER(role) = 'patient' THEN 'Patient'
  ELSE role  -- Mantém outros valores inalterados
END
WHERE role IS NOT NULL;

-- Confirmar alterações
-- SELECT id, name, email, role FROM public.profiles ORDER BY role, name;

-- ============================================================================
-- STEP 3: Atualizar get_user_role para retornar TitleCase
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = user_id;
  
  -- Normalizar para TitleCase
  RETURN CASE
    WHEN LOWER(user_role) = 'admin' THEN 'Admin'
    WHEN LOWER(user_role) = 'staff' THEN 'Staff'
    WHEN LOWER(user_role) = 'patient' THEN 'Patient'
    ELSE user_role
  END;
END;
$$;

-- ============================================================================
-- STEP 4: Adicionar CHECK constraint para garantir TitleCase
-- ============================================================================

-- Adiciona constraint que aceita APENAS TitleCase correto
ALTER TABLE public.profiles
  ADD CONSTRAINT valid_role_check 
  CHECK (role IN ('Admin', 'Staff', 'Patient'));

-- ============================================================================
-- CONCLUÍDO! ✅
-- ============================================================================
-- Agora:
-- ✅ Constraints antigas removidas
-- ✅ Todos os roles estão em TitleCase ('Admin', 'Staff', 'Patient')
-- ✅ A função get_user_role retorna TitleCase
-- ✅ CHECK constraint garante apenas TitleCase válidos
-- ✅ As políticas RLS vão funcionar corretamente
--
-- PRÓXIMO PASSO: Recarregue a página e teste o login como Staff!
-- ============================================================================
