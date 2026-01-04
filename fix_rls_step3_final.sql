-- ============================================================================
-- FIX: Auth RLS Performance - STEP 3 FINAL: REMAINING TABLES
-- ============================================================================
-- Otimiza todas as outras tabelas: medications, upcoming_doses, injections,
-- financial_records, medication_steps, step_payments, clinic_tags, 
-- weight_measurements
-- ============================================================================

-- ============================================================================
-- MEDICATIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "medications_policy" ON public.medications;
CREATE POLICY "medications_policy" ON public.medications
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('Admin', 'Staff')
    )
  );

-- ============================================================================
-- UPCOMING_DOSES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Admin vê toda agenda" ON public.upcoming_doses;
CREATE POLICY "Admin vê toda agenda" ON public.upcoming_doses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('Admin', 'Staff')
    )
  );

DROP POLICY IF EXISTS "Paciente vê sua agenda" ON public.upcoming_doses;
CREATE POLICY "Paciente vê sua agenda" ON public.upcoming_doses
  FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM public.patients 
      WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "upcoming_doses_policy" ON public.upcoming_doses;
CREATE POLICY "upcoming_doses_policy" ON public.upcoming_doses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('Admin', 'Staff')
    )
  );

-- ============================================================================
-- INJECTIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Admins veem todas injeções" ON public.injections;
CREATE POLICY "Admins veem todas injeções" ON public.injections
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('Admin', 'Staff')
    )
  );

DROP POLICY IF EXISTS "Paciente vê suas injeções" ON public.injections;
CREATE POLICY "Paciente vê suas injeções" ON public.injections
  FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM public.patients 
      WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "injections_policy" ON public.injections;
CREATE POLICY "injections_policy" ON public.injections
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('Admin', 'Staff')
    )
  );

-- Remover duplicadas
DROP POLICY IF EXISTS "Permitir leitura para Staff e Admin" ON public.injections;
DROP POLICY IF EXISTS "Permitir inserção para Staff e Admin" ON public.injections;
DROP POLICY IF EXISTS "Permitir atualização para Staff e Admin" ON public.injections;
DROP POLICY IF EXISTS "Permitir exclusão para Staff e Admin" ON public.injections;

-- ============================================================================
-- FINANCIAL_RECORDS TABLE
-- ============================================================================

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

-- ============================================================================
-- MEDICATION_STEPS TABLE
-- ============================================================================

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

-- Remover duplicadas
DROP POLICY IF EXISTS "Permitir leitura para Staff e Admin" ON public.medication_steps;
DROP POLICY IF EXISTS "Permitir inserção para Staff e Admin" ON public.medication_steps;
DROP POLICY IF EXISTS "Permitir atualização para Staff e Admin" ON public.medication_steps;
DROP POLICY IF EXISTS "Permitir exclusão para Staff e Admin" ON public.medication_steps;

-- ============================================================================
-- STEP_PAYMENTS TABLE
-- ============================================================================

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

-- ============================================================================
-- CLINIC_TAGS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clinic_tags;
CREATE POLICY "Enable all for authenticated users" ON public.clinic_tags
  FOR ALL
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Acesso total a tags" ON public.clinic_tags;
DROP POLICY IF EXISTS "Leitura de tags para Staff e Admin" ON public.clinic_tags;

-- ============================================================================
-- WEIGHT_MEASUREMENTS TABLE
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
    patient_id IN (
      SELECT id FROM public.patients 
      WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Edição e Deleção de Pesos" ON public.weight_measurements;
CREATE POLICY "Edição e Deleção de Pesos" ON public.weight_measurements
  FOR ALL
  USING (
    patient_id IN (
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
    patient_id IN (
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
    patient_id IN (
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

-- Remover duplicadas
DROP POLICY IF EXISTS "Permitir leitura para Staff e Admin" ON public.weight_measurements;
DROP POLICY IF EXISTS "Permitir inserção para Staff e Admin" ON public.weight_measurements;
DROP POLICY IF EXISTS "Permitir atualização para Staff e Admin" ON public.weight_measurements;
DROP POLICY IF EXISTS "Permitir exclusão para Staff e Admin" ON public.weight_measurements;

-- ============================================================================
-- CONCLUÍDO! ✅
-- ============================================================================
-- Todas as tabelas restantes foram otimizadas!
-- 
-- RESUMO:
-- ✅ STEP 1: profiles (9 policies)
-- ✅ STEP 2: patients (10 policies)  
-- ✅ STEP 3: 8 tabelas restantes (18 policies)
-- 
-- TOTAL: 37 policies otimizadas em 10 tabelas!
-- ============================================================================
