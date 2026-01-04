-- ============================================================================
-- FIX: Auth RLS Initialization Plan - Performance Optimization (SAFE VERSION)
-- ============================================================================
-- PROBLEMA: Políticas RLS estão reavaliando auth.uid() para CADA LINHA.
-- SOLUÇÃO: Substituir auth.uid() por (select auth.uid())
-- ============================================================================

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT
  USING (
    (select auth.uid()) = id
    OR
    get_user_role((select auth.uid())) IN ('admin', 'staff')
  );

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE
  USING (
    (select auth.uid()) = id
    OR
    get_user_role((select auth.uid())) = 'admin'
  );

DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
CREATE POLICY "profiles_delete_policy" ON public.profiles
  FOR DELETE
  USING (get_user_role((select auth.uid())) = 'admin');

-- Remover duplicadas
DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios podem ver seu proprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuário edita próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users triggers" ON public.profiles;

-- ============================================================================
-- PATIENTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Admin vê todos pacientes" ON public.patients;
CREATE POLICY "Admin vê todos pacientes" ON public.patients
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'Admin'
    )
  );

DROP POLICY IF EXISTS "Admins podem atualizar pacientes" ON public.patients;
CREATE POLICY "Admins podem atualizar pacientes" ON public.patients
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'Admin'
    )
  );

DROP POLICY IF EXISTS "Admins podem deletar pacientes" ON public.patients;
CREATE POLICY "Admins podem deletar pacientes" ON public.patients
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'Admin'
    )
  );

DROP POLICY IF EXISTS "Admins veem todos pacientes" ON public.patients;
CREATE POLICY "Admins veem todos pacientes" ON public.patients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('Admin', 'Staff')
    )
  );

DROP POLICY IF EXISTS "Allow full access for Staff and Admin patients" ON public.patients;
CREATE POLICY "Allow full access for Staff and Admin patients" ON public.patients
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('Admin', 'Staff')
    )
  );

-- Removida policy problemática "Enable read access for own email"
DROP POLICY IF EXISTS "Enable read access for own email" ON public.patients;

DROP POLICY IF EXISTS "Paciente vê seu próprio registro" ON public.patients;
CREATE POLICY "Paciente vê seu próprio registro" ON public.patients
  FOR SELECT
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Pacientes podem inserir seu próprio registro" ON public.patients;
CREATE POLICY "Pacientes podem inserir seu próprio registro" ON public.patients
  FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Pacientes podem ver apenas seus dados aprovados" ON public.patients;
CREATE POLICY "Pacientes podem ver apenas seus dados aprovados" ON public.patients
  FOR SELECT
  USING (
    (user_id = (select auth.uid()) AND access_granted = true)
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'Admin'
    )
  );

DROP POLICY IF EXISTS "Users can manage their own patients" ON public.patients;
CREATE POLICY "Users can manage their own patients" ON public.patients
  FOR ALL
  USING (user_id = (select auth.uid()));

-- Remover duplicadas
DROP POLICY IF EXISTS "Staff e Admin veem todos pacientes" ON public.patients;
DROP POLICY IF EXISTS "Allow select for authenticated patients" ON public.patients;

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
-- CLINIC_TAGS TABLE (REMOVIDA POLICY PROBLEMÁTICA)
-- ============================================================================

-- Removida: auth.role() não existe, usar check simples
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clinic_tags;
CREATE POLICY "Enable all for authenticated users" ON public.clinic_tags
  FOR ALL
  TO authenticated
  USING (true);

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
-- Todas as policies foram otimizadas removendo reavaliações desnecessárias
-- de auth.uid() e removendo policies problemáticas com type mismatch.
-- ============================================================================
