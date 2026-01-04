-- ============================================================================
-- FIX: Auth RLS Performance - STEP 3D: WEIGHT_MEASUREMENTS
-- ============================================================================

DROP POLICY IF EXISTS "Allow Admin and Staff Full Access" ON public.weight_measurements;
CREATE POLICY "Allow Admin and Staff Full Access" ON public.weight_measurements
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('Admin', 'Staff')
    )
  );

DROP POLICY IF EXISTS "Allow Patients Manage Own Data" ON public.weight_measurements;
CREATE POLICY "Allow Patients Manage Own Data" ON public.weight_measurements
  FOR ALL
  USING (
    patient_id::uuid IN (
      SELECT id FROM public.patients 
      WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Edição e Deleção de Pesos" ON public.weight_measurements;
CREATE POLICY "Edição e Deleção de Pesos" ON public.weight_measurements
  FOR ALL
  USING (
    patient_id::uuid IN (
      SELECT id FROM public.patients 
      WHERE user_id = (select auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('Admin', 'Staff')
    )
  );

DROP POLICY IF EXISTS "Inserção de Pesos" ON public.weight_measurements;
CREATE POLICY "Inserção de Pesos" ON public.weight_measurements
  FOR INSERT
  WITH CHECK (
    patient_id::uuid IN (
      SELECT id FROM public.patients 
      WHERE user_id = (select auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('Admin', 'Staff')
    )
  );

DROP POLICY IF EXISTS "Leitura de Pesos" ON public.weight_measurements;
CREATE POLICY "Leitura de Pesos" ON public.weight_measurements
  FOR SELECT
  USING (
    patient_id::uuid IN (
      SELECT id FROM public.patients 
      WHERE user_id = (select auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('Admin', 'Staff')
    )
  );

DROP POLICY IF EXISTS "Permitir leitura para Staff e Admin" ON public.weight_measurements;
DROP POLICY IF EXISTS "Permitir inserção para Staff e Admin" ON public.weight_measurements;
DROP POLICY IF EXISTS "Permitir atualização para Staff e Admin" ON public.weight_measurements;
DROP POLICY IF EXISTS "Permitir exclusão para Staff e Admin" ON public.weight_measurements;
