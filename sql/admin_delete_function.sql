-- ==============================================================================
-- 2. FUNÇÃO DE EXCLUSÃO SEGURA (RPC)
-- Executa com privilégios de superusuário (SECURITY DEFINER) para limpar dados
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.delete_user_data(target_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Importante: roda com permissões de admin
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- 1. Verifica se quem está chamando é admin (Opcional, mas recomendado)
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem excluir usuários.';
  END IF;

  -- 2. Excluir da tabela Profiles
  DELETE FROM public.profiles WHERE id = target_id OR patient_id = target_id;

  -- 3. Excluir da tabela Patients
  DELETE FROM public.patients WHERE id = target_id OR user_id = target_id;

  result := json_build_object('status', 'success', 'message', 'Dados excluídos com sucesso');
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  result := json_build_object('status', 'error', 'message', SQLERRM);
  RETURN result;
END;
$$;
