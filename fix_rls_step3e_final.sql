-- ============================================================================
-- FIX: Auth RLS Performance - STEP 3E: CLINIC_TAGS (FINAL)
-- ============================================================================

DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clinic_tags;
CREATE POLICY "Enable all for authenticated users" ON public.clinic_tags
  FOR ALL
  TO authenticated
  USING (true);

-- Remover políticas duplicadas
DROP POLICY IF EXISTS "Acesso total a tags" ON public.clinic_tags;
DROP POLICY IF EXISTS "Leitura de tags para Staff e Admin" ON public.clinic_tags;

-- ============================================================================
-- CONCLUÍDO! 🎉
-- ============================================================================
-- TODAS as 10 tabelas foram otimizadas:
--
-- ✅ STEP 1: profiles (9 policies)
-- ✅ STEP 2: patients (10 policies)
-- ✅ STEP 3A: medications, upcoming_doses, injections (7 policies)
-- ✅ STEP 3B: financial_records, medication_steps, step_payments (5 policies)
-- ✅ STEP 3D: weight_measurements (5 policies)
-- ✅ STEP 3E: clinic_tags (1 policy)
--
-- TOTAL: 37+ policies otimizadas!
-- ============================================================================
