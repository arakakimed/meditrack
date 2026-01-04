-- ============================================================================
-- FIX: Auth RLS Performance - STEP 3A: MEDICATIONS + DOSES + INJECTIONS
-- ============================================================================

-- MEDICATIONS TABLE
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

-- UPCOMING_DOSES TABLE
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

-- INJECTIONS TABLE
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

DROP POLICY IF EXISTS "Permitir leitura para Staff e Admin" ON public.injections;
DROP POLICY IF EXISTS "Permitir inserção para Staff e Admin" ON public.injections;
DROP POLICY IF EXISTS "Permitir atualização para Staff e Admin" ON public.injections;
DROP POLICY IF EXISTS "Permitir exclusão para Staff e Admin" ON public.injections;
