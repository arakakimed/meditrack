-- ============================================================================
-- FIX: Auth RLS Performance - STEP 2: PATIENTS TABLE
-- ============================================================================
-- Se este funcionar, vamos para STEP 3 (demais tabelas)
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

-- Remover políticas duplicadas e problemáticas
DROP POLICY IF EXISTS "Enable read access for own email" ON public.patients;
DROP POLICY IF EXISTS "Staff e Admin veem todos pacientes" ON public.patients;
DROP POLICY IF EXISTS "Allow select for authenticated patients" ON public.patients;

-- ============================================================================
-- TESTE: Execute SELECT para confirmar
-- ============================================================================
-- SELECT * FROM public.patients LIMIT 1;
