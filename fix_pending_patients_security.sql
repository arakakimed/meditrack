-- ============================================================================
-- FIX: Security Definer Issue on View 'pending_patients'
-- ============================================================================
-- PROBLEMA: A view 'public.pending_patients' está configurada como 
-- SECURITY DEFINER, o que ignora as políticas RLS e representa um risco 
-- de segurança, permitindo acesso irrestrito dependendo de quem criou a view.
--
-- SOLUÇÃO: Alterar para SECURITY INVOKER para que a view respeite as 
-- permissões RLS do usuário logado (Admin, Staff, Patient).
--
-- GARANTIA: Este comando NÃO altera a estrutura da view, NÃO remove dados,
-- e NÃO afeta tabelas. Apenas muda a propriedade de segurança.
-- ============================================================================

-- 1. Alterar a view para SECURITY INVOKER (respeita RLS do usuário logado)
ALTER VIEW public.pending_patients SET (security_invoker = true);

-- 2. Verificar a alteração (Execute após aplicar)
-- Esta query mostra a definição atual da view e suas propriedades
-- SELECT 
--     viewname, 
--     viewowner,
--     definition
-- FROM pg_views 
-- WHERE schemaname = 'public' 
-- AND viewname = 'pending_patients';

-- ============================================================================
-- EXPLICAÇÃO TÉCNICA:
-- ============================================================================
-- ANTES (SECURITY DEFINER): 
--   - A view executava com as permissões do CRIADOR da view
--   - Ignorava completamente as policies RLS
--   - Qualquer usuário autenticado poderia ver TODOS os dados
--   - RISCO DE SEGURANÇA CRÍTICO!
--
-- DEPOIS (SECURITY INVOKER):
--   - A view executa com as permissões do USUÁRIO LOGADO
--   - Respeita todas as políticas RLS configuradas
--   - Admin vê todos os pacientes pendentes
--   - Staff vê apenas o que as policies permitem
--   - Patient vê apenas seus próprios dados
--   - SEGURO E CONFORME ESPERADO!
-- ============================================================================

-- ============================================================================
-- TESTE DE CONFORMIDADE (Execute após aplicar)
-- ============================================================================
-- Como Admin:
-- SELECT * FROM public.pending_patients;  
-- → Deve retornar todos os pacientes pendentes

-- Como Staff:
-- SELECT * FROM public.pending_patients;  
-- → Deve retornar apenas pacientes permitidos pelas policies

-- Como Patient:
-- SELECT * FROM public.pending_patients;  
-- → Deve retornar vazio ou apenas o próprio registro (se aplicável)
-- ============================================================================

COMMENT ON VIEW public.pending_patients IS 'View de pacientes pendentes - SECURITY INVOKER (respeita RLS)';
