-- ============================================================================
-- FIX: Function Search Path Mutable - Security Advisor Warnings
-- ============================================================================
-- PROBLEMA: As funções SECURITY DEFINER estão com search_path mutável,
-- o que representa um risco de segurança (SQL Injection via search_path).
--
-- SOLUÇÃO: Fixar o search_path como 'public' para todas as funções 
-- SECURITY DEFINER, garantindo que elas sempre busquem objetos no schema 
-- correto e não sejam vulneráveis a ataques.
--
-- REFERÊNCIA: https://supabase.com/docs/guides/database/postgres/security
-- ============================================================================

-- ============================================================================
-- FUNÇÕES CONFIRMADAS NO PROJETO (4 funções)
-- ============================================================================

-- 1. approve_patient
-- Função que aprova um paciente pendente
ALTER FUNCTION public.approve_patient(patient_id uuid) 
SET search_path = 'public';

-- 2. reject_patient
-- Função que rejeita e remove um paciente pendente
ALTER FUNCTION public.reject_patient(patient_id_param uuid) 
SET search_path = 'public';

-- 3. is_staff_or_admin
-- Função helper que verifica se usuário é staff ou admin (sem argumentos)
ALTER FUNCTION public.is_staff_or_admin() 
SET search_path = 'public';

-- 4. get_user_role
-- Função que retorna a role do usuário
ALTER FUNCTION public.get_user_role(user_id uuid) 
SET search_path = 'public';

-- ============================================================================
-- FUNÇÕES ADICIONAIS ENCONTRADAS NO BANCO (4 funções + 1 overload)
-- ============================================================================

-- 5. create_patient_user - OVERLOAD 1
-- Primeira versão da função (ordem: email, password, patient_id)
ALTER FUNCTION public.create_patient_user(email text, password text, patient_id uuid) 
SET search_path = 'public';

-- 6. create_patient_user - OVERLOAD 2
-- Segunda versão da função (ordem: patient_id, email, password)
ALTER FUNCTION public.create_patient_user(p_patient_id uuid, p_email text, p_password text) 
SET search_path = 'public';

-- 7. handle_patient_access
-- Função que gerencia acesso do paciente (NÃO é trigger, recebe 3 argumentos)
ALTER FUNCTION public.handle_patient_access(p_patient_id uuid, p_email text, p_password text) 
SET search_path = 'public';

-- 8. is_admin
-- Função helper que verifica se usuário é admin (sem argumentos)
ALTER FUNCTION public.is_admin() 
SET search_path = 'public';

-- ============================================================================
-- VERIFICAÇÃO: Execute para confirmar que as funções foram corrigidas
-- ============================================================================
-- SELECT 
--     routine_name,
--     routine_type,
--     security_type,
--     prosrc::text as search_path_config
-- FROM information_schema.routines
-- WHERE routine_schema = 'public'
-- AND routine_name IN (
--     'approve_patient', 
--     'create_patient_user', 
--     'reject_patient', 
--     'is_admin', 
--     'handle_patient_access', 
--     'is_staff_or_admin', 
--     'get_user_role'
-- );

-- ============================================================================
-- NOTA IMPORTANTE:
-- ============================================================================
-- Se alguma função der erro "function does not exist", significa que:
-- 1. A função pode ter sido criada diretamente no Supabase Dashboard
-- 2. Ou a assinatura (argumentos) está diferente do esperado
-- 
-- Para descobrir a assinatura exata, execute no SQL Editor:
-- 
-- SELECT 
--     proname as function_name,
--     pg_get_function_identity_arguments(oid) as arguments
-- FROM pg_proc 
-- WHERE pronamespace = 'public'::regnamespace
-- AND proname IN ('approve_patient', 'reject_patient', 'get_user_role', 
--                  'is_admin', 'is_staff_or_admin', 'handle_patient_access',
--                  'create_patient_user')
-- ORDER BY proname;
-- 
-- Depois ajuste o ALTER FUNCTION com a assinatura correta.
-- ============================================================================

COMMENT ON FUNCTION public.approve_patient(uuid) IS 'Aprova paciente - search_path fixado';
COMMENT ON FUNCTION public.reject_patient(uuid) IS 'Rejeita paciente - search_path fixado';
COMMENT ON FUNCTION public.get_user_role(uuid) IS 'Retorna role do usuário - search_path fixado';
COMMENT ON FUNCTION public.is_staff_or_admin() IS 'Verifica se é staff/admin - search_path fixado';
