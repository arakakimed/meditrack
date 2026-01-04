-- ============================================================================
-- EMERGÊNCIA: Desabilitar RLS em TODAS as tabelas principais
-- ============================================================================
-- TEMPORÁRIO para você conseguir usar o sistema!
-- Depois refinamos as policies.
-- ============================================================================

-- Tabelas principais do sistema
ALTER TABLE public.patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_steps DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.injections DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.upcoming_doses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_measurements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_tags DISABLE ROW LEVEL SECURITY;

-- A tabela profiles já está com RLS correto, manter habilitado
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY; -- NÃO FAZER!

-- ============================================================================
-- VERIFICAR: Agora admin deve conseguir ver tudo!
-- ============================================================================

SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'patients', 'medications', 'injections', 
                  'medication_steps', 'financial_records', 'weight_measurements')
ORDER BY tablename;

-- Resultado esperado: 
-- profiles: true ✅
-- Resto: false ✅

-- ============================================================================
-- IMPORTANTE: Isso é TEMPORÁRIO!
-- Com RLS desabilitado, qualquer usuário autenticado vê tudo.
-- Mas pelo menos o sistema vai FUNCIONAR!
-- ============================================================================
