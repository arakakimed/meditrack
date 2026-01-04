-- ============================================================================
-- FIX: Auth RLS Performance - STEP 3B: FINANCIAL + STEPS + PAYMENTS
-- ============================================================================

-- FINANCIAL_RECORDS TABLE
DROP POLICY IF EXISTS "financial_records_policy" ON public.financial_records;
CREATE POLICY "financial_records_policy" ON public.financial_records
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('Admin', 'Staff')
    )
  );

-- MEDICATION_STEPS TABLE
DROP POLICY IF EXISTS "Admin vê tudo em medication_steps" ON public.medication_steps;
CREATE POLICY "Admin vê tudo em medication_steps" ON public.medication_steps
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('Admin', 'Staff')
    )
  );

DROP POLICY IF EXISTS "Paciente vê suas etapas" ON public.medication_steps;
CREATE POLICY "Paciente vê suas etapas" ON public.medication_steps
  FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM public.patients 
      WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage their own medication steps" ON public.medication_steps;
CREATE POLICY "Users can manage their own medication steps" ON public.medication_steps
  FOR ALL
  USING (
    patient_id IN (
      SELECT id FROM public.patients 
      WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Permitir leitura para Staff e Admin" ON public.medication_steps;
DROP POLICY IF EXISTS "Permitir inserção para Staff e Admin" ON public.medication_steps;
DROP POLICY IF EXISTS "Permitir atualização para Staff e Admin" ON public.medication_steps;
DROP POLICY IF EXISTS "Permitir exclusão para Staff e Admin" ON public.medication_steps;

-- STEP_PAYMENTS TABLE  
DROP POLICY IF EXISTS "Users can manage their own step payments" ON public.step_payments;
CREATE POLICY "Users can manage their own step payments" ON public.step_payments
  FOR ALL
  USING (
    step_id IN (
      SELECT ms.id FROM public.medication_steps ms
      JOIN public.patients p ON p.id = ms.patient_id
      WHERE p.user_id = (select auth.uid())
    )
  );
